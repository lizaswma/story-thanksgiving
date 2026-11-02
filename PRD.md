# 小兔过感恩节 (Little Rabbit's Thanksgiving) — PRD

**Status:** M1 in progress (2026-11-02) — vector layout art, all SFX, scratch `zh` narration (free macOS voice); no paid models used yet
**Product:** Interactive storybook web app, book #3 in the 「小兔」 holiday series (after [小兔过万圣节](../story-halloween/PRD.md) and [小兔过中秋节](../story-mooncakes/PRD.md))
**Primary user:** A 2–3 year old, co-playing with a parent
**Author/owner:** liza@mamabuilds.dev

---

## 1. Vision

A cozy, tappable bedtime storybook about **saying thank you**. 妈妈 hangs a bare paper
"thankful tree" (感恩树) on the wall and brings a basket of colorful paper leaves. The
rule is simple: *say thank you, add a leaf.* 小兔 thanks each person in her life for one
thing they do with her — 妈妈, 爸爸, 婆婆, 公公, her friend 小猫, and 熊阿姨 — and each
thank-you sends a leaf of a new color up onto the tree. Then the family turns it around
and thanks 小兔, adding a golden leaf at the top. They count the seven leaves, sit down
to a big Thanksgiving dinner, and say good night.

Where book 1 was about *collecting* (count up to 6) and book 2 about *sharing* (count
down 4→1), this book is about **gratitude**: one repeatable, predictable pattern
(thank → leaf → reaction) that teaches **colors and counting up 1→7** through an act a
toddler can actually do themselves — saying 谢谢.

The golden-leaf twist on page 10 carries the emotional point for the parent: kindness
comes back to you.

The story is **told in Mandarin by default**, with a **parent-controlled toggle to
switch the whole book to English** (text and narration) — same mechanism as books 1–2.

小兔, the family, 小猫, and the full art/interaction pipeline are **reused from the
series**, per the locked [style bible](../little-rabbit-style/STYLE.md). This book adds
one costume (a small autumn scarf) and a set of new poses/props — no new characters.

## 2. Who we're designing for (2–3 years old)

Same facts as books 1–2 — cannot read, navigates by picture/sound/touch, tapping only
(no dragging), loves repetition of the same pattern more than novelty, no
winning/losing, short ~2–5 minute sittings, a parent co-reads and narrates.

Specific to this book:

- **The picture must show *why* 小兔 is saying thank you.** The child can't read "for
  reading to me," so each person holds or does the thing they're thanked for (a book, a
  bike helmet, a bowl of dumplings, a flower pot). The props are the story.
- **Colors are emerging vocabulary at this age.** Each leaf is one clear, named color,
  spoken in the read-aloud line alongside the running count.
- **"谢谢" is something the child already says.** The book invites the child to say it
  with 小兔 — the parent can pause on each thank-you page and let them.

## 3. Platform & tech stack

Same stack as books 1–2, reused wholesale:

| Area | Decision |
|---|---|
| Type | Web app, installable to iPad home screen (PWA), not a native app |
| Framework | React 18 (function components + hooks) + TypeScript |
| Build | Vite |
| Routing | None — single view, `pageIndex` state, optional `#p3` deep-link |
| PWA | `vite-plugin-pwa`, fully offline after first load, `display: standalone`, landscape |
| Audio | Howler.js, audio sprites for SFX |
| Animation | CSS transitions + keyframes |
| State | React context: `{ language, pageIndex, muted }`, persisted to `localStorage` |
| Backend | None |
| Reuse | Copy the `story-mooncakes` app shell (page engine, audio wrapper, PWA config, language context, `ExtraTap` handling) rather than rebuild it |

Target device: iPad (retina), with desktop Chrome/Safari for development.

## 4. Bilingual requirement (core feature)

Identical mechanism to books 1–2 — see [story-halloween PRD §4](../story-halloween/PRD.md)
for the full behavior spec. Key points carried over as-is:

- Default `zh`, opt-in `en`, toggle in a top-corner control + parent menu.
- `LocalizedText = { zh, en }`, one narration clip per page per language.
- Mandarin sentences 4–8 characters; English short and natural, not a literal gloss.
- Selection persists to `localStorage`.
- No pinyin in v1.

### 4.1 Secondary line: color + running count

Parallel to book 1's "不给糖就捣蛋！" and book 2's "谢谢小兔！还剩三块。", this book's
secondary line names the leaf's color **and** the running total, folded into the
read-aloud script (not only a numeral badge):

