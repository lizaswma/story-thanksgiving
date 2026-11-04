import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ExtraTap, Hotspot, Page } from "../types";
import { ART_EXT } from "../book";
import { useBook } from "../context/BookContext";
import { t } from "../i18n";
import {
  playCount,
  playNarration,
  playSfx,
  stopNarration,
} from "../audio/sound";
import { Layer } from "./Layer";
import { ThankfulTree } from "./ThankfulTree";

const pad = (n: number) => String(n).padStart(2, "0");

/** Feathered oval mask over a hotspot-shaped region (see ExtraTap.focus). */
function focusMask(f: Hotspot): CSSProperties {
  // Radii are 1.25x the half-extents so the oval still covers the rect's corners.
  const mask = `radial-gradient(ellipse ${(f.w / 2) * 1.25}% ${(f.h / 2) * 1.25}% at ${
    f.x + f.w / 2
  }% ${f.y + f.h / 2}%, #000 70%, transparent 100%)`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

/** One story page: background + stacked layers + one big tap target (PRD §6). */
export function PageView({ page }: { page: Page }) {
  const { language, showText } = useBook();
  const it = page.interaction;
  const extras = page.extras ?? [];

  const [opened, setOpened] = useState(false);
  const [glowing, setGlowing] = useState(false);
  const [twinkling, setTwinkling] = useState(false);
  const [thanked, setThanked] = useState(false);
  const [stuck, setStuck] = useState(0);
  // Easter eggs clear themselves on a timer so the element can be tapped
  // again right away.
  const [flashing, setFlashing] = useState<Record<string, boolean>>({});
  // Bumped on every tapExtra call so the spark below remounts (and its CSS
  // animation restarts) even when re-tapped before the previous hold has
  // expired — otherwise `flashing[x.flash]` is already `true`, the `hidden`
  // attribute never flips, and a quick second tap plays no animation at all.
  const [tapNonce, setTapNonce] = useState<Record<string, number>>({});
  // Same idea as tapNonce above, but for the main hotspot on kinds (`glow`,
  // `twinkle`) whose own effect is a slow ambient pulse layered on art that
  // may already read as "on" (page 3's lantern is drawn lit at rest) — so a
  // tap can register with nothing visible to prove it, especially with no
  // sfx yet. An instant spark on top gives an unmistakable "yes, that
  // worked" regardless of how subtle the ambient effect reads.
  const [mainTapNonce, setMainTapNonce] = useState(0);
  // The banner fades back after a few seconds so it stops covering the art; a
  // tap on it (or a page turn) brings it back. Parent-facing text only.
  const [bannerDim, setBannerDim] = useState(false);

  // Pending timers (banner fade + per-easter-egg reset), cleared on unmount so a
  // page turn can't fire state updates on the old page.
  const bannerTimer = useRef<number>();
  const flashTimers = useRef<Record<string, number>>({});
  useEffect(
    () => () => {
      window.clearTimeout(bannerTimer.current);
      Object.values(flashTimers.current).forEach(window.clearTimeout);
    },
    [],
  );

  // Narration auto-plays on page turn and whenever the language changes (PRD §4.1).
  useEffect(() => {
    playNarration(page.id, language);
    return () => stopNarration();
  }, [page.id, language]);

  // Reset + arm the banner auto-fade on every page turn.
  useEffect(() => {
    setBannerDim(false);
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBannerDim(true), 4200);
  }, [page.id]);

  function wakeBanner() {
    setBannerDim(false);
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBannerDim(true), 4200);
  }

  function handleTap() {
    playSfx(it.sfx);
    if (it.kind === "glow" || it.kind === "twinkle") setMainTapNonce((n) => n + 1);
    switch (it.kind) {
      case "swap":
        setOpened(true);
        break;
      case "glow":
        setGlowing(true);
        break;
      case "twinkle":
        setTwinkling(true);
        break;
      case "thank":
        // One leaf per page: a re-tap replays the sfx but never adds a second.
        if (!thanked && it.counting) playCount(it.total, language);
        setThanked(true);
        break;
      case "stick":
        setStuck((n) => {
          if (n >= it.count) return n;
          const next = n + 1;
          if (it.counting) playCount(next, language);
          return next;
        });
        break;
    }
  }

  function tapExtra(x: ExtraTap) {
    playSfx(x.sfx);
    setFlashing((f) => ({ ...f, [x.flash]: true }));
    setTapNonce((n) => ({ ...n, [x.flash]: (n[x.flash] ?? 0) + 1 }));
    // Re-tapping restarts the hold rather than letting an in-flight timer cut it short.
    window.clearTimeout(flashTimers.current[x.flash]);
    flashTimers.current[x.flash] = window.setTimeout(() => {
      setFlashing((f) => {
        const next = { ...f };
        delete next[x.flash];
        return next;
      });
      delete flashTimers.current[x.flash];
    }, x.hold ?? 900);
  }

  function layerClass(id: string): string {
    if (it.kind === "glow" && glowing && id === it.targetLayer)
      return "is-glowing";
    if (it.kind === "twinkle" && twinkling && id === it.targetLayer)
      return "is-twinkling";
    return "";
  }

  const pageGlowing = it.kind === "glow" && glowing && !it.targetLayer;

  return (
    <div
      className={`page ${pageGlowing ? "is-glowing" : ""}`}
      data-open={opened || undefined}
    >
      <Layer asset={page.background} className="background" />

      {page.layers.map((l) => {
        if (it.kind === "swap" && l.id === it.from)
          return <Layer key={l.id} asset={l} hidden={opened} />;
        if (it.kind === "swap" && l.id === it.to)
          return <Layer key={l.id} asset={l} hidden={!opened} />;
        if (it.kind === "thank" && l.id === it.to)
          return <Layer key={l.id} asset={l} hidden={!thanked} />;
        if (l.onOpen) return <Layer key={l.id} asset={l} hidden={!opened} />;
        return <Layer key={l.id} asset={l} className={layerClass(l.id)} />;
      })}

      {/* Easter-egg "reacted" frames: a full-frame variant of the plate cross-faded
          in for a moment on tap (PRD §6.1 "no dead taps"). */}
      {extras.map((x) => (
        <Layer
          key={x.flash}
          asset={{
            id: x.flash,
            src: `/pages/${pad(page.id)}/${(opened || thanked) && x.flashAfter ? x.flashAfter : x.flash}.${ART_EXT}`,
          }}
          className={`extra-flash ${x.aboveReveal ? "above-reveal" : ""}`}
          style={focusMask(x.focus ?? x.hotspot)}
          hidden={!flashing[x.flash]}
        />
      ))}

      {/* Always-visible tap acknowledgment, confined to the extra's own small
          hotspot rect. The full-frame flash above must stay hidden behind an
          already-revealed "to"/"thanked" layer on most pages (reverting that
          reveal, even briefly, is the actual bug `aboveReveal` guards
          against — see ExtraTap in types.ts), which otherwise leaves a tap
          that fires sfx only, with nothing to see or feel yet since no sfx
          assets exist. This spark never touches the reveal, so it's safe to
          show every time, in any order, before or after the main tap. */}
      {extras.map((x) => (
        <div
          key={`spark-${x.flash}-${tapNonce[x.flash] ?? 0}`}
          className="tap-spark"
          style={{
            left: `${x.hotspot.x}%`,
            top: `${x.hotspot.y}%`,
            width: `${x.hotspot.w}%`,
            height: `${x.hotspot.h}%`,
          }}
          hidden={!flashing[x.flash]}
          aria-hidden="true"
        />
      ))}

      {(it.kind === "glow" || it.kind === "twinkle") && mainTapNonce > 0 && (
        <div
          key={`main-spark-${mainTapNonce}`}
          className="tap-spark"
          style={{
            left: `${it.hotspot.x}%`,
            top: `${it.hotspot.y}%`,
            width: `${it.hotspot.w}%`,
            height: `${it.hotspot.h}%`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Big, unmistakable "it lit up" on every tap of a `glow` page: a bloom
          around the hotspot plus a ring of stars flying outward. The ambient
          pulse after it is deliberately mild (the art is drawn lit at rest),
          so this burst is what a toddler actually notices. Remounted per tap. */}
      {it.kind === "glow" && mainTapNonce > 0 && (
        <div
          key={`glow-burst-${mainTapNonce}`}
          className="glow-burst"
          style={{
            left: `${it.hotspot.x + it.hotspot.w / 2}%`,
            top: `${it.hotspot.y + it.hotspot.h / 2}%`,
          }}
          aria-hidden="true"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="glow-star"
              style={{ "--a": `${i * 36}deg`, "--d": i % 2 ? "15vmin" : "22vmin" } as CSSProperties}
            >
              ✦
            </span>
          ))}
        </div>
      )}

      {page.tree && (
        // Leaves carry over page to page; a thank-you tap flies in one more,
        // the counting page lights them up one by one (PRD §5).
        <ThankfulTree
          tree={page.tree}
          shown={page.tree.leaves + (it.kind === "thank" && thanked ? 1 : 0)}
          flying={it.kind === "thank" && thanked ? it.total - 1 : undefined}
          from={
            it.kind === "thank"
              ? (it.leafFrom ?? {
                  x: it.hotspot.x + it.hotspot.w / 2,
                  y: it.hotspot.y + it.hotspot.h / 2,
                })
              : undefined
          }
          counted={it.kind === "stick" && it.counting ? stuck : 0}
          glowing={!!page.tree.glowOnOpen && opened}
        />
      )}

      {it.kind === "thank" && thanked && it.counting && (
        <div className="thank-badge">
          <b className="count-num">{it.total}</b>
        </div>
      )}

      {it.kind === "stick" && it.counting && !page.tree && (
        // The plate already shows the stickers on the floor — tapping just
        // counts them: a numeral pops over each in turn.
        <div className="count-row">
          {Array.from({ length: stuck }).map((_, i) => (
            <b className="count-num" key={i}>
              {i + 1}
            </b>
          ))}
        </div>
      )}
      {it.kind === "stick" && !it.counting && (
        <div className="sticker-bag">
          {it.stickers.slice(0, stuck).map((id, i) => (
            <span className="sticker" key={i}>
              <img src={`/stickers/${id}.webp`} alt="" draggable={false} />
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        className="hotspot"
        style={{
          left: `${it.hotspot.x}%`,
          top: `${it.hotspot.y}%`,
          width: `${it.hotspot.w}%`,
          height: `${it.hotspot.h}%`,
        }}
        onClick={handleTap}
        aria-label={t(page.text, language)}
      />

      {/* Easter-egg tap targets, above the main hotspot so they win on overlap. */}
      {extras.flatMap((x) =>
        [x.hotspot, ...(x.alsoTap ?? [])].map((h, i) => (
          <button
            key={`${x.flash}-${i}`}
            type="button"
            className="hotspot extra-hotspot"
            style={{
              left: `${h.x}%`,
              top: `${h.y}%`,
              width: `${h.w}%`,
              height: `${h.h}%`,
            }}
            onClick={() => tapExtra(x)}
            aria-hidden="true"
            tabIndex={-1}
          />
        )),
      )}

      <button
        type="button"
        className={`text-banner ${bannerDim ? "is-dim" : ""} ${
          showText ? "" : "text-hidden"
        }`}
        onClick={() => {
          playNarration(page.id, language);
          wakeBanner();
        }}
        aria-label={
          (language === "zh" ? "再听一次：" : "Play again: ") +
          t(page.text, language)
        }
      >
        <span className="replay-icon" aria-hidden="true">
          ▶
        </span>
        {showText && (
          <span className="banner-text">
            <span className="sentence">{t(page.text, language)}</span>
            {page.secondaryText && (
              <span className="chant">{t(page.secondaryText, language)}</span>
            )}
          </span>
        )}
      </button>
    </div>
  );
}
