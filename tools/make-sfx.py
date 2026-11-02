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
# Per-sound RMS multipliers; anything not listed is 1.0.
BOOST = {}
MAX_DUR = 1.5  # seconds — the public/sfx/README.md bar

SEED = 1015  # carried over from book 2, so the shared sounds stay byte-identical
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
def s_wind_chime():
    """p1, window-leaves extras: a soft two-note glockenspiel 'ting-ting', rising."""
    y = silence(1.3)
    y = place(y, bell(note("G5"), 1.1, 0.30), 0.0)
    y = place(y, bell(note("D6"), 1.1, 0.34) * 0.85, 0.13)
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


def s_creak():
    """A slow, warm wooden creak (never a horror-movie one)."""
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
    """p12 candle: a gentle upward 'fwoosh' with a warm glint."""
    dur = 0.7
    n = noise(dur)
    sweep = np.linspace(350, 2600, len(n)) ** 1.0
    y = svf_bandpass(n, sweep, q=1.2)
    y = y / np.max(np.abs(y)) * env_swell(len(n), 0.22, 0.4)
    y = place(y, bell(note("A6"), 0.5, 0.12) * 0.22, 0.32)
    return y


def s_purr():
    """A low, rolling purr — soft pulses at ~24 Hz through a throaty filter."""
    dur = 1.3
    t = t_axis(dur)
    rate = 24 + 3 * np.sin(2 * np.pi * 0.9 * t)
    phase = np.cumsum(rate) / SR
    pulse = np.exp(-((phase % 1.0) * 9.0)) * (1 + 0.15 * rng.standard_normal(len(t)))
    y = fft_filter(pulse, 60, 420, soft=0.8)
    y += fft_filter(noise(dur), 100, 700) * 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t))
    return y * env_swell(len(t), 0.3, 0.55)


def s_magic():
    """p10 golden leaf: a dreamy ascending twinkle that hangs in the air."""
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
    """p13 bedtime: four soft music-box notes drifting down — a little goodnight sting."""
    y = silence(1.5)
    for i, (n, g) in enumerate((("G5", 1.0), ("E5", 0.9), ("D5", 0.85), ("C5", 0.8))):
        y = place(y, music_box(note(n), 0.9, 0.34) * g, i * 0.24)
    return y


def s_whump():
    """p2 rug, p13 blanket: a soft, low 'fwump' of settling in."""
    dur = 0.4
    t = t_axis(dur)
    body = np.sin(2 * np.pi * (48 + 60 * np.exp(-t * 22)) * t) * np.exp(-t * 11)
    cloth = fft_filter(noise(dur), 80, 700) * np.exp(-t * 20) * 0.5
    return body + cloth


def s_jingle():
    """p1 wreath: a few tiny shaken bells."""
    y = silence(0.8)
    for i, n in enumerate(("E6", "G6", "E6", "A6", "G6")):
        y = place(y, bell(note(n), 0.5, 0.12) * rng.uniform(0.6, 1.0), i * 0.085)
    return y


def s_leaf_boop():
    """p3-6, p9: the leaf lands on the tree — a soft rising 'boop'."""
    y = glide(note("C5"), note("G5"), 0.2, harmonics=(1.0, 0.25), curve=0.6)
    return y * env_ad(len(y), 0.006, 0.09)


def s_leaf_purr():
    """p8: the same boop, then 小猫's purr."""
    y = place(silence(1.3), s_leaf_boop(), 0.0)
    return place(y, s_purr() * 0.8, 0.14)


def s_bike_bell():
    """p4 extra: ring-ring."""
    y = silence(0.7)
    partials = [(1.0, 1.0), (1.5, 0.45), (2.76, 0.2)]
    y = place(y, bell(note("A6"), 0.4, 0.12, partials=partials), 0.0)
    return place(y, bell(note("A6"), 0.5, 0.15, partials=partials), 0.17)


def s_hiss():
    """p5, p8 extras: steam — a soft, airy puff."""
    y = fft_filter(noise(0.8), 2500, 9000, soft=0.8)
    return y * env_swell(len(y), 0.12, 0.5)


def s_trickle():
    """p6 extra: water from the can — a run of tiny rising droplets."""
    y = silence(1.0)
    for at in np.sort(rng.uniform(0.0, 0.8, 14)):
        f = rng.uniform(900, 1900)
        d = glide(f, f * 1.5, 0.06) * env_swell(int(0.06 * SR), 0.01, 0.04)
        y = place(y, d * rng.uniform(0.4, 1.0), at)
    return y


def s_doorbell():
    """p7: ding-dong, with the door's warm creak under the end."""
    partials = [(1.0, 1.0), (2.0, 0.25)]
    y = silence(1.5)
    y = place(y, bell(note("E5"), 0.9, 0.3, partials=partials), 0.0)
    y = place(y, bell(note("C5"), 1.0, 0.34, partials=partials), 0.34)
    return place(y, s_creak()[: int(0.8 * SR)] * 0.18, 0.68)


def s_boing():
    """p9 extra: the park ball — a soft rubbery bounce."""
    y = glide(180, 430, 0.26, harmonics=(1.0, 0.3), curve=0.5)
    return y * env_ad(len(y), 0.004, 0.1)


def s_count_blip():
    """p11: one gentle tick per counted leaf."""
    return music_box(note("A5"), 0.3, 0.12)


def s_clink():
    """p12: two glasses touching."""
    partials = [(1.0, 1.0), (2.4, 0.4), (4.1, 0.2)]
    y = silence(0.6)
    y = place(y, bell(note("E7"), 0.4, 0.1, partials=partials), 0.0)
    return place(y, bell(note("B6"), 0.45, 0.12, partials=partials) * 0.8, 0.11)


SOUNDS = {
    "wind-chime": s_wind_chime,
    "jingle": s_jingle,
    "rustle": s_rustle,
    "whump": s_whump,
    "leaf-boop": s_leaf_boop,
    "leaf-purr": s_leaf_purr,
    "bike-bell": s_bike_bell,
    "hiss": s_hiss,
    "trickle": s_trickle,
    "doorbell": s_doorbell,
    "boing": s_boing,
    "magic": s_magic,
    "count-blip": s_count_blip,
    "clink": s_clink,
    "flare": s_flare,
    "lullaby": s_lullaby,
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
