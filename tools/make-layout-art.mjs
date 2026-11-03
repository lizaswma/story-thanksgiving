#!/usr/bin/env node
/**
 * Vector layout art: draws every plate the book references as flat SVG, so the
 * whole story can be laid out and tapped through before spending on image
 * generation (PRD §13, M1 → M2). No dependencies, no API calls, deterministic.
 *
 * These are stand-ins that follow the style bible's rules (palette, thick brown
 * outlines, flat fills, no teeth), not the locked character art. Hotspots in
 * src/book.ts are measured against this layout; real art in M2 should keep to it.
 *
 * Usage (from the repo root):  node tools/make-layout-art.mjs
 * Writes public/pages/NN/*.svg and public/leaves/*.svg.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1280;
const H = 720;
const FLOOR = 560;

// palette/palette.json, plus scene colors for this book.
const C = {
  fur: "#F9E7D2",
  furShadow: "#EDD5BE",
  blush: "#FCB0AB",
  ink: "#593A2E",
  pumpkin: "#EE9C53",
  pumpkinShadow: "#BC6634",
  stem: "#6E9457",
  moon: "#F7E7A6",
  lamp: "#F6C87A",
  paper: "#FDF3E8",
  wall: "#F4DFBC",
  floor: "#C98F52",
  floorDark: "#B37C43",
  wood: "#A9744A",
  woodLight: "#C99564",
  sky: "#CFE3EA",
  night: "#2E3A5C",
  rug: "#D9765A",
  pink: "#F3A6B5",
  coral: "#E0705F",
  rose: "#C98A93",
  purple: "#9C7BC0",
  red: "#B23A3A",
  cat: "#C98F52",
  bear: "#BC8A55",
  bearLight: "#E2BE8C",
  catStripe: "#8F5F35",
  white: "#FFFDF8",
};
// src/book.ts LEAVES
const LEAF = {
  red: "#D9573F",
  orange: "#EE9C53",
  yellow: "#F2C94C",
  green: "#6E9457",
  brown: "#9A6B45",
  purple: "#9C7BC0",
  golden: "#E8B62C",
};
const LEAF_ORDER = ["red", "orange", "yellow", "green", "brown", "purple", "golden"];

const stroke = (w = 6, c = C.ink) =>
  `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const ell = (x, y, rx, ry, fill, extra = "") =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const rect = (x, y, w, h, fill, r = 0, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const path = (d, fill = "none", extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
const g = (transform, ...kids) => `<g transform="${transform}">${kids.join("")}</g>`;
const svg = (...kids) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${kids.join("")}</svg>\n`;

/** A limb or branch: a thick stroke over a thicker outline stroke. */
const tube = (d, color, w) =>
  path(d, "none", stroke(w + 11)) + path(d, "none", `stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`);

const star = (x, y, r = 12, fill = C.moon) =>
  path(
    `M${x} ${y - r}Q${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y}Q${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r}Q${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y}Q${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r}Z`,
    fill,
    stroke(3),
  );

// ── Leaves ──────────────────────────────────────────────────────────────────
const LEAF_PATH =
  "M50 6C58 20 62 24 72 20C72 30 76 36 92 38C84 48 84 52 88 60C76 60 66 62 58 70L54 90Q50 94 46 90L42 70C34 62 24 60 12 60C16 52 16 48 8 38C24 36 28 30 28 20C38 24 42 20 50 6Z";
/** Leaf centred on (x, y), `size` px across. */
function leaf(x, y, size, color, rot = 0) {
  const s = size / 100;
  return g(
    `translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(-50 -50)`,
    path(LEAF_PATH, color, stroke(5)),
    path("M50 26L50 80M50 50L34 38M50 50L66 38", "none", stroke(3.5)),
  );
}

// ── Characters ──────────────────────────────────────────────────────────────
const yTop = (tall = 0) => -130 - tall;
const ARMS = {
  down: (t) => [`M-48 ${t + 26}Q-74 ${t + 50} -82 ${t + 84}`, `M48 ${t + 26}Q74 ${t + 50} 82 ${t + 84}`],
  open: (t) => [`M-48 ${t + 28}Q-96 ${t + 20} -136 ${t - 26}`, `M48 ${t + 28}Q96 ${t + 20} 136 ${t - 26}`],
  up: (t) => [`M-48 ${t + 28}Q-96 ${t + 4} -112 ${t - 62}`, `M48 ${t + 28}Q96 ${t + 4} 112 ${t - 62}`],
  hips: (t) => [`M-48 ${t + 26}Q-116 ${t + 48} -54 ${t + 90}`, `M48 ${t + 26}Q116 ${t + 48} 54 ${t + 90}`],
  holdL: (t) => [`M-48 ${t + 28}Q-70 ${t + 56} -92 ${t + 50}`, `M46 ${t + 34}Q0 ${t + 74} -72 ${t + 56}`],
  holdR: (t) => [`M48 ${t + 28}Q70 ${t + 56} 92 ${t + 50}`, `M-46 ${t + 34}Q0 ${t + 74} 72 ${t + 56}`],
};
/** Global position of the paws for a holdL / holdR pose — where props go. */
const paws = (o) => [
  o.x + (o.arms === "holdL" ? -1 : 1) * o.s * 88,
  o.y + o.s * (yTop(o.tall) + 52),
];

