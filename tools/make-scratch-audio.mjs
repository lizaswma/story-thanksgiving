#!/usr/bin/env node
/**
 * Free scratch narration for laying out the story: Mandarin clips from the macOS
 * `say` voice, same file layout as generate-audio.mjs, which replaces them with
 * the Gemini voice when the text is final. Needs macOS and `ffmpeg`.
 *
 * Usage (from the repo root):  node tools/make-scratch-audio.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../public/audio/zh");
const VOICE = "Tingting";
const RATE = "140"; // words per minute: slower than the default, for a toddler

function speak(text, file) {
  mkdirSync(dirname(file), { recursive: true });
  const aiff = `${file}.aiff`;
  execFileSync("say", ["-v", VOICE, "-r", RATE, "-o", aiff, text]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-codec:a", "libmp3lame", "-qscale:a", "4", file]);
  rmSync(aiff);
}

const manifest = JSON.parse(readFileSync(resolve(HERE, "audio-manifest.json"), "utf8"));
for (const n of manifest.narration) speak(n.zh, resolve(OUT, `${n.id}.mp3`));
for (const c of manifest.count) speak(c.zh, resolve(OUT, "count", `${c.id}.mp3`));
console.log(`wrote ${manifest.narration.length + manifest.count.length} clips to public/audio/zh`);
