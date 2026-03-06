'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useLexicalComposerContext as useLobehubContext } from '@lobehub/editor';
import type { LexicalEditor } from 'lexical';

interface KernelLike {
  getLexicalEditor(): LexicalEditor | null;
  on(event: string, handler: (editor: LexicalEditor) => void): void;
  off(event: string, handler: (editor: LexicalEditor) => void): void;
}

/**
 * A @lobehub/editor plugin that captures the underlying Lexical editor instance
 * and stores it in the provided React ref for use outside the editor context.
 * Add this to the AnyEditor `plugins` array.
 */
export function EditorBridgePlugin({
  editorRef,
}: {
  editorRef: RefObject<LexicalEditor | null>;
}) {
  const lobehubCtx = useLobehubContext();
  const kernel = Array.isArray(lobehubCtx) ? (lobehubCtx[0] as KernelLike) : null;

  useEffect(() => {
    if (!kernel) return;
    const existing = kernel.getLexicalEditor?.();
    if (existing) {
      editorRef.current = existing;
      return;
    }
    const handler = (editor: LexicalEditor) => {
      editorRef.current = editor;
    };
    kernel.on('initialized', handler);
    return () => kernel.off('initialized', handler);
  }, [kernel, editorRef]);

  return null;
}