function creature(o) {
  const { x, y, s = 1, tall = 0, look = 0, arms = "down", eyes = "dot", lean = 0, cat = false, bear = false, tailSwish = false } = o;
  const coat = bear ? C.bear : cat ? C.cat : C.fur;
  const t = yTop(tall);
  const h = t - 78;
  const [armL, armR] = ARMS[arms](t);
  const front = arms === "holdL" || arms === "holdR";
  const armsSvg = tube(armL, coat, 22) + tube(armR, coat, 22);

  const ears = bear
    ? ell(-74, h - 72, 36, 36, coat, stroke()) + ell(-74, h - 72, 17, 17, C.bearLight) +
      ell(74, h - 72, 36, 36, coat, stroke()) + ell(74, h - 72, 17, 17, C.bearLight)
    : cat
    ? path(`M-82 ${h - 40}L-72 ${h - 118}L-20 ${h - 78}Z`, coat, stroke()) +
      path(`M-68 ${h - 62}L-65 ${h - 98}L-40 ${h - 78}Z`, C.pink) +
      path(`M82 ${h - 40}L72 ${h - 118}L20 ${h - 78}Z`, coat, stroke()) +
      path(`M68 ${h - 62}L65 ${h - 98}L40 ${h - 78}Z`, C.pink)
    : g(`rotate(-11 -44 ${h - 70})`, ell(-44, h - 122, 31, 74, coat, stroke()), ell(-44, h - 112, 15, 50, C.furShadow)) +
      g(`rotate(10 44 ${h - 70})`, ell(44, h - 108, 27, 54, coat, stroke()), ell(44, h - 100, 12, 34, C.furShadow)) +
      g(`rotate(28 78 ${h - 150})`, ell(78, h - 150, 40, 26, coat, stroke()));

  const tail = cat
    ? tube(
        tailSwish
          ? `M50 -30Q150 -20 160 -110`
          : `M50 -30Q130 -30 110 -120`,
        coat,
        18,
      )
    : "";

  const body =
    path(
      `M-42 ${t}C-74 ${t + 54} -66 -44 -58 -18C-54 6 -20 6 -16 -14Q0 -8 16 -14C20 6 54 6 58 -18C66 -44 74 ${t + 54} 42 ${t}Z`,
      coat,
      stroke(),
    ) + (cat ? ell(0, t + 74 + tall / 2, 34, 50 + tall / 3, C.fur) : bear ? ell(0, t + 74 + tall / 2, 36, 50 + tall / 3, C.bearLight) : path(`M40 ${t + 14}C62 ${t + 62} 54 -44 46 -18Q30 -10 34 -30C42 ${t + 80} 44 ${t + 40} 40 ${t + 14}Z`, C.furShadow));

  const stripes = cat
    ? path(`M0 ${h - 84}L0 ${h - 56}M-26 ${h - 80}L-22 ${h - 58}M26 ${h - 80}L22 ${h - 58}`, "none", stroke(7, C.catStripe)) +
      path(`M-90 ${h + 2}L-68 ${h + 6}M90 ${h + 2}L68 ${h + 6}`, "none", stroke(7, C.catStripe))
    : "";

  const eyeL = -42 + look;
  const eyeR = 42 + look;
  const eyeY = h - 2;
  const eyesSvg =
    eyes === "dot"
      ? ell(eyeL, eyeY, 9.5, 10, C.ink) + ell(eyeR, eyeY, 9.5, 10, C.ink)
      : eyes === "happy"
        ? path(`M${eyeL - 12} ${eyeY + 4}Q${eyeL} ${eyeY - 12} ${eyeL + 12} ${eyeY + 4}M${eyeR - 12} ${eyeY + 4}Q${eyeR} ${eyeY - 12} ${eyeR + 12} ${eyeY + 4}`, "none", stroke(5))
        : path(`M${eyeL - 12} ${eyeY - 3}Q${eyeL} ${eyeY + 10} ${eyeL + 12} ${eyeY - 3}M${eyeR - 12} ${eyeY - 3}Q${eyeR} ${eyeY + 10} ${eyeR + 12} ${eyeY - 3}`, "none", stroke(5));

  const face =
    ell(-60 + look, h + 25, 18, 11, C.blush) +
    ell(60 + look, h + 25, 18, 11, C.blush) +
    eyesSvg +
    path(`M${look - 9} ${h + 16}H${look + 9}L${look} ${h + 25}Z`, C.blush, stroke(2.5, C.blush)) +
    path(`M${look - 13} ${h + 33}Q${look - 6} ${h + 41} ${look} ${h + 31}Q${look + 6} ${h + 41} ${look + 13} ${h + 33}`, "none", stroke(3.5));

  return g(
    `translate(${x} ${y}) scale(${s})`,
    ell(0, 4, 84, 13, "rgba(89,58,46,.18)"),
    g(
      `rotate(${lean})`,
      tail,
      ears,
      front ? "" : armsSvg,
      body,
      o.under?.(t, h) ?? "",
      front ? armsSvg : "",
      ell(0, h, 100, 88, coat, stroke()),
      stripes,
      bear ? ell(look, h + 28, 36, 28, C.bearLight) : "",
      face,
      bear ? ell(look, h + 18, 11, 8, C.ink) : "",
      o.over?.(t, h) ?? "",
    ),
  );
}

