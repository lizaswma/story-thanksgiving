import { useBook } from "../context/BookContext";
import { PAGES } from "../book";

/** Subtle progress indicator — visible to the parent, not a child tap target (PRD §7.1). */
export function ProgressDots() {
  const { pageIndex } = useBook();
  if (pageIndex === 0) return null;

  return (
    <div className="progress-dots" aria-hidden="true">
      {PAGES.map((p) => (
        <span
          key={p.id}
          className={`dot ${p.id === pageIndex ? "current" : ""} ${
            p.id < pageIndex ? "done" : ""
          }`}
        />
      ))}
    </div>
  );
}
