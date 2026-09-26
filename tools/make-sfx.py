#!/usr/bin/env python3
"""Synthesize the book's sound effects into public/sfx/*.mp3.

TTS (tools/generate-audio.mjs) covers narration but can't do sound design, so
these are built from scratch: additive bell/pluck tones, filtered noise, and a
few pitch sweeps. Everything is deterministic (fixed RNG seed) so re-running
gives byte-identical audio, and there's nothing to source or license.

The bar (public/sfx/README.md): short (< 1.5 s), soft, non-startling. Every clip
is levelled to the same modest average loudness (RMS) with a peak cap, so no tap
is louder than another and all sit below the narration.

Usage (from the repo root):  python3 tools/make-sfx.py [name ...]
Needs numpy and the system `ffmpeg` (mp3 encode only).
"""
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

OUT = Path(__file__).resolve().parent.parent / "public" / "sfx"
SR = 44100
PEAK = 0.35  # hard cap, ≈ -9 dBFS
RMS = 0.10  # target average level of the audible part, ≈ -20 dBFS
# Per-sound RMS multipliers; anything not listed is 1.0. The dragon dance is the
# book's showpiece, so it's allowed to be a little bigger (still peak-capped).
BOOST = {"drum": 1.3}
MAX_DUR = 1.5  # seconds — the public/sfx/README.md bar

SEED = 1015  # Mid-Autumn, 15th of the 8th lunar month
rng = np.random.default_rng(SEED)  # reseeded per sound in main(), see there


# ---- primitives -----------------------------------------------------------
def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def silence(dur):
    return np.zeros(int(dur * SR))


def place(track, clip, at):
    """Mix `clip` into `track` starting `at` seconds in (grows the track)."""
    i = int(at * SR)
    if i + len(clip) > len(track):
        track = np.pad(track, (0, i + len(clip) - len(track)))
    track[i : i + len(clip)] += clip
    return track


def env_ad(n, attack, decay_tau):
    """Linear attack, exponential decay — the shape of nearly every struck sound."""
    t = np.arange(n) / SR
    a = np.minimum(t / max(attack, 1e-4), 1.0)
    return a * np.exp(-t / decay_tau)


def env_swell(n, rise, fall):
    """Smooth rise then fall (raised-cosine), for breaths, whooshes, hums."""
    t = np.arange(n) / SR
    total = n / SR
    up = np.clip(t / rise, 0, 1)
    down = np.clip((total - t) / fall, 0, 1)
    return np.sin(up * np.pi / 2) ** 2 * np.sin(down * np.pi / 2) ** 2


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def fft_filter(x, lo=None, hi=None, soft=0.35):
    """Zero-phase band filter with a smooth (log-frequency raised-cosine) skirt."""
    n = len(x)
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    f = np.maximum(f, 1.0)
    if lo:
        r = np.clip(np.log2(f / lo) / soft * 0.5 + 0.5, 0, 1)
        g *= np.sin(r * np.pi / 2)
    if hi:
        r = np.clip(np.log2(hi / f) / soft * 0.5 + 0.5, 0, 1)
        g *= np.sin(r * np.pi / 2)
    return np.fft.irfft(spec * g, n)


def svf_bandpass(x, fc, q=4.0):
    """State-variable bandpass with a per-sample centre frequency (a sweep)."""
    fc = np.broadcast_to(fc, x.shape).astype(float)
    f1 = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR)
    q1 = 1.0 / q
    low = band = 0.0
    out = np.empty_like(x)
    for i, s in enumerate(x):
        low += f1[i] * band
        high = s - low - q1 * band
        band += f1[i] * high
        out[i] = band
    return out


def bell(freq, dur, tau=0.35, partials=None, attack=0.004):
    """Soft struck bell / glockenspiel: a few inharmonic partials, each fading faster."""
    partials = partials or [(1.0, 1.0), (2.76, 0.28), (5.4, 0.1)]
    t = t_axis(dur)
    y = np.zeros_like(t)
    for ratio, amp in partials:
        y += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t * ratio * 0.55 / tau)
    return y * env_ad(len(t), attack, tau * 2.2)


def music_box(freq, dur, tau=0.28):
    """Plucked tine: near-harmonic partials, bright at the strike, mellow after."""
    t = t_axis(dur)
    y = np.zeros_like(t)
    for k, amp in enumerate([1.0, 0.42, 0.18, 0.08], start=1):
        y += amp * np.sin(2 * np.pi * freq * k * t) * np.exp(-t * k / tau)
    return y * env_ad(len(t), 0.002, tau * 3)