// Each person's costume per STYLE.md §3–§3.2. `scarf` is PRD §9.2.
const scarf = (t) =>
  path(`M-52 ${t + 4}Q0 ${t + 32} 52 ${t + 4}L58 ${t + 28}Q0 ${t + 58} -58 ${t + 28}Z`, C.pumpkin, stroke()) +
  path(`M22 ${t + 38}L54 ${t + 34}L60 ${t + 86}L28 ${t + 90}Z`, C.pumpkin, stroke()) +
  path(`M30 ${t + 58}L56 ${t + 54}`, "none", stroke(4, C.pumpkinShadow));

const bunny = (o) => creature({ s: 0.76, under: (t) => scarf(t), ...o });
const mama = (o) =>
  creature({
    s: 0.92,
    tall: 60,
    under: (t) =>
      [-36, -18, 0, 18, 36].map((d) => ell(d, t + 14 + (36 - Math.abs(d)) * 0.3, 10, 10, C.coral, stroke(3))).join(""),
    over: (_, h) =>
      path(`M60 ${h - 104}L34 ${h - 122}V${h - 86}ZM60 ${h - 104}L86 ${h - 122}V${h - 86}Z`, C.pink, stroke(4)),
    ...o,
  });
const baba = (o) =>
  creature({
    s: 0.98,
    tall: 70,
    under: (t) =>
      path(`M0 ${t + 14}L-36 ${t - 2}V${t + 32}ZM0 ${t + 14}L36 ${t - 2}V${t + 32}Z`, C.red, stroke(5)) + ell(0, t + 14, 9, 9, C.red, stroke(4)),
    ...o,
  });
const popo = (o) =>
  creature({
    s: 0.84,
    tall: 26,
    lean: -7,
    under: (t) => path(`M-56 ${t + 6}Q0 ${t + 42} 56 ${t + 6}L72 ${t + 62}Q0 ${t + 112} -72 ${t + 62}Z`, C.rose, stroke()),
    over: (_, h) =>
      `<circle cx="-42" cy="${h + 2}" r="20" fill="none" ${stroke(4)}/><circle cx="42" cy="${h + 2}" r="20" fill="none" ${stroke(4)}/>` +
      path(`M-22 ${h + 2}H22`, "none", stroke(4)) +
      ell(66, h - 66, 13, 13, C.purple, stroke(3)) +
      ell(66, h - 66, 4, 4, C.moon),
    ...o,
  });
const gongCap = (h, tipped) =>
  g(
    tipped ? `translate(10 -34) rotate(14 0 ${h - 84})` : "",
    path(`M-46 ${h - 74}Q-40 ${h - 118} 8 ${h - 114}Q50 ${h - 110} 52 ${h - 74}Z`, C.wood, stroke()),
    path(`M-56 ${h - 72}Q0 ${h - 62} 62 ${h - 72}`, "none", stroke(9)),
  );
const gonggong = (o) =>
  creature({ s: 0.86, tall: 26, lean: -7, over: (_, h) => gongCap(h, o.capTipped), ...o });
const cat = (o) => creature({ cat: true, s: 0.8, tall: 26, ...o });
const bear = (o) => creature({ bear: true, s: 0.92, tall: 44, ...o });

// ── Props ───────────────────────────────────────────────────────────────────
function pictureBook(x, y, rot = 0) {
  return g(
    `translate(${x} ${y}) rotate(${rot})`,
    path("M0 -38Q-30 -52 -66 -40V30Q-30 18 0 32Q30 18 66 30V-40Q30 -52 0 -38Z", C.white, stroke()),
    path("M0 -38V32", "none", stroke(4)),
    ell(-34, -8, 17, 15, C.stem),
    ell(34, -8, 17, 15, C.pumpkin),
  );
}
function helmet(x, y) {
  return g(
    `translate(${x} ${y})`,
    path("M-54 22Q-56 -44 0 -44Q56 -44 54 22Z", C.coral, stroke()),
    path("M-20 -40V-6M20 -40V-6", "none", stroke(4)),
    path("M-64 24H64", "none", stroke(11)),
  );
}
function bike(x, y, ringing = false) {
  const wheel = (cx) =>
    `<circle cx="${cx}" cy="${y - 42}" r="42" fill="none" ${stroke(9)}/>` + ell(cx, y - 42, 7, 7, C.ink);
  return (
    wheel(x - 66) +
    wheel(x + 66) +
    path(`M${x - 66} ${y - 42}L${x - 16} ${y - 112}H${x + 42}L${x + 66} ${y - 42}M${x - 16} ${y - 112}L${x + 6} ${y - 42}L${x + 42} ${y - 112}`, "none", stroke(9, C.coral)) +
    path(`M${x - 40} ${y - 128}H${x + 4}`, "none", stroke(14)) +
    path(`M${x + 42} ${y - 112}L${x + 34} ${y - 146}H${x + 72}`, "none", stroke(9)) +
    ell(x + 58, y - 160, 14, 13, C.yellow ?? C.moon, stroke(4)) +
    (ringing ? star(x + 88, y - 186, 15) + star(x + 28, y - 192, 11) + star(x + 96, y - 148, 9) : "")
  );
}
const steam = (x, y, big = false) =>
  [-22, 0, 22]
    .map((d, i) => {
      const hgt = (big ? 86 : 48) + (i === 1 ? 10 : 0);
      return path(`M${x + d} ${y}q-14 ${-hgt / 3} 0 ${(-hgt * 2) / 3}q10 ${-hgt / 6} 0 ${-hgt / 3}`, "none", `stroke="${C.white}" stroke-width="${big ? 11 : 8}" stroke-linecap="round" opacity=".9"`);
    })
    .join("");
