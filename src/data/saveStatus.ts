import { useSyncExternalStore } from 'react';

/** Tracks the last failed write so the UI can show "Kaydedilemedi · Tekrar dene". */
interface SaveState {
  error: string | null;
  retry: (() => void) | null;
}

let state: SaveState = { error: null, retry: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function reportSaveError(message: string, retry: () => void) {
  state = { error: message, retry };
  emit();
}

export function clearSaveError() {
  state = { error: null, retry: null };
  emit();
}

export function useSaveStatus(): SaveState & { dismiss: () => void } {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  return { ...s, dismiss: clearSaveError };
}

/**
 * Run a write without blocking the UI. With the offline cache, writes made while offline stay
 * queued and are sent later; only real failures (e.g. permission denied) end up here.
 */
export function fireAndReport(label: string, op: () => Promise<unknown>): void {
  const run = () => {
    op().then(clearIfSame, (err) => {
      console.error(label, err);
      reportSaveError('Kaydedilemedi.', run);
    });
  };
  const clearIfSame = () => {
    if (state.retry === run) clearSaveError();
  };
  run();
}
