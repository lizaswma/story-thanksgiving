import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import { DEFAULT_LANGUAGE } from "../i18n";
import type { Language } from "../types";
import { LAST_PAGE_INDEX } from "../book";
import { usePersistentState } from "../hooks/usePersistentState";
import { setMuted as applyMuted } from "../audio/sound";

type BookState = {
  language: Language;
  setLanguage: (l: Language) => void;
  toggleLanguage: () => void;

  /** 0 = title card, 1..12 = story pages (PRD §5). */
  pageIndex: number;
  goNext: () => void;
  goPrev: () => void;
  goToPage: (i: number) => void;
  restart: () => void;

  muted: boolean;
  setMuted: (m: boolean) => void;

  /** Show the on-page sentence (for the parent). Default on; narration still plays when off. */
  showText: boolean;
  setShowText: (s: boolean) => void;
};

const Ctx = createContext<BookState | null>(null);

const asString = (raw: string) => raw as Language;

export function BookProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageRaw] = usePersistentState<Language>(
    "lr.language",
    DEFAULT_LANGUAGE,
    asString,
    (v) => v,
  );
  const [muted, setMutedRaw] = usePersistentState<boolean>("lr.muted", false);
  const [showText, setShowTextRaw] = usePersistentState<boolean>(
    "lr.showText",
    true,
  );
  const [pageIndex, setPageIndex] = usePersistentState<number>("lr.page", 0);

  // Keep the audio engine in sync with persisted mute state.
  useEffect(() => {
    applyMuted(muted);
  }, [muted]);

  const goToPage = useCallback(
    (i: number) => setPageIndex(Math.max(0, Math.min(LAST_PAGE_INDEX, i))),
    [setPageIndex],
  );
  const goNext = useCallback(
    () => setPageIndex((p) => Math.min(LAST_PAGE_INDEX, p + 1)),
    [setPageIndex],
  );
  const goPrev = useCallback(
    () => setPageIndex((p) => Math.max(0, p - 1)),
    [setPageIndex],
  );
  const restart = useCallback(() => setPageIndex(0), [setPageIndex]);

  const setLanguage = useCallback(
    (l: Language) => setLanguageRaw(l),
    [setLanguageRaw],
  );
  const toggleLanguage = useCallback(
    () => setLanguageRaw((l) => (l === "zh" ? "en" : "zh")),
    [setLanguageRaw],
  );

  const value = useMemo<BookState>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      pageIndex,
      goNext,
      goPrev,
      goToPage,
      restart,
      muted,
      setMuted: setMutedRaw,
      showText,
      setShowText: setShowTextRaw,
    }),
    [
      language,
      setLanguage,
      toggleLanguage,
      pageIndex,
      goNext,
      goPrev,
      goToPage,
      restart,
      muted,
      setMutedRaw,
      showText,
      setShowTextRaw,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBook(): BookState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBook must be used within <BookProvider>");
  return ctx;
}
