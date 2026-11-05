#!/usr/bin/env node
/**
 * 小兔 narration + counting audio via the Gemini TTS API.
 * No dependencies beyond Node 18+ (global fetch) and the system `ffmpeg`
 * binary (used only to wrap the raw PCM Gemini returns into an .mp3).
 *
 * Ported from story-halloween/tools/generate-audio.mjs (same pipeline, same
 * manifest shape) — see that file's history for the model/retry tuning.
 *
 * Setup:
 *   Provide the key WITHOUT pasting it into chat. Either:
 *     export GEMINI_API_KEY=xxxx           (shell)
 *   or create  story-thanksgiving/.env  containing:
 *     GEMINI_API_KEY=xxxx                  (.env is gitignored)
 *   Falls back to ../little-rabbit-style/.env (same GCP project/billing) if
 *   neither of the above is set, so you don't need a second key.
 *
 * Usage:
 *   node tools/generate-audio.mjs --list-models     # confirm the TTS model id + check the key
 *   node tools/generate-audio.mjs --dry-run          # print every job + voice, spend nothing
 *   node tools/generate-audio.mjs                    # generate everything in audio-manifest.json
 *   node tools/generate-audio.mjs 05 07 count-1       # only these ids (zh + en both regenerated)
 *
 * Env overrides:
 *   GEMINI_MODEL   default "gemini-3.1-flash-tts-preview"
 *   VOICE_ZH       default "Sulafat"  (prebuilt Gemini voice name)
 *   VOICE_EN       default "Sulafat"
 *   OUT_DIR        default "public/audio" (script writes {lang}/NN.mp3 and {lang}/count/N.mp3 under it)
 */

import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

