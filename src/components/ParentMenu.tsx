import { useState } from "react";
import { useBook } from "../context/BookContext";
import { t, UI } from "../i18n";

/** Gear menu in the top corner: language, sound, restart (PRD §7.3). */
export function ParentMenu() {
  const { language, setLanguage, muted, setMuted, showText, setShowText, restart } =
    useBook();
  const [open, setOpen] = useState(false);

  return (
    <div className="parent-menu">
      <button
        type="button"
        className="gear"
        onClick={() => setOpen((o) => !o)}
        aria-label={t(UI.parentMenu, language)}
        aria-expanded={open}
      >
        ⚙
      </button>

      {open && (
        <>
          <div className="menu-scrim" onClick={() => setOpen(false)} />
          <div className="menu-panel" role="menu">
            <div className="menu-row">
              <span>{t(UI.languageLabel, language)}</span>
              <div className="segmented">
                <button
                  type="button"
                  className={language === "zh" ? "on" : ""}
                  onClick={() => setLanguage("zh")}
                >
                  中文
                </button>
                <button
                  type="button"
                  className={language === "en" ? "on" : ""}
                  onClick={() => setLanguage("en")}
                >
                  English
                </button>
              </div>
            </div>

            <div className="menu-row">
              <span>{t(UI.sound, language)}</span>
              <button
                type="button"
                className="segmented single"
                onClick={() => setMuted(!muted)}
              >
                {muted ? t(UI.soundOff, language) : t(UI.soundOn, language)}
              </button>
            </div>

            <div className="menu-row">
              <span>{t(UI.sentenceText, language)}</span>
              <button
                type="button"
                className="segmented single"
                onClick={() => setShowText(!showText)}
              >
                {showText ? t(UI.soundOn, language) : t(UI.soundOff, language)}
              </button>
            </div>

            <button
              type="button"
              className="menu-action"
              onClick={() => {
                restart();
                setOpen(false);
              }}
            >
              {t(UI.restart, language)}
            </button>

            <button
              type="button"
              className="menu-close"
              onClick={() => setOpen(false)}
            >
              {t(UI.close, language)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
