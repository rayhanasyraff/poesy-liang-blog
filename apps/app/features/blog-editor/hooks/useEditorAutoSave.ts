'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useBlogStore } from '@/stores/blogs/useBlogStore';

// ── useEditorAutoSave ──────────────────────────────────────────────────────────
// Schedules a debounced draft save (800 ms) and a debounced unsaved-indicator
// update (300 ms) after each content change from the MDX editor.
// Title-change saves are handled separately via useEffect in BlogEditorPageTitle.

export function useEditorAutoSave() {
  const timerRef        = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unsavedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setUnsavedChangesAt = useBlogStore((s) => s.setUnsavedChangesAt);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { useBlogStore.getState().saveDraft(); }, 800);

    if (unsavedTimerRef.current) clearTimeout(unsavedTimerRef.current);
    unsavedTimerRef.current = setTimeout(() => { setUnsavedChangesAt(new Date()); }, 300);
  }, [setUnsavedChangesAt]);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (unsavedTimerRef.current) clearTimeout(unsavedTimerRef.current);
  }, []);

  useEffect(() => cancel, [cancel]);

  return { schedule, cancel };
}