function dumplingBowl(x, y) {
  return (
    [-30, 0, 30].map((d) => path(`M${x + d - 22} ${y - 12}Q${x + d} ${y - 50} ${x + d + 22} ${y - 12}Z`, C.white, stroke(4))).join("") +
    path(`M${x - 66} ${y - 14}H${x + 66}Q${x + 60} ${y + 42} ${x + 22} ${y + 44}H${x - 22}Q${x - 60} ${y + 42} ${x - 66} ${y - 14}Z`, "#8FB6C4", stroke())
  );
}
function flowerPot(x, y, bloom) {
  const top = y - 96;
  return (
    path(`M${x} ${y - 56}V${top - 40}`, "none", stroke(9, C.stem)) +
    ell(x - 22, y - 86, 21, 11, C.stem, stroke(4)) +
    ell(x + 22, y - 92, 21, 11, C.stem, stroke(4)) +
    (bloom
      ? [0, 60, 120, 180, 240, 300].map((a) => {
          const r = (a * Math.PI) / 180;
          return ell(x + Math.cos(r) * 27, top - 52 + Math.sin(r) * 27, 21, 21, C.pink, stroke(4));
        }).join("") + ell(x, top - 52, 18, 18, C.yellow ?? C.moon, stroke(4))
      : path(`M${x - 17} ${top - 36}Q${x} ${top - 84} ${x + 17} ${top - 36}Q${x} ${top - 24} ${x - 17} ${top - 36}Z`, C.pink, stroke(4))) +
    path(`M${x - 48} ${y - 62}H${x + 48}L${x + 36} ${y}H${x - 36}Z`, C.pumpkinShadow, stroke())
  );
}
function wateringCan(x, y, pouring = false) {
  return g(
    `translate(${x} ${y}) rotate(${pouring ? -22 : 0})`,
    path("M-40 -66H40V0H-40Z", "#8FB6C4", stroke()),
    path("M-40 -46L-82 -74", "none", stroke(11)),
    path("M-96 -82L-70 -64", "none", stroke(14)),
    path("M-16 -66Q0 -100 22 -66", "none", stroke(8)),
  ) +
    (pouring
      ? [0, 1, 2, 3].map((i) => ell(x - 112 - i * 8, y - 42 + i * 24, 6, 10, "#8FB6C4", stroke(2.5))).join("")
      : "");
}
function kite(x, y, tox, toy) {
  return (
    path(`M${x} ${y + 44}Q${(x + tox) / 2 + 30} ${(y + toy) / 2} ${tox} ${toy}`, "none", stroke(4)) +
    path(`M${x} ${y - 52}L${x + 40} ${y}L${x} ${y + 52}L${x - 40} ${y}Z`, C.coral, stroke()) +
    path(`M${x} ${y - 52}V${y + 52}M${x - 40} ${y}H${x + 40}`, "none", stroke(4))
  );
}
function ball(x, y, bouncing = false) {
  const by = bouncing ? y - 70 : y;
  return (
    (bouncing ? star(x - 54, y - 44, 10) + star(x + 54, y - 58, 9) : "") +
    `<circle cx="${x}" cy="${by - 38}" r="38" fill="${C.moon}" ${stroke()}/>` +
    path(`M${x - 38} ${by - 38}Q${x} ${by - 62} ${x + 38} ${by - 38}M${x - 26} ${by - 12}Q${x} ${by - 30} ${x + 26} ${by - 12}`, "none", stroke(5, C.coral))
  );
}
function pie(x, y) {
  return (
    path(`M${x - 72} ${y - 8}H${x + 72}L${x + 58} ${y + 22}H${x - 58}Z`, C.woodLight, stroke()) +
    ell(x, y - 8, 72, 21, C.pumpkin, stroke()) +
    ell(x, y - 9, 42, 10, C.pumpkinShadow, 'opacity=".45"')
  );
}
function basket(x, y, full) {
  const pile = full
    ? LEAF_ORDER.slice(0, 6)
        .map((c, i) => leaf(x - 70 + i * 28, y - 86 - (i % 2) * 26, 66, LEAF[c], -24 + i * 12))
        .join("")
    : "";
  return (
    path(`M${x - 74} ${y - 66}Q${x} ${y - 180} ${x + 74} ${y - 66}`, "none", stroke(11, C.wood)) +
    pile +
    path(`M${x - 88} ${y - 66}H${x + 88}L${x + 66} ${y}H${x - 66}Z`, C.woodLight, stroke()) +
    path(`M${x - 78} ${y - 44}H${x + 78}M${x - 72} ${y - 22}H${x + 72}`, "none", stroke(4))
  );
}
function turkey(x, y) {
  return (
    path(`M${x - 84} ${y + 8}H${x + 84}Q${x + 84} ${y + 26} ${x + 66} ${y + 26}H${x - 66}Q${x - 84} ${y + 26} ${x - 84} ${y + 8}Z`, C.white, stroke()) +
    tube(`M${x - 46} ${y - 18}L${x - 76} ${y - 34}`, C.woodLight, 13) +
    tube(`M${x + 46} ${y - 18}L${x + 76} ${y - 34}`, C.woodLight, 13) +
    path(`M${x - 62} ${y + 8}Q${x - 62} ${y - 58} ${x} ${y - 58}Q${x + 62} ${y - 58} ${x + 62} ${y + 8}Z`, C.pumpkinShadow, stroke())
  );
}
function vase(x, y) {
  return flowerStem(x, y) + path(`M${x - 24} ${y - 56}Q${x - 34} ${y - 20} ${x - 20} ${y}H${x + 20}Q${x + 34} ${y - 20} ${x + 24} ${y - 56}Z`, "#8FB6C4", stroke());
}
function flowerStem(x, y) {
  return (
    path(`M${x} ${y - 50}V${y - 100}`, "none", stroke(7, C.stem)) +
    [0, 72, 144, 216, 288].map((a) => {
      const r = (a * Math.PI) / 180;
      return ell(x + Math.cos(r) * 18, y - 112 + Math.sin(r) * 18, 14, 14, C.pink, stroke(3));
    }).join("") +
    ell(x, y - 112, 12, 12, C.moon, stroke(3))
  );
}
function candle(x, y, flare = false) {
  return (
    rect(x - 11, y - 54, 22, 54, C.white, 3, stroke(5)) +
    path(`M${x} ${y - (flare ? 118 : 88)}Q${x + (flare ? 26 : 16)} ${y - 66} ${x} ${y - 56}Q${x - (flare ? 26 : 16)} ${y - 66} ${x} ${y - (flare ? 118 : 88)}Z`, C.lamp, stroke(4)) +
    (flare ? star(x - 36, y - 104, 10) + star(x + 36, y - 92, 9) : "")
  );
}

