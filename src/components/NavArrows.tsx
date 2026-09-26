import { useBook } from "../context/BookContext";
import { LAST_PAGE_INDEX } from "../book";

/** Large bottom-corner page-turn arrows (PRD §7.1). No auto-advance. */
export function NavArrows() {
  const { pageIndex, goPrev, goNext } = useBook();

  return (
    <>
      <button
        type="button"
        className="nav-arrow nav-prev"
        onClick={goPrev}
        hidden={pageIndex === 0}
        aria-label="Previous page"
      >
        ‹
      </button>
      <button
        type="button"
        className="nav-arrow nav-next"
        onClick={goNext}
        hidden={pageIndex >= LAST_PAGE_INDEX}
        aria-label="Next page"
      >
        ›
      </button>
    </>
  );
}
