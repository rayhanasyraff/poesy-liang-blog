'use client';

import { useCallback, useRef } from 'react';
import { useEditorToolbarStore } from '@/stores/useEditorToolbarStore';

// ── useEditorFocusMode ─────────────────────────────────────────────────────────
// Manages the "content focus" mode where the editor expands fullscreen and the
// title / meta strip are hidden. Extracted from BlogEditor.tsx lines 199–248.

export function useEditorFocusMode(bodyWrapperRef: React.RefObject<HTMLDivElement | null>) {
  const isContentFocused  = useEditorToolbarStore((s) => s.isContentFocused);
  const setContentFocused = useEditorToolbarStore((s) => s.setContentFocused);

  // Prevents re-entering focus mode during the "Done" animation
  const suppressRef = useRef(false);

  const focusBody = useCallback(() => {
    const ce = bodyWrapperRef.current?.querySelector<HTMLElement>('[contenteditable]');
    try { (ce as any)?.focus?.({ preventScroll: true }); } catch { ce?.focus(); }
  }, [bodyWrapperRef]);

  const enterFocusMode = useCallback(() => {
    if (isContentFocused) return;
    setContentFocused(true);
  }, [isContentFocused, setContentFocused]);

  const handleDone = useCallback(() => {
    setContentFocused(false);
    suppressRef.current = true;
    setTimeout(() => {
      focusBody();
      setTimeout(() => { suppressRef.current = false; }, 50);
    }, 260);
  }, [focusBody, setContentFocused]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (suppressRef.current) return;
    if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return;
    enterFocusMode();
  }, [enterFocusMode]);

  const onFocus = useCallback((e: React.FocusEvent) => {
    if (suppressRef.current) return;
    if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return;
    enterFocusMode();
  }, [enterFocusMode]);

  return { isContentFocused, focusBody, handleDone, suppressRef, onPointerDown, onFocus };
}