// ── The room ────────────────────────────────────────────────────────────────
const room = () =>
  rect(0, 0, W, H, C.wall) +
  rect(0, FLOOR, W, H - FLOOR, C.floor) +
  rect(0, FLOOR - 22, W, 22, C.white) +
  path(`M0 ${FLOOR - 22}H${W}M0 ${FLOOR}H${W}`, "none", stroke(5));

function windowFrame(x, y, w, h, { leaves = false, night = false, dim = false } = {}) {
  const fall = [
    [0.2, 0.2, "red", 20], [0.48, 0.1, "golden", -24], [0.76, 0.26, "orange", 40],
    [0.32, 0.5, "yellow", -18], [0.66, 0.58, "brown", 28], [0.18, 0.8, "orange", 12], [0.82, 0.8, "red", -30],
  ];
  const size = Math.min(w, h) * 0.2;
  return (
    rect(x, y, w, h, night ? C.night : C.sky, 12, stroke(9, C.wood)) +
    (night
      ? ell(x + w * 0.72, y + h * 0.3, h * 0.13, h * 0.13, C.moon) + star(x + w * 0.24, y + h * 0.24, 8) + star(x + w * 0.4, y + h * 0.62, 7)
      : path(`M${x + 4} ${y + h - 4}Q${x + w / 2} ${y + h * 0.5} ${x + w - 4} ${y + h - 4}Z`, C.stem)) +
    (leaves
      ? fall.map(([fx, fy, c, r]) => `<g opacity="${dim ? 0.7 : 1}">${leaf(x + fx * w, y + fy * h, size, LEAF[c], r)}</g>`).join("")
      : "") +
    path(`M${x + w / 2} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}`, "none", stroke(7, C.wood)) +
    rect(x - 16, y + h, w + 32, 16, C.woodLight, 5, stroke(5))
  );
}

function door(x, y, w, h, { open = false, wreath = false, wiggle = false } = {}) {
  const wreathSvg = wreath
    ? g(
        `translate(${x + w / 2} ${y + 130}) rotate(${wiggle ? 12 : 0}) scale(${wiggle ? 1.12 : 1})`,
        ...Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return leaf(Math.cos(a) * 54, Math.sin(a) * 54, 50, LEAF[LEAF_ORDER[i % 4]], (a * 180) / Math.PI);
        }),
        path("M0 52L-20 78L0 68L20 78Z", C.red, stroke(4)),
      ) + (wiggle ? star(x + w / 2 - 92, y + 66, 14) + star(x + w / 2 + 92, y + 90, 12) : "")
    : "";
  if (open) {
    return (
      rect(x, y, w, h, C.sky, 8, stroke(9, C.wood)) +
      rect(x + 5, y + h * 0.78, w - 10, h * 0.22 - 4, C.stem) +
      path(`M${x} ${y}L${x + w * 0.2} ${y + 34}V${y + h + 18}L${x} ${y + h}Z`, C.woodLight, stroke())
    );
  }
  return (
    rect(x, y, w, h, C.woodLight, 8, stroke(9, C.wood)) +
    rect(x + w * 0.14, y + h * 0.52, w * 0.72, h * 0.38, C.wood, 8, 'opacity=".35"') +
    ell(x + w * 0.86, y + h * 0.52, 12, 12, C.lamp, stroke(4)) +
    wreathSvg
  );
}

