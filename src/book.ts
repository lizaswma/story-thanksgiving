import type { Asset, Hotspot, Page, TitleCard, Tree } from "./types";

// ── Asset path helpers (same convention as books 1–2) ──────────────────────
// Real art drops into /public/pages/NN/. Until then <Layer> shows the id as a
// labelled placeholder box (PRD §9.5, milestone M0).
const pageDir = (n: number) => `/pages/${String(n).padStart(2, "0")}`;

const bg = (n: number): Asset => ({
  id: `bg-${n}`,
  src: `${pageDir(n)}/background.webp`,
  alt: "",
});

const layer = (
  n: number,
  id: string,
  extra: Partial<Asset> & { ext?: "png" | "jpg" | "webp" } = {},
): Asset => {
  const { ext = "png", ...rest } = extra;
  return {
    id,
    src: `${pageDir(n)}/${id}.${ext}`,
    alt: "",
    ...rest,
  };
};

/** Audio paths — narration is per-page per-language (PRD §4). */
export const narrationSrc = (pageId: number, lang: string) =>
  `/audio/${lang}/${String(pageId).padStart(2, "0")}.mp3`;
export const countSrc = (n: number, lang: string) =>
  `/audio/${lang}/count/${n}.mp3`;
export const sfxSrc = (name: string) => `/sfx/${name}.mp3`;
export const leafSrc = (id: string) => `/leaves/${id}.webp`;

// ── The six leaves, in the order they join the tree (PRD §4.1) ─────────────
// `color` is the placeholder fill until the real leaf sprites exist; it also
// sets the M0 look for checking red/orange and green/brown apart (PRD §9.5).
export const LEAVES = [
  { id: "red", color: "#D9573F" },
  { id: "orange", color: "#EE9C53" },
  { id: "yellow", color: "#F2C94C" },
  { id: "green", color: "#6E9457" },
  { id: "brown", color: "#9A6B45" },
  { id: "golden", color: "#E8B62C", big: true },
] as const;

// ── Title card ──────────────────────────────────────────────────────────────
export const TITLE_CARD: TitleCard = {
  series: { zh: "「小兔」系列", en: "The Little Rabbit series" },
  title: { zh: "小兔过感恩节", en: "Little Rabbit's Thanksgiving" },
  start: { zh: "开始", en: "Start" },
  // 小兔 in her scarf beside the full six-leaf tree — part of the cover art;
  // the app overlays the text.
  background: { id: "bg-title", src: "/pages/00/background.webp", alt: "" },
  layers: [],
};

// Secondary lines (PRD §4.1): the leaf's color + the running count, folded into
// the read-aloud script rather than living only in the numeral badge.
const THE_RULE = { zh: "说声谢谢，贴片叶子。", en: "Say thank you, add a leaf." };
const LEAF_LINES = [
  { zh: "红叶子，一片！", en: "A red leaf. One!" },
  { zh: "橙叶子，两片！", en: "An orange leaf. Two!" },
  { zh: "黄叶子，三片！", en: "A yellow leaf. Three!" },
  { zh: "绿叶子，四片！", en: "A green leaf. Four!" },
  { zh: "棕叶子，五片！", en: "A brown leaf. Five!" },
  { zh: "金叶子，六片！", en: "A golden leaf. Six!" },
];

// Hotspots are % of the stage {x,y = top-left, w,h}. These are M0 guesses from
// the fixed thank-you composition (PRD §6: tree left, 小兔 centre, person
// right) — re-measure every one against the real art at M2.
const TREE_LEFT: Hotspot = { x: 5, y: 8, w: 28, h: 62 };
const RABBIT_CENTRE: Hotspot = { x: 38, y: 36, w: 22, h: 46 }; // the leaf in 小兔's paws
const tree = (leaves: number, area: Hotspot = TREE_LEFT): Tree => ({ area, leaves });

// Falling leaves outside the window — the book's recurring through-line extra,
// like book 2's moon (PRD §7.1). Hotspot is a placeholder until the art exists.
const windowLeaves = (hotspot: Hotspot) => ({
  flash: "window-leaves",
  sfx: "wind-chime",
  hotspot,
});

/** One thank-you page (PRD §5 pages 3–6, 8). Same composition every time. */
function thankPage(
  id: number,
  total: number,
  text: { zh: string; en: string },
  extras: Page["extras"] = [],
): Page {
  return {
    id,
    text,
    secondaryText: LEAF_LINES[total - 1],
    background: bg(id),
    layers: [layer(id, "scene-thanked", { className: "swap-to", ext: "webp" })],
    interaction: {
      kind: "thank",
      sfx: "leaf-boop",
      to: "scene-thanked",
      total,
      counting: true,
      hotspot: RABBIT_CENTRE,
    },
    tree: tree(total - 1),
    extras,
  };
}

