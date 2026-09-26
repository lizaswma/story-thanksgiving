import { useEffect } from "react";
import { useBook } from "./context/BookContext";
import { PAGES } from "./book";
import { t, UI } from "./i18n";
import { useSwipe } from "./hooks/useSwipe";
import { unlockAudio } from "./audio/sound";
import { TitleCard } from "./components/TitleCard";
import { PageView } from "./components/PageView";
import { NavArrows } from "./components/NavArrows";
import { ProgressDots } from "./components/ProgressDots";
import { ParentMenu } from "./components/ParentMenu";

export default function App() {
  const { pageIndex, goNext, goPrev, language } = useBook();
  const swipe = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev });

  // Keyboard nav for desktop dev (PRD: also runs in desktop browser).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const page = pageIndex > 0 ? PAGES[pageIndex - 1] : null;

  return (
    <div
      className="stage"
      onPointerDown={unlockAudio}
      {...swipe}
    >
      <div className="stage-inner">
        {page ? <PageView key={page.id} page={page} /> : <TitleCard />}

        <div className="top-controls">
          <ParentMenu />
        </div>

        <NavArrows />
        <ProgressDots />
      </div>

      <div className="rotate-hint">{t(UI.rotateHint, language)}</div>
    </div>
  );
}
