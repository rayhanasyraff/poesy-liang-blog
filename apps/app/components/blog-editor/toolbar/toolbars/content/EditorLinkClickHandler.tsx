'use client';

import { useEffect } from 'react';
import { useCellValues, activeEditor$ } from '@mdxeditor/editor';
import { CLICK_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical';

/**
 * Registers a Lexical CLICK_COMMAND handler so that clicking on a link node
 * in the editor opens the URL in a new tab.
 *
 * Must be rendered inside MDXEditor's toolbarPlugin React tree so that
 * editor signals (activeEditor$) are accessible.
 */
export function EditorLinkClickHandler() {
  const [editor] = useCellValues(activeEditor$);

  useEffect(() => {
    if (!editor) return;

    return editor.registerCommand(
      CLICK_COMMAND,
      (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const anchor = target.closest('a') as HTMLAnchorElement | null;
        if (!anchor) return false;

        const href = anchor.href || anchor.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href === 'javascript:void(0)') return false;

        event.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
        return false; // allow Lexical to continue handling (selection etc.)
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}
