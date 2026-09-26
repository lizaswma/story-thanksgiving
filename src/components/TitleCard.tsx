import { useEffect } from "react";
import { TITLE_CARD } from "../book";
import { useBook } from "../context/BookContext";
import { t } from "../i18n";
import { playNarration, stopNarration, unlockAudio } from "../audio/sound";
import { Layer } from "./Layer";

/** Prominent series-branded opening card (PRD §7.4). Page id 0 for narration. */
export function TitleCard() {
  const { language, goNext } = useBook();

  useEffect(() => {
    playNarration(0, language);
    return () => stopNarration();
  }, [language]);

  function start() {
    unlockAudio();
    goNext();
  }

  return (
    <div className="page title-card">
      <Layer asset={TITLE_CARD.background} className="background" />
      {TITLE_CARD.layers.map((l) => (
        <Layer key={l.id} asset={l} />
      ))}

      <div className="title-content">
        <p className="series">{t(TITLE_CARD.series, language)}</p>
        <h1 className="title">{t(TITLE_CARD.title, language)}</h1>
        <button type="button" className="start-button" onClick={start}>
          {t(TITLE_CARD.start, language)}
        </button>
      </div>
    </div>
  );
}