def tone(freq, dur, harmonics=(1.0,), vib=0.0, vib_rate=5.5):
    t = t_axis(dur)
    ph = 2 * np.pi * freq * t
    if vib:
        ph = ph + vib * np.sin(2 * np.pi * vib_rate * t)
    return sum(a * np.sin((k + 1) * ph) for k, a in enumerate(harmonics))


def glide(f0, f1, dur, harmonics=(1.0,), curve=1.0):
    """Sine (with harmonics) whose pitch moves f0→f1 along t**curve."""
    t = t_axis(dur)
    u = (t / dur) ** curve
    freq = f0 + (f1 - f0) * u
    ph = 2 * np.pi * np.cumsum(freq) / SR
    return sum(a * np.sin((k + 1) * ph) for k, a in enumerate(harmonics))


def note(name):
    """'C5' → Hz (equal temperament, A4 = 440)."""
    steps = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    n = steps[name[0]] + 12 * (int(name[-1]) - 4)
    if len(name) == 3:
        n += 1 if name[1] == "#" else -1
    return 440.0 * 2 ** (n / 12)


# ---- the sounds -----------------------------------------------------------
def s_chime():
    """p1 (+ moon extras): a soft two-note glockenspiel 'ting-ting', rising."""
    y = silence(1.3)
    y = place(y, bell(note("G5"), 1.1, 0.30), 0.0)
    y = place(y, bell(note("D6"), 1.1, 0.34) * 0.85, 0.13)
    return y


def s_hush():
    """p1 extra: a breath of night air — a slow band-limited noise swell."""
    n = noise(1.0)
    y = fft_filter(n, 500, 2600, soft=1.0)
    y *= env_swell(len(y), 0.35, 0.5)
    # a faint, distant cricket pair so it reads as 'night', not just wind
    for at in (0.3, 0.42):
        blip = tone(4300, 0.05) * env_swell(int(0.05 * SR), 0.01, 0.03)
        y = place(y, blip * 0.05, at)
    return y


def s_rustle():
    """Paper / leaves / scraps: a scatter of tiny high-passed noise crackles."""
    y = silence(0.8)
    for at in np.sort(rng.uniform(0.0, 0.55, 15)):
        d = rng.uniform(0.02, 0.07)
        burst = fft_filter(noise(d), 1800, 7000, soft=0.6)
        burst *= env_ad(len(burst), 0.003, d / 3) * rng.uniform(0.25, 1.0)
        y = place(y, burst, at)
    return y * env_swell(len(y), 0.05, 0.25)


def s_tap():
    """p2 stool: two soft wooden knocks."""
    def knock(f):
        t = t_axis(0.16)
        body = np.sin(2 * np.pi * (f + 60 * np.exp(-t * 60)) * t) * np.exp(-t * 28)
        click = fft_filter(noise(0.16), 900, 3500) * np.exp(-t * 90) * 0.35
        return body + click

    y = silence(0.4)
    y = place(y, knock(230), 0.0)
    y = place(y, knock(200) * 0.75, 0.16)
    return y


def s_sparkle():
    """p3 lantern lights: a quick upward shimmer of tiny high pings."""
    y = silence(1.2)
    scale = [note(n) for n in ("C6", "D6", "E6", "G6", "A6", "C7", "D7", "E7")]
    for i, at in enumerate(np.linspace(0.0, 0.5, 12)):
        f = scale[min(int(i * len(scale) / 12 + rng.integers(0, 2)), len(scale) - 1)]
        d = 0.35
        t = t_axis(d)
        ping = np.sin(2 * np.pi * f * t) * np.exp(-t * 11) * env_ad(len(t), 0.002, 1.0)
        y = place(y, ping * rng.uniform(0.4, 0.9), at)
    return y


def s_slice():
    """p4 cut: a quick blade swish, then a small two-note 'ta-da'."""
    n = noise(0.16)
    swish = svf_bandpass(n, np.linspace(1200, 5200, len(n)), q=1.6) * env_swell(len(n), 0.05, 0.09)
    swish = swish / np.max(np.abs(swish)) * 0.9
    y = silence(1.2)
    y = place(y, swish, 0.0)
    y = place(y, bell(note("G5"), 0.9, 0.22) * 0.7, 0.24)
    y = place(y, bell(note("C6"), 0.9, 0.3) * 0.8, 0.36)
    return y


def s_whistle():
    """p4 teapot: a small, soft kettle whistle that rises and wavers."""
    dur = 0.9
    t = t_axis(dur)
    f = 1350 + 260 * np.clip(t / 0.25, 0, 1) + 22 * np.sin(2 * np.pi * 7 * t)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR)
    breath = fft_filter(noise(dur), 2500, 6500) * 0.25
    return (y + breath) * env_swell(len(t), 0.12, 0.35)


