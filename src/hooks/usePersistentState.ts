import { useCallback, useEffect, useState } from "react";

/**
 * useState backed by localStorage. Every access is wrapped in try/catch —
 * private mode / disabled storage must not break the book (PRD-style resilience).
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  parse: (raw: string) => T = JSON.parse,
  serialize: (v: T) => string = JSON.stringify,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : parse(raw);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(value));
    } catch {
      /* ignore */
    }
  }, [key, value, serialize]);

  const set = useCallback((v: T | ((prev: T) => T)) => setValue(v), []);
  return [value, set];
}
