import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuadrantId } from '../types';

/** How much the hovered box's row and column grow (flex-grow; the others stay at 1). */
export const GROW = 1.7;

/**
 * Desktop hover growth of the matrix: the hovered box's row and column grow after a short delay
 * (160 ms from rest, 80 ms when moving between boxes, 180 ms before shrinking back on leave).
 * `disabled` (dragging, dialog open) keeps everything at rest without forgetting the hover.
 */
export function useHoverGrow(disabled: boolean) {
  const [hoverQ, setHoverQ] = useState<QuadrantId | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const current = useRef<QuadrantId | null>(null);

  const hoverTo = useCallback((q: QuadrantId | null, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      current.current = q;
      setHoverQ(q);
    }, delay);
  }, []);

  const enter = useCallback((q: QuadrantId) => hoverTo(q, current.current ? 80 : 160), [hoverTo]);
  const leave = useCallback(() => hoverTo(null, 180), [hoverTo]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const growOn = disabled ? null : hoverQ;
  return { growOn, enter, leave };
}