def s_drum():
    """p5 dragon dance: the traditional lion/dragon-dance figure.

    咚 咚 咚 锵 · 咚 锵 咚 锵 — three drum hits, a cymbal clash, then drum/clash
    twice, on eight even beats. The drum leads (so the tap gets an instant hit)
    and the last clash rings out as the 900 ms dance winds down.
    """
    def dong(f, dur=0.3, punch=1.0):
        t = t_axis(dur)
        body = np.sin(2 * np.pi * (f + f * 1.1 * np.exp(-t * 30)) * t) * np.exp(-t * 12)
        skin = fft_filter(noise(dur), 180, 2200) * np.exp(-t * 38) * 0.3
        return (body + skin) * punch

    def qiang(dur, tau, gain=1.0):
        """Cymbal clash: noise plus inharmonic metal partials, sharp strike."""
        t = t_axis(dur)
        y = fft_filter(noise(dur), 3000, 12000, soft=0.5)
        for f, a in ((3110, 0.5), (4370, 0.4), (5230, 0.3), (6980, 0.25), (8410, 0.15)):
            y += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * 0.6
        return y * env_ad(len(t), 0.002, tau) * gain

    beat = 0.15
    # (beat index, kind, drum pitch / cymbal ring)
    figure = [
        (0, "dong", 92), (1, "dong", 100), (2, "dong", 92), (3, "qiang", 0.07),
        (4, "dong", 100), (5, "qiang", 0.07), (6, "dong", 92), (7, "qiang", 0.22),
    ]
    y = silence(1.6)
    for i, kind, arg in figure:
        at = i * beat
        if kind == "dong":
            y = place(y, dong(arg, punch=1.15 if i == 0 else 1.0), at)
        else:
            y = place(y, qiang(0.6, arg, 0.9), at)
            y = place(y, dong(72, dur=0.2, punch=0.5), at)  # the low thud under a clash
    return y


def s_hum():
    """p6-8 giving: a warm, happy two-note 'mm-hm'."""
    def mm(f, dur):
        y = tone(f, dur, harmonics=(1.0, 0.45, 0.2, 0.08), vib=0.012, vib_rate=5.5)
        return fft_filter(y, None, 1600, soft=0.6) * env_swell(len(y), 0.06, 0.12)

    y = silence(0.75)
    y = place(y, mm(note("G4"), 0.3), 0.0)
    y = place(y, mm(note("C5"), 0.42) * 0.95, 0.27)
    return y


def s_creak():
    """p7 chair / p9 door: a slow, warm wooden creak (never a horror-movie one)."""
    dur = 1.1
    t = t_axis(dur)
    f = 118 + 46 * np.sin(np.pi * t / dur) + 9 * np.sin(2 * np.pi * 5.5 * t)
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1.0) - 1.0
    stutter = 0.65 + 0.35 * np.sin(2 * np.pi * (22 + 8 * t) * t + 0.6 * np.sin(2 * np.pi * 3.3 * t))
    y = fft_filter(saw * stutter, 90, 950, soft=0.7)
    y += fft_filter(noise(dur), 400, 1600) * 0.06
    return y * env_swell(len(t), 0.18, 0.4)


def s_flare():
    """p7 lantern / p10 candle: a gentle upward 'fwoosh' with a warm glint."""
    dur = 0.7
    n = noise(dur)
    sweep = np.linspace(350, 2600, len(n)) ** 1.0
    y = svf_bandpass(n, sweep, q=1.2)
    y = y / np.max(np.abs(y)) * env_swell(len(n), 0.22, 0.4)
    y = place(y, bell(note("A6"), 0.5, 0.12) * 0.22, 0.32)
    return y


def s_purr():
    """p8 cat: a low, rolling purr — soft pulses at ~24 Hz through a throaty filter."""
    dur = 1.3
    t = t_axis(dur)
    rate = 24 + 3 * np.sin(2 * np.pi * 0.9 * t)
    phase = np.cumsum(rate) / SR
    pulse = np.exp(-((phase % 1.0) * 9.0)) * (1 + 0.15 * rng.standard_normal(len(t)))
    y = fft_filter(pulse, 60, 420, soft=0.8)
    y += fft_filter(noise(dur), 100, 700) * 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t))
    return y * env_swell(len(t), 0.3, 0.55)


def s_squeak():
    """p8 toy: a squeaky-toy 'ee-eek' — two quick rising chirps."""
    def chirp(f0, f1, d):
        y = glide(f0, f1, d, harmonics=(1.0, 0.3, 0.1))
        return y * env_swell(len(y), 0.02, 0.06)

    y = silence(0.4)
    y = place(y, chirp(1100, 1900, 0.13), 0.0)
    y = place(y, chirp(1300, 2300, 0.16) * 0.9, 0.15)
    return y