// ---- key ------------------------------------------------------------------
async function readKeyFrom(file) {
  if (!existsSync(file)) return null;
  const txt = await readFile(file, "utf8");
  const m = txt.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/m);
  return m ? m[1].replace(/^["']|["']$/g, "").trim() : null;
}

async function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const own = await readKeyFrom(join(ROOT, ".env"));
  if (own) return own;
  const shared = await readKeyFrom(resolve(ROOT, "../little-rabbit-style/.env"));
  if (shared) return shared;
  console.error(
    "No API key. Set GEMINI_API_KEY, or put it in story-thanksgiving/.env " +
      "(or ../little-rabbit-style/.env).",
  );
  process.exit(1);
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-tts-preview";
const VOICE = { zh: process.env.VOICE_ZH || "Sulafat", en: process.env.VOICE_EN || "Sulafat" };
const API = "https://generativelanguage.googleapis.com/v1beta";
const OUT_DIR = resolve(ROOT, process.env.OUT_DIR || "public/audio");

// Warm, gentle bedtime-story delivery — the instruction is spoken TO the
// model, not BY it (Gemini TTS only voices the text after the colon).
// NOTE: gemini-3.1-flash-tts-preview goes on a runaway ramble (~90s of
// invented speech instead of ~2s) when the instruction itself is written in
// Chinese — an English instruction asking for Mandarin delivery works fine
// and stays short, so both languages use an English-language instruction.
const STYLE_PREFIX = {
  zh: "Say the following gently and warmly in Mandarin, like a bedtime story for a toddler: ",
  en: "Say the following gently and warmly in English, like a bedtime story for a toddler: ",
};

// ---- helpers ----------------------------------------------------------------
async function listModels(key) {
  const r = await fetch(`${API}/models?key=${key}&pageSize=200`);
  const j = await r.json();
  if (!r.ok) { console.error(JSON.stringify(j, null, 2)); process.exit(1); }
  for (const m of j.models ?? []) {
    if (/tts/i.test(m.name) || /text-to-speech|audio/i.test(m.description ?? "")) {
      console.log(`${m.name}\n    ${m.displayName} — ${(m.supportedGenerationMethods ?? []).join(", ")}`);
    }
  }
}

async function pcmToMp3(pcmBase64, sampleRate, outFile) {
  const pcmFile = `${outFile}.pcm`;
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(pcmFile, Buffer.from(pcmBase64, "base64"));
  try {
    await run("ffmpeg", [
      "-y", "-loglevel", "error",
      "-f", "s16le", "-ar", String(sampleRate), "-ac", "1",
      "-i", pcmFile,
      "-codec:a", "libmp3lame", "-qscale:a", "3",
      outFile,
    ]);
  } finally {
    await unlink(pcmFile).catch(() => {});
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// This preview model has a tight per-minute quota — a back-to-back batch trips
// 429s (and occasional 503 "high demand"). Both are transient: retry with
// backoff rather than giving up on the clip.
async function speak(key, lang, text, outFile) {
  const body = {
    contents: [{ parts: [{ text: STYLE_PREFIX[lang] + text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE[lang] } },
      },
    },
  };

  let r, j;
  let delay = 5000;
  for (let attempt = 1; attempt <= 6; attempt++) {
    r = await fetch(`${API}/models/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    j = await r.json();
    if (r.ok) break;
    if ((r.status === 429 || r.status === 503) && attempt < 6) {
      console.log(`  ${outFile.replace(ROOT + "/", "")}: HTTP ${r.status}, retrying in ${delay / 1000}s… (${attempt}/6)`);
      await sleep(delay);
      delay = Math.min(delay * 1.6, 30000);
      continue;
    }
    break;
  }
  if (!r.ok) {
    console.log(`  FAILED ${outFile.replace(ROOT + "/", "")}: HTTP ${r.status}`);
    console.log(`    ${JSON.stringify(j).slice(0, 300)}`);
    return false;
  }
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) {
    console.log(`  FAILED ${outFile.replace(ROOT + "/", "")}: no audio in response`);
    return false;
  }
  const rateMatch = /rate=(\d+)/.exec(part.inlineData.mimeType || "");
  const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
  await pcmToMp3(part.inlineData.data, sampleRate, outFile);
  const usage = j.usageMetadata;
  console.log(
    `  saved ${outFile.replace(ROOT + "/", "")}` +
      (usage ? ` (${usage.totalTokenCount} tokens)` : ""),
  );
  return true;
}

// ---- main -------------------------------------------------------------------
const argv = process.argv.slice(2);
const key = await loadKey();

if (argv.includes("--list-models")) { await listModels(key); process.exit(0); }
const DRY = argv.includes("--dry-run");
const ids = argv.filter((a) => !a.startsWith("--"));

const manifest = JSON.parse(await readFile(join(HERE, "audio-manifest.json"), "utf8"));

const jobs = [];
for (const n of manifest.narration) {
  if (ids.length && !ids.includes(n.id)) continue;
  for (const lang of ["zh", "en"]) {
    jobs.push({ lang, text: n[lang], outFile: join(OUT_DIR, lang, `${n.id}.mp3`) });
  }
}
for (const c of manifest.count) {
  if (ids.length && !ids.includes(`count-${c.id}`)) continue;
  for (const lang of ["zh", "en"]) {
    jobs.push({ lang, text: c[lang], outFile: join(OUT_DIR, lang, "count", `${c.id}.mp3`) });
  }
}

console.log(
  `model ${MODEL} · voices zh=${VOICE.zh} en=${VOICE.en} · ${jobs.length} clip(s)\n`,
);
if (DRY) {
  for (const j of jobs) {
    console.log(`• [${j.lang}] ${j.outFile.replace(ROOT + "/", "")} ← "${j.text}"`);
  }
  console.log("\n(dry run — nothing submitted)");
  process.exit(0);
}

let ok = 0;
for (const j of jobs) {
  if (await speak(key, j.lang, j.text, j.outFile)) ok++;
  await sleep(1500); // stay under the preview model's per-minute quota
}
console.log(`\ndone — ${ok}/${jobs.length} clips saved to ${OUT_DIR.replace(ROOT + "/", "")}`);
