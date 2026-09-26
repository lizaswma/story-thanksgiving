import { useState, type CSSProperties } from "react";
import type { Asset } from "../types";

/**
 * Renders one stacked art layer. Until real PNGs exist the image 404s and we
 * show a labelled placeholder box instead (PRD §8.3, milestone M0).
 */
export function Layer({
  asset,
  className = "",
  hidden = false,
  style,
}: {
  asset: Asset;
  className?: string;
  hidden?: boolean;
  style?: CSSProperties;
}) {
  const [missing, setMissing] = useState(false);

  return (
    <div
      className={`layer ${asset.className ?? ""} ${className}`}
      data-layer={asset.id}
      hidden={hidden}
      style={style}
    >
      {!missing && (
        <img
          src={asset.src}
          alt={asset.alt ?? ""}
          draggable={false}
          onError={() => setMissing(true)}
        />
      )}
      {missing && <span className="layer-placeholder">{asset.id}</span>}
    </div>
  );
}
