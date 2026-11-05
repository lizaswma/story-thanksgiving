# Scene art

One folder per step. `00` is the title card; `01`–`13` are the story pages
(PRD.md §5). Every file is referenced from `src/book.ts`.

**Every plate is real art (M2), as `.webp`.** The prompts live in
`little-rabbit-style/tools/scenes-thanksgiving.json` and the approved plates in
`little-rabbit-style/scenes/approved/thanksgiving/`. Most plates are edits of
the approved page 3 room, so the wall, floor, tree and 小兔 match across pages.
A few are put together in code there instead, so they stay pixel-identical:

- `tools/compose-p11.py`: page 11, page 3's tree centred in the empty room.
- `tools/compose-wall-tree.py`: pages 12–13, the tree scaled down high on the
  wall; also page 13's lamp-off plate (the lamp-on one darkened to night).
- `tools/compose-title.py`: the title card's leaves, and 小兔 on page 11.
- `tools/compose-windows.py`: every `window-leaves` flash, from one day and
  one night edit pasted into each page's window.
- `tools/cut-leaves.py`: the seven `/public/leaves/` from one leaf sheet.

`node tools/make-layout-art.mjs` still draws the old vector layout art, but
only for a plate that has no `.webp`, which is none of them now.

| Folder | Files |
|---|---|
| `00` | `background` (小兔 beside the full seven-leaf tree; leaves baked in) |
| `01` | `background`, `scene-leaves`, `door-wreath` |
| `02` | `background` (bare tree), `scene-basket`, `window-leaves` |
| `03`–`06`, `08`, `09` | `background` (bare tree, 小兔 holding the leaf, person with prop), `scene-thanked` (person's reaction), plus that page's extras |
| `07` | `background`, `scene-open` (小猫 with the pie), `window-leaves` |
| `10` | `background` (the whole group, right), `scene-thanked` |
| `11` | `background` (the tree, centred; 小兔 cheering) |
| `12` | `background`, `scene-dinner`, `window-leaves`, `candle-flare` |
| `13` | `background`, `scene-off`, `window-leaves`, `window-leaves-off`, `blanket-wiggle` |

**The tree is bare on every story plate.** Leaves are composited in code from
`/public/leaves/{red,orange,yellow,green,brown,purple,golden}.webp`
(transparent) so the count carries over page to page. Each page's `tree.area`
in `book.ts` is the tree's box on its plate, and `SLOTS` in
`src/components/ThankfulTree.tsx` sit on the branches.

Extras ("flash" plates) are full-frame edits shown for a moment through a
feathered mask around the tapped thing (`focus`, defaulting to the hotspot), so
only that area of each flash plate ever shows.
