import { useCallback, useEffect, useRef, useState } from 'react';
import { setDone } from '../data/actions';

export const UNDO_MS = 4000;

/**
 * "Completed" is local for 4 seconds so it can be undone ("Geri al"); then it is saved.
 * Pending completions are saved at once when the shell unmounts (sign-out) or the page is hidden.
 */
export function usePendingDone() {
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const timers = useRef(new Map<string, number>());

  const commit = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setDone(id, true);
    setPending((cur) => {
      if (!cur.has(id)) return cur;
      const next = new Set(cur);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (id: string) => {
      if (timers.current.has(id)) {
        window.clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        setPending((cur) => {
          const next = new Set(cur);
          next.delete(id);
          return next;
        });
        return;
      }
      timers.current.set(
        id,
        window.setTimeout(() => commit(id), UNDO_MS),
      );
      setPending((cur) => new Set(cur).add(id));
    },
    [commit],
  );

  /** Save every pending completion now. */
  const flush = useCallback(() => {
    [...timers.current.keys()].forEach(commit);
  }, [commit]);

  useEffect(() => {
    const map = timers.current;
    const saveAll = () => {
      map.forEach((t, id) => {
        window.clearTimeout(t);
        setDone(id, true);
      });
      map.clear();
    };
    const onHide = () => {
      saveAll();
      setPending(new Set());
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      saveAll();
    };
  }, []);

  return { pending, toggle, flush };
}
