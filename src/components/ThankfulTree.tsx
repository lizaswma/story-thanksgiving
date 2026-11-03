import { useState, type CSSProperties } from "react";
import type { Tree } from "../types";
import { LEAVES, leafSrc } from "../book";

// Where each leaf sits on the tree, as % of the tree's area (PRD §9.4). Index
// matches LEAVES: six colored leaves spread over the branches, the golden one
// at the top. Fitted to the real thank-you tree (pages 3–10).
const SLOTS = [
  { x: 22, y: 40 },
  { x: 76, y: 36 },
  { x: 32, y: 18 },
  { x: 66, y: 14 },
  { x: 50, y: 46 },
  { x: 7, y: 43 },
  { x: 50, y: 6 },
];

/** A leaf's slot on the stage, in % of the stage. */
export function slotOnStage(tree: Tree, i: number) {
  const s = SLOTS[i];
  return {
    x: tree.area.x + (s.x / 100) * tree.area.w,
    y: tree.area.y + (s.y / 100) * tree.area.h,
  };
}

/**
 * One paper leaf. Shows /leaves/<id>.webp once it exists; until then a flat
 * leaf shape in the leaf's placeholder color (milestone M0).
 */
function Leaf({
  i,
  style,
  className = "",
  num,
}: {
  i: number;
  style: CSSProperties;
  className?: string;
  /** Counting page: the numeral shown just under this leaf. */
  num?: number;
}) {
  const leaf = LEAVES[i];
  const [missing, setMissing] = useState(false);
  return (
    <span
      className={`leaf ${className}`}
      style={{ ...style, "--leaf": leaf.color } as CSSProperties}
      data-leaf={leaf.id}
    >
      {missing ? (
        <span className="leaf-shape" />
      ) : (
        <img src={leafSrc(leaf.id)} alt="" draggable={false} onError={() => setMissing(true)} />
      )}
      {num !== undefined && <b className="count-num leaf-num">{num}</b>}
    </span>
  );
}

/**
 * The thankful tree's leaves, composited over the page art (PRD §5: leaves
 * carry over page to page). `shown` leaves sit in their slots; `flying`, if
 * set, is the one arcing in from `from` right now; the first `counted` leaves
 * light up with a numeral (page 10).
 */
export function ThankfulTree({
  tree,
  shown,
  flying,
  from,
  counted = 0,
  glowing = false,
}: {
  tree: Tree;
  shown: number;
  flying?: number;
  from?: { x: number; y: number };
  counted?: number;
  glowing?: boolean;
}) {
  return (
    <div className={`thankful-tree ${glowing ? "is-glowing" : ""}`} aria-hidden="true">
      {Array.from({ length: shown }).map((_, i) => {
        const at = slotOnStage(tree, i);
        const isFlying = i === flying && from;
        // Leaves scale down with a small tree (pages 11–12) so it isn't crowded,
        // but stay capped on the big counting-page tree.
        const big = "big" in LEAVES[i];
        const size = { width: `${Math.min(tree.area.w * (big ? 0.32 : 0.22), big ? 10 : 7)}%` };
        const style = isFlying
          ? ({
              ...size,
              left: `${at.x}%`,
              top: `${at.y}%`,
              "--sx": `${from.x}%`,
              "--sy": `${from.y}%`,
              "--tx": `${at.x}%`,
              "--ty": `${at.y}%`,
              // Arc peak: halfway across, lifted above the higher of the two ends.
              "--mx": `${(from.x + at.x) / 2}%`,
              "--my": `${Math.min(from.y, at.y) - 12}%`,
            } as CSSProperties)
          : { ...size, left: `${at.x}%`, top: `${at.y}%` };
        return (
          <Leaf
            key={i}
            i={i}
            style={style}
            className={`${isFlying ? "is-flying" : ""} ${i < counted ? "is-counted" : ""}`}
            num={i < counted ? i + 1 : undefined}
          />
        );
      })}
    </div>
  );
}