| Page | `zh` | `en` |
|---|---|---|
| 2 | 说声谢谢，贴片叶子。 | Say thank you, add a leaf. |
| 3 | 红叶子，一片！ | A red leaf. One! |
| 4 | 橙叶子，两片！ | An orange leaf. Two! |
| 5 | 黄叶子，三片！ | A yellow leaf. Three! |
| 6 | 绿叶子，四片！ | A green leaf. Four! |
| 8 | 棕叶子，五片！ | A brown leaf. Five! |
| 9 | 紫叶子，六片！ | A purple leaf. Six! |
| 10 | 金叶子，七片！ | A golden leaf. Seven! |

Page 2's line states the book's one rule, so the pattern is explicit before it starts.

## 5. Story structure (page-by-page)

13 pages + title card — one more than books 1–2, for the 熊阿姨 page.

**Title card:** 「小兔」系列 / The Little Rabbit Series — **小兔过感恩节 · Little
Rabbit's Thanksgiving** — 小兔 in her orange scarf beside a full, seven-leaf thankful
tree. Start: 开始 / Start.

| # | Beat | 中文 (4–8 字) | English | Tap interaction | SFX |
|---|---|---|---|---|---|
| 1 | Opening | 感恩节到了！ | It's Thanksgiving! | Tap window → autumn leaves drift down outside (swap to a falling-leaves variant) | soft wind chime |
| 2 | The tree | 妈妈拿来一篮树叶。 | Mama brings a basket of leaves. | Bare paper tree on the wall. Tap basket → colorful paper leaves pop up out of it (swap) | paper rustle |
| 3 | Thank 妈妈 | 谢谢妈妈给我读书！ | Thank you, Mama, for reading to me! | Tap the red leaf in 小兔's paws → it floats onto the tree, badge **1**; 妈妈 sets down her book and throws her arms open | leaf boop |
| 4 | Thank 爸爸 | 谢谢爸爸陪我骑车！ | Thank you, Baba, for biking with me! | Orange leaf → tree, badge **2**; 爸爸 (holding 小兔's little helmet, small bike beside him) goes hands-on-hips proud | leaf boop |
| 5 | Thank 婆婆 | 谢谢婆婆做好吃的！ | Thank you, Grandma, for yummy food! | Yellow leaf → tree, badge **3**; 婆婆 (apron, steaming bowl of dumplings) lifts the bowl, steam puffs | leaf boop |
| 6 | Thank 公公 | 谢谢公公陪我种花！ | Thank you, Grandpa, for gardening with me! | Green leaf → tree, badge **4**; the flower in 公公's pot pops into bloom and he tips his cap | leaf boop |
| 7 | Doorbell | 叮咚！小猫来了！ | Ding-dong! Mr. Cat is here! | Tap door → opens, 小猫 standing there holding a pumpkin pie (callback to his book-1 doorway) | doorbell + warm creak |
| 8 | Thank 小猫 | 谢谢小猫做我朋友！ | Thank you, Mr. Cat, for being my friend! | Brown leaf → tree, badge **5**; 小猫's tail swishes | leaf boop + purr |
| 9 | Thank 熊阿姨 | 谢谢熊阿姨带我去公园！ | Thank you, Ms. Bear, for taking me to the park! | Purple leaf → tree, badge **6**; 熊阿姨 (from book 1, holding a kite, park ball beside her) waves both paws, her book-1 pose | leaf boop |
| 10 | The twist | 大家说：谢谢小兔！ | Everyone says: Thank you, Little Rabbit! | 小兔's paws are empty. Tap the treetop → everyone adds a big **golden leaf** for her, badge **7**; 小兔 goes shy-happy | magical twinkle |
| 11 | Count | 数一数树叶。 | Let's count the leaves. | Tap each leaf (×7) → it lights up, voice counts 一…七 / one…seven, numeral appears | gentle count blips |
| 12 | Dinner | 一家人吃大餐！ | Time for the big dinner! | Tap table → dishes steam, everyone settles in: turkey, 婆婆's dumplings, 小猫's pie, 公公's flower in a vase as centerpiece | happy clink |
| 13 | Bedtime | 感恩节快乐，晚安！ | Happy Thanksgiving. Good night! | Tap lamp → room dims, the tree glows softly, 小兔 curls up asleep | lullaby sting |

Leaves carry over between pages the way book 1's stickers carry over on the bag: every
page after page 3 shows the tree with all leaves added so far.

## 6. Staging the thank-you pages

Pages 3, 4, 5, 6, 8, and 9 share **one fixed composition**. Only the person being thanked
changes. This makes the pattern predictable for the child and lets one background plate
serve all six pages.

```
┌──────────────────────────────────────────┐
│                                          │
│   🌳 tree            (leaf arcs ↖)        │
│   (fixed spot,                           │
│    fills up)         小兔       [person]   │
│                    holds leaf  with prop  │
│                                          │
│   ───────────── floor ─────────────────   │
│   [ main line  ·  color + count line ]    │
└──────────────────────────────────────────┘
```

- **Tree left**, same position and scale every page, visibly fuller each time.
- **小兔 centre**, facing right toward the person, holding up that page's leaf.
  Expression: *calm* before the tap, *shy/happy* after (locked `expressions.png`).
- **The person right**, and **only** that person — the others are off-page until
  page 10. The child always knows who "谢谢___" is for.
- **Eye-line:** 小兔 and the person look at each other.
- **Leaf path:** a gentle arc from 小兔's paws, over her head, to the tree — never
  crossing in front of the person's face.
- **Heights:** adults taller than 小兔; stooped 婆婆/公公 land near her eye level.
- **Before/after is one edit pass** on the same frame (book 2's `swap` technique), so
  the characters can't drift between states.

### 6.1 Per-person poses

Each person holds the prop that shows *why* they're thanked; the tap reaction reuses a
**locked signature pose** wherever possible.

| Page | Before tap (the reason) | After tap (the reaction) | New art |
|---|---|---|---|
| 3 · 妈妈 · reading | Holding an open picture book, turned to 小兔 | Book set down, **arms thrown open** (locked `mama.png` pose) | "holding book" pose |
| 4 · 爸爸 · biking | Holding 小兔's small helmet, little bike parked beside him | **Hands on hips**, proud (locked `baba.png` pose) | "holding helmet" pose, bike prop |
| 5 · 婆婆 · food | In an apron, holding a steaming bowl of dumplings | Lifts the bowl a little, steam puff, warm smile | apron + bowl pose |
| 6 · 公公 · gardening | Beside a flower pot (closed bud) with a tiny watering can, cap on, cane | Flower **pops into bloom**, he tips his cap | gardening pose, pot (bud/bloom), watering can |
| 8 · 小猫 · friend | Just inside the door, holding the pie from page 7 | Tail swish | pie-holding pose (shared with page 7) |
| 9 · 熊阿姨 · park | Holding a kite, park ball beside her | Waves both paws (book 1 `bear-wave` pose) | kite pose, kite + ball props; she has no locked reference yet, so add one to `character/cast/` from `story-halloween/public/pages/08/bear-wave.webp` |

### 6.2 Page 10 breaks the layout — on purpose

The first time the fixed composition changes: **all six** (妈妈, 爸爸, 婆婆, 公公, 小猫, 熊阿姨)
stand together on the right, 小兔 centre with empty paws, tree left. Because every prior
page showed exactly one person, the whole group appearing at once is the visual cue that
something is different. The golden leaf is noticeably larger than the six colored ones
and sits at the top of the tree.

## 7. Interactivity model

Reuses book 2's [data model](../story-mooncakes/src/types.ts) — `Page`, `Asset`,
`Hotspot`, `ExtraTap`, and the `swap` / `stick` kinds carry over unchanged.

The thank-you pages need one small addition. Book 1's `stick` puts a sprite onto a
collection with an optional count, but has no reaction layer; book 2's `swap` has a
reaction layer but no collection. A thank-you tap does both — a leaf joins the tree
**and** the person reacts — so this book adds:

```ts
| {
    /**
     * A thank-you: one leaf flies from 小兔's paws onto the tree (like `stick`
     * onto book 1's bag) AND the frame swaps to the person's reaction (like
     * `swap`). Pages 3, 4, 5, 6, 8, 9, 10.
     */
    kind: "thank";
    sfx: string;
    hotspot: Hotspot;
    /** Reaction layer shown after the tap (person's "after" pose). */
    to: string;
    /** Tree total AFTER this tap — 1..7. Picks the leaf (LEAVES[total-1]) and drives the badge. */
    total: number;
    /** Where the leaf starts its flight. Defaults to the hotspot centre (page 10: the group). */
    leafFrom?: { x: number; y: number };
    /** Speak the number and show a numeral badge. */
    counting?: boolean;
  }
```

The tree itself is page data, not an interaction: `Page.tree = { area, leaves,
glowOnOpen? }` gives the tree's box on that page's art and how many leaves are
already on it. Leaves are composited in code from `/public/leaves/<color>.webp`
(`src/components/ThankfulTree.tsx`), so every plate draws the tree bare.

Page 11 (count) is a plain `stick` with `counting: true`; on a page with a `tree`, each
tap lights up the next leaf and puts its numeral under it. Pages 1, 2, 7, 12, 13 are `swap`.

### 7.1 Secondary taps (easter eggs)

Same `ExtraTap` pattern as books 1–2: never required, always pleasant, repeatable.
Book 2's recurring moon becomes this book's recurring **falling leaves**: a
`window-leaves` extra on every page with a window in frame, as a quiet through-line.
**Not** on page 10 (protect the golden-leaf reveal) or page 11 (keep counting taps
unambiguous).

| # | Extras (flash / sfx) — *proposed, confirm against real art* |
|---|---|
| 1 | *(window is the main interaction)* · `door-wreath` / jingle |
| 2 | `window-leaves` / wind chime · `rug-wiggle` / soft whump |
| 3 | `window-leaves` / wind chime |
| 4 | `bike-bell` / ring-ring |
| 5 | `window-leaves` / wind chime · `steam-puff` / soft hiss |
| 6 | `watering-can` / trickle |
| 7 | `window-leaves` / wind chime |
| 8 | `pie-steam` / soft hiss |
| 9 | `window-leaves` / wind chime · `park-ball` / boing |
| 10 | *(none — protect the golden leaf)* |
| 11 | *(none — counting)* |
| 12 | `window-leaves` / wind chime · `candle-flare` / flare |
| 13 | `window-leaves` / wind chime (last appearance) · `blanket-wiggle` / soft whump |

### 7.2 Rules carried over

One interactive element per page (page 11's ×7 counting taps count as one). Tap
targets ≥120pt. Every tap does something pleasant, nothing is ever "incomplete."
Interactions are not gates. `prefers-reduced-motion` honored throughout (leaf arc
becomes a cross-fade onto the tree).

## 8. Navigation & UX

Identical to books 1–2 — large left/right arrows + swipe, no auto-advance, subtle
progress dots, narration auto-plays on page turn and replays on tap, global mute, small
gear-icon parent menu (language / mute / restart), series-branded title card. See
[story-halloween PRD §7](../story-halloween/PRD.md).

## 9. Art & asset pipeline

### 9.1 Character reuse

Nobody is redrawn. Every new pose/scene is generated from the locked references in
`little-rabbit-style/character/` (`hero.png`, `family/*.png`, `cast/cat.png`) per the
[style bible](../little-rabbit-style/STYLE.md) and `pipeline.md`. Watch for the
recurring **belly-patch** generation quirk on every rabbit render, and **no teeth** on
any smile.

### 9.2 New costume (series pack)

- **`character/costumes/scarf.png`** — a small knit scarf in warm orange (reuse the
  `pumpkin` `#EE9C53` token, `pumpkinShadow` for the knit shading — flat, no rendered
  texture), wrapped once around the neck line with a short tail. Face, both ears, arms,
  and feet stay fully visible. Worn on every page. Added to the style pack (series
  asset) with a `STYLE.md` §3 entry and `CHANGELOG.md` note, per the pack's rules.

### 9.3 New poses (this book's repo)

- 妈妈 holding an open picture book
- 爸爸 holding a small helmet
- 婆婆 in an apron holding a bowl of dumplings
- 公公 gardening beside a flower pot, watering can nearby
- 小猫 holding a pumpkin pie (pages 7, 8)
- 熊阿姨 holding a kite (page 9)
- 小兔 holding up a leaf (base pose, recolor/re-prop per page)
- Page 10 group: all six on the right, 小兔 centre
- Page 12 group: family, 小猫 + 熊阿姨 around the dinner table
- 小兔 curled asleep with scarf (page 13)

### 9.4 New props

- **Thankful tree** — bare paper tree on the wall; leaves composited in code (0–7),
  same approach as book 1's sticker bag
- **Leaves** — red, orange, yellow, green, brown, purple (same size), golden (larger)
- **Leaf basket** — empty-looking and full states
- **Small bike**, **helmet**, **picture book**, **dumpling bowl**, **flower pot** (bud +
  bloom), **watering can**, **pumpkin pie**, **kite**, **park ball**
- **Dinner table** — turkey, dumplings, pie, 公公's flower in a vase

### 9.5 Scene moods & specs

Almost entirely **cozy interior** (§4 of the style bible); page 13 is **bedtime**. One
background plate serves pages 3–6, 8 and 9. Same export specs as books 1–2 (2048px long
edge, 16:10 plates, PNG with alpha for layers, WebP for backgrounds) and the same
`public/pages/NN/`, `public/audio/{lang}/`, `public/sfx/` layout, plus
`public/leaves/`.

Leaf colors are scene colors, not character colors; they should sit in the palette's
warm autumn range and be clearly distinguishable from each other at iPad half-frame
(check red vs. orange and green vs. brown side by side before locking).

## 10. Resolved decisions

1. **Theme:** gratitude via a thankful tree (感恩树), chosen over table-setting and
   kitchen-helper concepts. Deliberately not a food-sharing story, to stay distinct
   from book 2.
2. **Who and why:** 妈妈 — reading to me · 爸爸 — biking with me · 婆婆 — yummy food ·
   公公 — gardening with me · 小猫 — being my friend · 熊阿姨 — taking me to the park. Taken from the child's real
   relationships.
3. **Golden-leaf twist:** kept. Everyone thanks 小兔 back on page 10, so the count
   ends at **7**.
4. **Math:** count up 1→7 with color names, one leaf per page, cumulative on the tree.
5. **Dinner:** turkey **plus** Chinese dishes (婆婆's dumplings), 小猫's pumpkin pie,
   and 公公's flower as the centerpiece — each earlier thank-you reappears at the table.
6. **Costume:** small orange autumn scarf, worn throughout; added to the series pack.
7. **Staging:** one fixed composition for all thank-you pages (tree left, 小兔 centre,
   one person right), broken on purpose for the page 10 group reveal.
8. **Page count:** 13 + title card; the 熊阿姨 page was added on top of the 12 used in books 1–2.

## 11. Open questions

- **Leaf shape:** simple maple leaves for all seven, or maple for the six and a heart-
  shaped golden leaf for 小兔? (Heart reads "love" to a parent; may be less legible as
  "a leaf" to a toddler.) Decide once candidates exist.
- **Page 3 reaction:** 妈妈's open-arms pose is the cheap locked option; an actual hug
  with 小兔 is warmer but needs a new two-character render. Try the locked pose first.
- **"棕叶子" (brown):** check at playtest that brown reads as a *happy* color on the
  tree rather than a dead leaf; fall back to purple or pink if it doesn't.

## 12. Non-goals (v1)

Same as books 1–2: pinyin, background music, accounts/sync, record-your-own narration,
analytics, native packaging, printing/PDF export. Also:

- A child-authored tree (child picks who to thank) — lovely, but breaks the fixed
  narration and the one-tap rule. Possible v2.
- Pilgrim/turkey costume or any historical Thanksgiving framing.

## 13. Milestones

| # | Deliverable |
|---|---|
| M0 | Scaffold: copy the `story-mooncakes` app shell; swap in this book's page + title data |
| M1 | Full content in Mandarin: all 13 pages, `zh` text, `zh` narration (scratch macOS voice), all SFX, the new `thank` kind + tree carry-over working with placeholder art |
| M2 | Real art: scarf costume locked in the style pack; tree + leaves; new poses and props; page 10 group; dinner table → layered exports wired in, hotspots measured against real art |
| M3 | Bilingual: `en` text + `en` narration + toggle, in-place language switch, persistence |
| M4 | Final voices: regenerate `zh` + `en` narration with the series' LLM voices |
| M5 | PWA polish: offline precache, install-to-home-screen, landscape lock, reduced-motion, mute, restart, title card |
| M6 | Playtest with the toddler; tune leaf colors, the page 10 twist, pacing so the child can say 谢谢 along |

## 14. Success criteria

- A parent can read the whole book to the child in one ~4-minute sitting.
- The child can trigger every page's interaction with a single tap, unassisted.
- By the third thank-you page, the child anticipates the pattern (reaches for the leaf
  before being prompted).
- The child can point at the person being thanked on each page without help.
- Switching 中 ⇄ EN changes every sentence and every narration line, with no loss of
  place.
- Works with the iPad in airplane mode after first load.
- The scarf costume and new family poses can be reused in a later book without
  redrawing.
