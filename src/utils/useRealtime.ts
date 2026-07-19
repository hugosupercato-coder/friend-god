'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for real-time polling.
 * Calls `fn` immediately on mount, then every `intervalMs`.
 * Pauses automatically when the tab is hidden (document.hidden).
 */
export function useRealtime(fn: () => void, intervalMs: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    // Call immediately
    fnRef.current();

    const tick = () => {
      // Skip when tab is not visible to save API quota
      if (!document.hidden) {
        fnRef.current();
      }
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

/**
 * Hook that returns a countdown (seconds) until the next refresh.
 * Updates every second.
 */
export function useCountdown(intervalMs: number, lastUpdated: number): number {
  const getRemaining = useCallback(() => {
    const elapsed = Date.now() - lastUpdated;
    const remaining = Math.max(0, intervalMs - (elapsed % intervalMs));
    return Math.ceil(remaining / 1000);
  }, [intervalMs, lastUpdated]);

  return getRemaining();
}