/** The bare paper tree on the wall; `area` matches Page.tree.area in src/book.ts. */
const SLOTS = [[22, 40], [76, 36], [32, 18], [66, 14], [50, 46], [92, 16], [50, 2]];
function tree(area, leaves = 0) {
  const X = (p) => (area.x / 100) * W + ((p / 100) * area.w * W) / 100;
  const Y = (p) => (area.y / 100) * H + ((p / 100) * area.h * H) / 100;
  const cx = X(50);
  const w = Math.max(7, area.w * 0.42);
  const branch = (fromY, [sx, sy]) => tube(`M${cx} ${Y(fromY)}Q${X((50 + sx) / 2)} ${Y(fromY - 4)} ${X(sx)} ${Y(sy)}`, C.wood, w);
  return (
    branch(68, SLOTS[0]) +
    branch(64, SLOTS[1]) +
    branch(46, SLOTS[2]) +
    branch(40, SLOTS[3]) +
    branch(52, SLOTS[5]) +
    tube(`M${cx} ${Y(100)}V${Y(6)}`, C.wood, w * 1.9) +
    path(`M${X(28)} ${Y(100)}Q${cx} ${Y(89)} ${X(72)} ${Y(100)}Z`, C.wood, stroke()) +
    SLOTS.slice(0, leaves)
      .map(([sx, sy], i) => leaf(X(sx), Y(sy), Math.min(area.w * (i === 6 ? 0.32 : 0.22), i === 6 ? 10 : 7) * (W / 100), LEAF[LEAF_ORDER[i]]))
      .join("")
  );
}

// ── Pages ───────────────────────────────────────────────────────────────────
const TREE_LEFT = { x: 5, y: 8, w: 28, h: 62 };
const WINDOW = [600, 44, 240, 180]; // the one window in the thank-you room (book.ts ROOM_WINDOW)
const BUNNY_AT = { x: 622, y: 606 };
const LEAF_AT = [BUNNY_AT.x + 74, BUNNY_AT.y + 0.76 * (yTop() + 44)]; // book.ts LEAF_START

/** Pages 3–6, 8 (PRD §6): tree left, 小兔 centre, one person right. */
function thankPlate(n, leavesBefore, personFn, opts = {}) {
  const color = LEAF[LEAF_ORDER[n]];
  const before = (extra) =>
    svg(
      room(),
      windowFrame(...WINDOW, { leaves: extra === "window" }),
      tree(TREE_LEFT),
      personFn(false, extra),
      bunny({ ...BUNNY_AT, arms: "holdR", look: 14 }),
      leaf(LEAF_AT[0], LEAF_AT[1], 92, color, 12),
    );
  const after = svg(
    room(),
    windowFrame(...WINDOW),
    tree(TREE_LEFT),
    personFn(true),
    bunny({ ...BUNNY_AT, arms: "up", eyes: "happy", look: 14 }),
  );
  return { background: before(), "scene-thanked": after, ...Object.fromEntries((opts.extras ?? []).map(([id, key]) => [id, before(key)])) };
}

const person = {
  mama(after) {
    const o = { x: 1010, y: 610, arms: after ? "open" : "holdL", look: after ? 0 : -14 };
    const [px, py] = paws({ ...o, s: 0.92, tall: 60 });
    return after ? mama(o) + pictureBook(860, 628, 8) : mama(o) + pictureBook(px, py);
  },
  baba(after, extra) {
    const o = { x: 925, y: 610, arms: after ? "hips" : "holdL", look: after ? 0 : -14 };
    const [px, py] = paws({ ...o, s: 0.98, tall: 70 });
    const bikeSvg = bike(1150, 606, extra === "bell");
    return after ? bikeSvg + helmet(1150, 410) + baba(o) : bikeSvg + baba(o) + helmet(px, py);
  },
  popo(after, extra) {
    const o = { x: 1050, y: 610, arms: "holdL", look: -14, eyes: after ? "happy" : "dot" };
    const [px, py] = paws({ ...o, s: 0.84, tall: 26 });
    const by = after ? py - 34 : py;
    const apron = (t) => path(`M-34 ${t + 54}H34L46 -30H-46Z`, C.white, stroke(5));
    const over = popo({ ...o, under: (t) => apron(t) + path(`M-56 ${t + 6}Q0 ${t + 42} 56 ${t + 6}L72 ${t + 62}Q0 ${t + 112} -72 ${t + 62}Z`, C.rose, stroke()) });
    return over + dumplingBowl(px - 18, by) + steam(px - 18, by - 50, after || extra === "steam");
  },
  gonggong(after, extra) {
    const o = { x: 1000, y: 610, arms: after ? "up" : "down", look: -14, eyes: after ? "happy" : "dot", capTipped: after };
    return flowerPot(838, 618, after) + gonggong(o) + wateringCan(1155, 606, extra === "can");
  },
  cat(after, extra) {
    const o = { x: 1040, y: 610, arms: "holdL", look: -14, tailSwish: after, eyes: after ? "happy" : "dot" };
    const [px, py] = paws({ ...o, s: 0.8, tall: 26 });
    return cat(o) + pie(px - 30, py + 4) + (extra === "steam" ? steam(px - 30, py - 26, true) : "");
  },
  bear(after, extra) {
    const o = { x: 1030, y: 610, arms: after ? "up" : "holdL", look: -14, eyes: after ? "happy" : "dot" };
    const [px, py] = paws({ ...o, s: 0.92, tall: 44 });
    const ballSvg = ball(1160, 616, extra === "ball");
    return after
      ? ballSvg + kite(876, 280, 932, 268) + bear(o)
      : ballSvg + bear(o) + kite(px - 34, py - 150, px, py);
  },
};

