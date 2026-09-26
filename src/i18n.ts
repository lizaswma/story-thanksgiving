import type { Language, LocalizedText } from "./types";

export const LANGUAGES: Language[] = ["zh", "en"];
// PRD §4.1: the product default is "zh".
export const DEFAULT_LANGUAGE: Language = "zh";

/** Spoken number words for the counting page (PRD §5, page 11). */
export const NUMBER_WORDS: Record<Language, string[]> = {
  zh: ["一", "二", "三", "四", "五", "六"],
  en: ["one", "two", "three", "four", "five", "six"],
};

/** Static UI strings (parent menu, hints). Story text lives in book.ts. */
export const UI: Record<string, LocalizedText> = {
  languageLabel: { zh: "语言", en: "Language" },
  sound: { zh: "声音", en: "Sound" },
  soundOn: { zh: "开", en: "On" },
  soundOff: { zh: "关", en: "Off" },
  sentenceText: { zh: "文字", en: "Sentence text" },
  restart: { zh: "从头开始", en: "Start over" },
  parentMenu: { zh: "家长菜单", en: "Parent menu" },
  close: { zh: "关闭", en: "Close" },
  rotateHint: {
    zh: "把平板横过来看故事吧",
    en: "Turn the tablet sideways to read",
  },
  replay: { zh: "再听一次", en: "Play again" },
};

export function t(text: LocalizedText, lang: Language): string {
  return text[lang];
}

export function otherLanguage(lang: Language): Language {
  return lang === "zh" ? "en" : "zh";
}
