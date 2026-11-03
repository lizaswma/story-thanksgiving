# Scene art

One folder per step. `00` is the title card; `01`–`13` are the story pages
(PRD.md §5). Every file is referenced from `src/book.ts`.

**The current `.svg` plates are vector layout art** from
`node tools/make-layout-art.mjs`: edit the script, not the SVGs. Real art (M2)
replaces them page by page as `.webp`: add the page to `REAL_ART_PAGES` in
`book.ts` and delete the plates it replaces (the script skips any plate that
has a `.webp`). Pages 3–6 and 8–11 have real art so far; the prompts live in
`little-rabbit-style/tools/scenes-thanksgiving.json`.

| Folder | Files |
|---|---|
| `00` | `background` (小兔 in her scarf beside the full seven-leaf tree) |
| `01` | `background`, `scene-leaves`, `door-wreath` |
| `02` | `background` (bare tree), `scene-basket`, `window-leaves`, `rug-wiggle` |
| `03`–`06`, `08`, `09` | `background` (bare tree, 小兔 holding the leaf, person with prop), `scene-thanked` (person's reaction), plus that page's extras |
| `07` | `background`, `scene-open` (小猫 with the pie), `window-leaves` |
| `10` | `background` (the whole group, right), `scene-thanked` |
| `11` | `background` (the tree, large) |
| `12` | `background`, `scene-dinner`, `window-leaves`, `candle-flare` |
| `13` | `background`, `scene-off`, `window-leaves`, `window-leaves-off`, `blanket-wiggle` |

**Draw the tree bare on every plate.** Leaves are composited in code from
`/public/leaves/{red,orange,yellow,green,brown,purple,golden}` (transparent) so the
count carries over page to page. Each page's `tree.area` in `book.ts` must be
re-measured to the tree's box on the real art, and `SLOTS` in
`src/components/ThankfulTree.tsx` nudged onto the branches.