export const PAGES: Page[] = [
  {
    id: 1,
    text: { zh: "感恩节到了！", en: "It's Thanksgiving!" },
    background: bg(1),
    layers: [layer(1, "scene-leaves", { className: "swap-to", ext: "webp" })],
    interaction: {
      kind: "swap",
      sfx: "wind-chime",
      to: "scene-leaves",
      hotspot: { x: 55, y: 10, w: 30, h: 42 }, // the window
    },
    extras: [{ flash: "door-wreath", sfx: "jingle", hotspot: { x: 15, y: 20, w: 18, h: 26 } }],
  },
  {
    id: 2,
    text: { zh: "妈妈拿来一篮树叶。", en: "Mama brings a basket of leaves." },
    secondaryText: THE_RULE,
    background: bg(2),
    layers: [layer(2, "scene-basket", { className: "swap-to", ext: "webp" })],
    interaction: {
      kind: "swap",
      sfx: "rustle",
      to: "scene-basket",
      hotspot: { x: 50, y: 50, w: 22, h: 30 }, // the leaf basket
    },
    tree: tree(0),
    extras: [
      windowLeaves({ x: 70, y: 8, w: 22, h: 34 }),
      { flash: "rug-wiggle", sfx: "whump", hotspot: { x: 36, y: 82, w: 30, h: 14 } },
    ],
  },
  thankPage(3, 1, { zh: "谢谢妈妈给我读书！", en: "Thank you, Mama, for reading to me!" }, [
    windowLeaves({ x: 70, y: 4, w: 22, h: 26 }),
  ]),
  thankPage(4, 2, { zh: "谢谢爸爸陪我骑车！", en: "Thank you, Baba, for biking with me!" }, [
    { flash: "bike-bell", sfx: "bike-bell", hotspot: { x: 82, y: 60, w: 14, h: 22 } },
  ]),
  thankPage(5, 3, { zh: "谢谢婆婆做好吃的！", en: "Thank you, Grandma, for yummy food!" }, [
    windowLeaves({ x: 70, y: 4, w: 22, h: 26 }),
    { flash: "steam-puff", sfx: "hiss", hotspot: { x: 64, y: 30, w: 14, h: 16 } },
  ]),
  thankPage(6, 4, { zh: "谢谢公公陪我种花！", en: "Thank you, Grandpa, for gardening with me!" }, [
    { flash: "watering-can", sfx: "trickle", hotspot: { x: 84, y: 66, w: 12, h: 18 } },
  ]),
  {
    id: 7,
    text: { zh: "叮咚！小猫来了！", en: "Ding-dong! Mr. Cat is here!" },
    background: bg(7),
    layers: [layer(7, "scene-open", { className: "swap-to", ext: "webp" })],
    interaction: {
      kind: "swap",
      sfx: "doorbell",
      to: "scene-open",
      hotspot: { x: 58, y: 20, w: 28, h: 62 }, // the front door
    },
    extras: [windowLeaves({ x: 20, y: 10, w: 22, h: 30 })],
  },
  thankPage(8, 5, { zh: "谢谢小猫做我朋友！", en: "Thank you, Mr. Cat, for being my friend!" }, [
    { flash: "pie-steam", sfx: "hiss", hotspot: { x: 68, y: 44, w: 14, h: 16 } },
  ]),
  {
    id: 9,
    text: { zh: "大家说：谢谢小兔！", en: "Everyone says: Thank you, Little Rabbit!" },
    secondaryText: LEAF_LINES[5],
    background: bg(9),
    layers: [layer(9, "scene-thanked", { className: "swap-to", ext: "webp" })],
    interaction: {
      // The layout breaks on purpose (PRD §6.2): the whole family on the right,
      // 小兔 centre with empty paws. The golden leaf comes from them, not her.
      kind: "thank",
      sfx: "magic",
      to: "scene-thanked",
      total: 6,
      counting: true,
      leafFrom: { x: 78, y: 40 },
      hotspot: { x: 5, y: 2, w: 30, h: 30 }, // the treetop
    },
    tree: tree(5),
    // No extras — protect the golden-leaf reveal (PRD §7.1).
  },
  {
    id: 10,
    text: { zh: "数一数树叶。", en: "Let's count the leaves." },
    background: bg(10),
    layers: [],
    interaction: {
      kind: "stick",
      sfx: "count-blip",
      count: 6,
      stickers: [],
      counting: true,
      hotspot: { x: 20, y: 6, w: 60, h: 70 }, // the tree, bigger here
    },
    tree: tree(6, { x: 20, y: 6, w: 60, h: 70 }),
    // No extras — keep the counting taps unambiguous (PRD §7.1).
  },
  {
    id: 11,
    text: { zh: "一家人吃大餐！", en: "Time for the big dinner!" },
    background: bg(11),
    layers: [layer(11, "scene-dinner", { className: "swap-to", ext: "webp" })],
    interaction: {
      kind: "swap",
      sfx: "clink",
      to: "scene-dinner",
      hotspot: { x: 25, y: 45, w: 50, h: 35 }, // the table
    },
    tree: tree(6, { x: 3, y: 4, w: 18, h: 40 }), // on the wall behind the table
    extras: [
      windowLeaves({ x: 78, y: 6, w: 18, h: 28 }),
      { flash: "candle-flare", sfx: "flare", hotspot: { x: 46, y: 36, w: 8, h: 14 } },
    ],
  },
  {
    id: 12,
    text: { zh: "感恩节快乐，晚安！", en: "Happy Thanksgiving. Good night!" },
    background: bg(12),
    layers: [layer(12, "scene-off", { className: "swap-to", ext: "webp" })],
    interaction: {
      kind: "swap",
      sfx: "lullaby",
      to: "scene-off",
      hotspot: { x: 20, y: 24, w: 16, h: 36 }, // the lamp
    },
    tree: { ...tree(6, { x: 3, y: 6, w: 16, h: 38 }), glowOnOpen: true }, // glows softly once the lamp is off
    extras: [
      { ...windowLeaves({ x: 66, y: 6, w: 22, h: 40 }), flashAfter: "window-leaves-off" },
      { flash: "blanket-wiggle", sfx: "whump", hotspot: { x: 38, y: 50, w: 40, h: 40 } },
    ],
  },
];

export const LAST_PAGE_INDEX = PAGES.length; // step 0 = title card, 1..12 = pages
