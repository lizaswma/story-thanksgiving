# Narration & counting audio

Per-page, per-language (PRD.md §4.3). The app plays these on page turn and on
tap-to-replay; missing files fail silently.

```
audio/zh/00.mp3 … 13.mp3     Mandarin narration (00 = title card)
audio/en/00.mp3 … 13.mp3     English narration
audio/zh/count/1.mp3 … 7.mp3 spoken "一…七" for the leaf count (pages 3-11)
audio/en/count/1.mp3 … 7.mp3 spoken "one…seven"
```

Generated with `tools/generate-audio.mjs` (Gemini TTS, ported from
`story-halloween`'s pipeline) from the lines in `tools/audio-manifest.json` —
which is a thin copy of `src/book.ts`'s `TITLE_CARD`/`PAGES[].text` +
`.secondaryText`, combined into one narration clip per page. Re-run the
script after any text change in `book.ts` (update the manifest first).

The scratch macOS-voice `zh` clips used while laying the story out
(`node tools/make-scratch-audio.mjs`) have been replaced by the Gemini voice.

Voice plan (PRD §4.3, §9): current voice is the Gemini prebuilt "Sulafat" for
both languages — plain-but-warm TTS, good enough to ship and playtest with.
Milestone M4 swaps in a more polished/expressive voice per language; this
folder layout stays fixed so that swap needs no code changes.
