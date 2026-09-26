import { useRef } from "react";

type Handlers = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

const THRESHOLD = 50; // px of horizontal travel to count as a swipe

/** Minimal horizontal swipe detection for page turns (PRD §7.1). */
export function useSwipe({ onSwipeLeft, onSwipeRight }: Handlers) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - s.x;
      const dy = touch.clientY - s.y;
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    },
  };
}