/** Who stands where on page 10 (PRD §6.2): all six on the right. */
function group9(after) {
  const eyes = after ? "happy" : "dot";
  const arms = after ? "up" : "down";
  return (
    mama({ x: 780, y: 560, s: 0.7, arms, eyes, look: -12 }) +
    baba({ x: 905, y: 548, s: 0.72, arms, eyes, look: -12 }) +
    popo({ x: 1040, y: 558, s: 0.66, arms, eyes, look: -12 }) +
    gonggong({ x: 1175, y: 560, s: 0.66, arms, eyes, look: -12 }) +
    cat({ x: 860, y: 660, s: 0.54, arms, eyes, look: -12 }) +
    bear({ x: 1060, y: 660, s: 0.58, arms, eyes, look: -12 })
  );
}

/** Page 12: everyone behind the table. */
function dinner(after, extra) {
  const eyes = after ? "happy" : "dot";
  const arms = after ? "up" : "down";
  const people =
    mama({ x: 345, y: 404, s: 0.46, arms, eyes, tall: 30 }) +
    baba({ x: 445, y: 400, s: 0.48, arms, eyes, tall: 30 }) +
    popo({ x: 545, y: 404, s: 0.46, arms, eyes, tall: 20 }) +
    gonggong({ x: 645, y: 404, s: 0.46, arms, eyes, tall: 20 }) +
    bunny({ x: 745, y: 404, s: 0.44, arms, eyes }) +
    cat({ x: 845, y: 404, s: 0.46, arms, eyes, tall: 20 }) +
    bear({ x: 945, y: 404, s: 0.46, arms, eyes, tall: 24 });
  return svg(
    room(),
    windowFrame(1010, 44, 220, 186, { leaves: extra === "window" }),
    tree({ x: 3, y: 4, w: 18, h: 40 }),
    people,
    rect(280, 424, 720, 34, C.white, 12, stroke()),
    rect(310, 458, 26, 130, C.wood, 6, stroke()),
    rect(944, 458, 26, 130, C.wood, 6, stroke()),
    turkey(442, 410),
    dumplingBowl(800, 404),
    pie(920, 410),
    vase(560, 424),
    candle(640, 424, extra === "candle"),
    after ? steam(442, 348, true) + steam(782, 356, true) : "",
    after ? star(300, 330, 12) + star(980, 318, 12) : "",
  );
}

/** Page 13: bedtime. */
function bedtime({ off = false, leaves = false, wiggle = false } = {}) {
  const lampLit = !off;
  return svg(
    room(),
    tree({ x: 3, y: 6, w: 16, h: 38 }),
    rect(330, 420, 50, 150, C.wood, 6, stroke()),
    lampLit ? ell(355, 260, 150, 150, C.lamp, 'opacity=".35"') : "",
    path("M292 300L320 196H390L418 300Z", lampLit ? C.lamp : C.woodLight, stroke()),
    path("M355 300V420", "none", stroke(12)),
    rect(500, 410, 480, 190, C.woodLight, 14, stroke()),
    rect(486, 340, 34, 270, C.wood, 10, stroke()),
    rect(960, 390, 34, 220, C.wood, 10, stroke()),
    ell(590, 430, 92, 48, C.white, stroke()),
    bunny({ x: 790, y: 500, s: 0.72, lean: -66, eyes: "sleep", look: -4 }),
    g(wiggle ? "translate(0 -12) rotate(-1.5 760 500)" : "", path("M640 462Q790 404 972 450V596H640Z", C.rug, stroke()), path("M640 500Q800 448 972 490", "none", stroke(4))),
    off ? rect(0, 0, W, H, "rgba(42,39,64,.74)") : "",
    windowFrame(860, 44, 270, 280, { leaves, night: true, dim: off }),
    !off ? "" : ell(995, 190, 210, 210, C.moon, 'opacity=".08"'),
  );
}