def s_warm_chime():
    """p10 reunion: a low, round three-note chord rolled upward, like a family gathering."""
    y = silence(1.5)
    for i, n in enumerate(("C5", "E5", "G5")):
        y = place(y, bell(note(n), 1.4, 0.55, partials=[(1.0, 1.0), (2.0, 0.3), (3.0, 0.1)]) * 0.9, i * 0.11)
    y = place(y, bell(note("C6"), 1.2, 0.5, partials=[(1.0, 1.0), (2.0, 0.2)]) * 0.5, 0.33)
    return y


def s_magic():
    """p11 Jade Rabbit: a dreamy ascending twinkle that hangs in the air."""
    y = silence(1.5)
    seq = ["E5", "G5", "A5", "C6", "D6", "E6", "G6"]
    for i, n in enumerate(seq):
        y = place(y, bell(note(n), 0.9, 0.3) * (0.55 + 0.06 * i), i * 0.1)
    # a soft shimmer bed
    t = t_axis(1.4)
    shimmer = (np.sin(2 * np.pi * note("E6") * t) + np.sin(2 * np.pi * (note("E6") + 2.5) * t)) * 0.12
    y = place(y, shimmer * env_swell(len(t), 0.4, 0.7), 0.1)
    return y


def s_lullaby():
    """p12 bedtime: four soft music-box notes drifting down — a little goodnight sting."""
    y = silence(1.5)
    for i, (n, g) in enumerate((("G5", 1.0), ("E5", 0.9), ("D5", 0.85), ("C5", 0.8))):
        y = place(y, music_box(note(n), 0.9, 0.34) * g, i * 0.24)
    return y


def s_whump():
    """p12 blanket: a soft, low 'fwump' of settling in."""
    dur = 0.4
    t = t_axis(dur)
    body = np.sin(2 * np.pi * (48 + 60 * np.exp(-t * 22)) * t) * np.exp(-t * 11)
    cloth = fft_filter(noise(dur), 80, 700) * np.exp(-t * 20) * 0.5
    return body + cloth


SOUNDS = {
    "chime": s_chime,
    "hush": s_hush,
    "rustle": s_rustle,
    "tap": s_tap,
    "sparkle": s_sparkle,
    "slice": s_slice,
    "whistle": s_whistle,
    "drum": s_drum,
    "hum": s_hum,
    "creak": s_creak,
    "flare": s_flare,
    "purr": s_purr,
    "squeak": s_squeak,
    "warm-chime": s_warm_chime,
    "magic": s_magic,
    "lullaby": s_lullaby,
    "whump": s_whump,
}


# ---- output ---------------------------------------------------------------
def finish(y, name=""):
    """Trim, level-match, and fade the edges so nothing clicks or runs long.

    Levelled on average loudness (RMS over the audible part), not peak: a held
    tone with the same peak as a bell is far louder to the ear. The peak cap
    keeps sharp transients (knocks, drum hits) from spiking.
    """
    y = y - np.mean(y)
    live = np.flatnonzero(np.abs(y) > 0.002 * np.max(np.abs(y)))
    y = y[live[0] : live[-1] + 1]
    if len(y) > MAX_DUR * SR:
        y = y[: int(MAX_DUR * SR)]
        tail = int(0.18 * SR)  # a longer fade where we cut a ringing tail short
    else:
        tail = int(0.03 * SR)
    audible = y[np.abs(y) > 0.05 * np.max(np.abs(y))]
    y = y * (RMS * BOOST.get(name, 1.0) / np.sqrt(np.mean(audible**2)))
    y = y * min(1.0, PEAK / np.max(np.abs(y)))
    fade = int(0.004 * SR)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-tail:] *= np.linspace(1, 0, tail)
    return y


def write_mp3(name, y):
    pcm = (np.clip(y, -1, 1) * 32767).astype("<i2")
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / f"{name}.wav"
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
             "-codec:a", "libmp3lame", "-b:a", "96k", str(OUT / f"{name}.mp3")],
            check=True,
        )


def main():
    names = sys.argv[1:] or list(SOUNDS)
    unknown = [n for n in names if n not in SOUNDS]
    if unknown:
        sys.exit(f"unknown sound(s): {', '.join(unknown)}  (have: {', '.join(SOUNDS)})")
    OUT.mkdir(parents=True, exist_ok=True)
    global rng
    for name in names:
        # Seed per sound (not once for the run) so a recipe's noise never depends
        # on which other sounds were generated before it.
        rng = np.random.default_rng([SEED, *name.encode()])
        y = finish(SOUNDS[name](), name)
        write_mp3(name, y)
        print(f"{name:11s} {len(y) / SR:4.2f}s")


if __name__ == "__main__":
    main()
