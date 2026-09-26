# Scene art

One folder per step. `00` is the title card; `01`–`12` are the story pages
(PRD.md §5). Every file is referenced from `src/book.ts`. Until a file exists,
the app shows a labelled placeholder box with its id (milestone M0).

| Folder | Files |
|---|---|
| `00` | `background.webp` (小兔 in her scarf beside the full six-leaf tree) |
| `01` | `background.webp`, `scene-leaves.webp`, `door-wreath.webp` |
| `02` | `background.webp` (bare tree), `scene-basket.webp`, `window-leaves.webp`, `rug-wiggle.webp` |
| `03`–`06`, `08` | `background.webp` (bare tree, 小兔 holding the leaf, person with prop), `scene-thanked.webp` (person's reaction), plus that page's extras |
| `07` | `background.webp`, `scene-open.webp` (小猫 with the pie), `window-leaves.webp` |
| `09` | `background.webp` (the whole family, right), `scene-thanked.webp` |
| `10` | `background.webp` (the tree, large) |
| `11` | `background.webp`, `scene-dinner.webp`, `window-leaves.webp`, `candle-flare.webp` |
| `12` | `background.webp`, `scene-off.webp`, `window-leaves.webp`, `window-leaves-off.webp`, `blanket-wiggle.webp` |

**Draw the tree bare on every plate.** Leaves are composited in code from
`/public/leaves/{red,orange,yellow,green,brown,golden}.webp` (transparent) so the
count carries over page to page. Each page's `tree.area` in `book.ts` must be
re-measured to the tree's box on the real art, and `SLOTS` in
`src/components/ThankfulTree.tsx` nudged onto the branches.