const PAGES = {
  "00": {
    background: svg(room(), rect(0, 0, W, FLOOR - 22, C.floorDark), path(`M0 ${FLOOR - 22}H${W}`, "none", stroke(5)), tree({ x: 3, y: 8, w: 30, h: 66 }, 7), bunny({ x: 1040, y: 620, s: 1.05, eyes: "happy", look: -10 })),
  },
  "01": {
    background: svg(room(), door(190, 110, 232, 450, { wreath: true }), windowFrame(712, 72, 366, 280), bunny({ x: 570, y: 610, look: 18 })),
    "scene-leaves": svg(room(), door(190, 110, 232, 450, { wreath: true }), windowFrame(712, 72, 366, 280, { leaves: true }), bunny({ x: 570, y: 610, look: 18, arms: "up", eyes: "happy" })),
    "door-wreath": svg(room(), door(190, 110, 232, 450, { wreath: true, wiggle: true }), windowFrame(712, 72, 366, 280), bunny({ x: 570, y: 610, look: 18 })),
  },
  "02": (() => {
    const rug = (w) => g(w ? "rotate(-2 650 650)" : "", ell(650, 648, 225, 40, C.rug, stroke()), ell(650, 648, 170, 26, C.pumpkin));
    const plate = ({ full = false, leaves = false, wiggle = false } = {}) =>
      svg(
        room(),
        rug(wiggle),
        windowFrame(...WINDOW, { leaves }),
        tree(TREE_LEFT),
        bunny({ x: 512, y: 610, look: 16, arms: full ? "up" : "down", eyes: full ? "happy" : "dot" }),
        mama({ x: 1040, y: 610, look: -14, arms: full ? "open" : "down" }),
        basket(780, 590, full),
      );
    return {
      background: plate(),
      "scene-basket": plate({ full: true }),
      "window-leaves": plate({ leaves: true }),
      "rug-wiggle": plate({ wiggle: true }),
    };
  })(),
  "03": thankPlate(0, 0, person.mama, { extras: [["window-leaves", "window"]] }),
  "04": thankPlate(1, 1, person.baba, { extras: [["window-leaves", "window"], ["bike-bell", "bell"]] }),
  "05": thankPlate(2, 2, person.popo, { extras: [["window-leaves", "window"], ["steam-puff", "steam"]] }),
  "06": thankPlate(3, 3, person.gonggong, { extras: [["window-leaves", "window"], ["watering-can", "can"]] }),
  "07": (() => {
    const plate = ({ open = false, leaves = false } = {}) =>
      svg(
        room(),
        windowFrame(256, 72, 282, 220, { leaves }),
        door(760, 110, 300, 450, { open }),
        open ? cat({ x: 905, y: 590, arms: "holdL", s: 0.9, look: -14 }) + pie(800, 442) : "",
        bunny({ x: 590, y: 610, look: 18, arms: open ? "up" : "down", eyes: open ? "happy" : "dot" }),
      );
    return { background: plate(), "scene-open": plate({ open: true }), "window-leaves": plate({ leaves: true }) };
  })(),
  "08": thankPlate(4, 4, person.cat, { extras: [["window-leaves", "window"], ["pie-steam", "steam"]] }),
  "09": thankPlate(5, 5, person.bear, { extras: [["window-leaves", "window"], ["park-ball", "ball"]] }),
  "10": {
    background: svg(room(), windowFrame(600, 44, 160, 150), tree(TREE_LEFT), group9(false), bunny({ x: 560, y: 610, look: 16 })),
    "scene-thanked": svg(room(), windowFrame(600, 44, 160, 150), tree(TREE_LEFT), group9(true), bunny({ x: 560, y: 610, look: 16, eyes: "happy", arms: "up" })),
  },
  "11": {
    background: svg(room(), tree({ x: 20, y: 6, w: 60, h: 70 }), bunny({ x: 1140, y: 610, s: 0.66, look: -16, arms: "up", eyes: "happy" })),
  },
  "12": {
    background: dinner(false),
    "scene-dinner": dinner(true),
    "window-leaves": dinner(false, "window"),
    "candle-flare": dinner(false, "candle"),
  },
  "13": {
    background: bedtime(),
    "scene-off": bedtime({ off: true }),
    "window-leaves": bedtime({ leaves: true }),
    "window-leaves-off": bedtime({ off: true, leaves: true }),
    "blanket-wiggle": bedtime({ wiggle: true }),
  },
};

// ── Output ──────────────────────────────────────────────────────────────────
const write = (rel, content) => {
  const f = resolve(ROOT, "public", rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, content);
};

let count = 0;
for (const [page, files] of Object.entries(PAGES)) {
  for (const [id, content] of Object.entries(files)) {
    // A plate that real art has replaced stays gone.
    if (existsSync(resolve(ROOT, "public", `pages/${page}/${id}.webp`))) continue;
    write(`pages/${page}/${id}.svg`, content);
    count++;
  }
}
for (const id of LEAF_ORDER) {
  write(
    `leaves/${id}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${path(LEAF_PATH, LEAF[id], stroke(5))}${path("M50 26L50 80M50 50L34 38M50 50L66 38", "none", stroke(3.5))}</svg>\n`,
  );
  count++;
}
console.log(`wrote ${count} SVGs`);
