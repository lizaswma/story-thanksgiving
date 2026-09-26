// Data model for the storybook. See PRD.md §5 (story) and §7 (interactivity).
// Carried over from story-mooncakes' model — Asset/Hotspot/ExtraTap/Page/TitleCard
// are unchanged; `swap`/`glow`/`twinkle`/`stick` are reused as-is. This book adds
// `thank` (a leaf joins the thankful tree AND the person reacts) and `Page.tree`
// (the tree's leaves, composited in code so they carry over page to page).

export type Language = "zh" | "en";

export type LocalizedText = Record<Language, string>;

export type Asset = {
  /** Stable id, also used as the placeholder label until real art exists. */
  id: string;
  /** Path under /public. */
  src: string;
  alt?: string;
  /** Extra class for positioning/animation. */
  className?: string;
  /** If true, this layer is hidden until the page's interaction "opens". */
  onOpen?: boolean;
};

/** A large, toddler-sized tap area over the art, in % of the stage. */
export type Hotspot = { x: number; y: number; w: number; h: number };

export type Interaction =
  | { kind: "twinkle"; sfx: string; hotspot: Hotspot; targetLayer: string }
  | { kind: "glow"; sfx: string; hotspot: Hotspot; targetLayer?: string }
  | {
      kind: "swap";
      sfx: string;
      hotspot: Hotspot;
      /** Layer shown before the tap. Omit for a plain reveal over the background. */
      from?: string;
      /** Layer shown after the tap. */
      to: string;
    }
  | {
      /**
       * A thank-you (PRD §7): one leaf flies onto the thankful tree (like book 1's
       * `stick` onto the bag) AND the frame swaps to the person's reaction (like
       * `swap`). Pages 3, 4, 5, 6, 8, 9. The page must have a `tree`.
       */
      kind: "thank";
      sfx: string;
      hotspot: Hotspot;
      /** Reaction layer shown after the tap (the person's "after" pose). */
      to: string;
      /** Tree total AFTER this tap — 1..6. Picks the leaf (LEAVES[total-1]) and drives the badge. */
      total: number;
      /** Where the leaf starts its flight (% of stage). Defaults to the hotspot centre. */
      leafFrom?: { x: number; y: number };
      /** Speak the number and show a numeral badge. */
      counting?: boolean;
    }
  | {
      kind: "stick";
      sfx: string;
      hotspot: Hotspot;
      /** How many items there are to tap through. */
      count: number;
      /** Sticker sprite ids, in order (unused when counting leaves on a `tree`). */
      stickers: string[];
      /** Counting page: speak the number and show the numeral on each tap. */
      counting?: boolean;
    };

/**
 * The thankful tree (感恩树). Leaves are composited in code, not baked into the
 * plates, so the same bare-tree art works on every page and the count carries
 * over (PRD §5, §9.4). Omit on pages where the tree isn't in frame, or where the
 * final art already has the full tree baked in.
 */
export type Tree = {
  /** The tree's bounding box on this page's art (% of stage). Leaf slots are placed inside it. */
  area: Hotspot;
  /** Leaves already on the tree when the page opens (before any tap). */
  leaves: number;
  /** Glow softly once the page's main interaction fires (page 12's lights-off). */
  glowOnOpen?: boolean;
};

/**
 * An "easter-egg" tap: a secondary element a toddler is likely to poke at.
 * It never gates progress and is never "wrong". Tapping cross-fades in a
 * full-frame "reacted" variant of the plate for a beat, plus a soft sound.
 * Repeatable forever. PRD §7.1.
 */
export type ExtraTap = {
  hotspot: Hotspot;
  /** More tap rects that trigger this same extra, for a non-rectangular element. */
  alsoTap?: Hotspot[];
  sfx: string;
  /** Full-frame variant layer id under /pages/NN/ (e.g. "window-leaves"). */
  flash: string;
  /** How long the variant stays up, ms (default 900). */
  hold?: number;
  /**
   * Flash id to show INSTEAD of `flash` once the page's main interaction has
   * fired — the same edit made on the revealed frame (e.g. page 12's lights-off).
   */
  flashAfter?: string;
  /**
   * Extras are edits of the PRE-interaction frame, so by default they render
   * below the main reveal once it's open (safe, but the tap goes visually
   * silent). Set true to render above instead — only when briefly reverting
   * that region is harmless. Almost always pair with `focus`.
   */
  aboveReveal?: boolean;
  /** With `aboveReveal`: confine the flash to this feathered region (% of stage). */
  focus?: Hotspot;
};

export type Page = {
  id: number;
  text: LocalizedText;
  /** The color + running-count line on the leaf pages (PRD §4.1). */
  secondaryText?: LocalizedText;
  background: Asset;
  layers: Asset[];
  interaction: Interaction;
  /** The thankful tree, if it's in frame on this page. */
  tree?: Tree;
  /** Secondary tappable elements (PRD §7.1 "no dead taps"). */
  extras?: ExtraTap[];
};

export type TitleCard = {
  series: LocalizedText;
  title: LocalizedText;
  start: LocalizedText;
  background: Asset;
  layers: Asset[];
};
