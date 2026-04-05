'use client';

import React, { useState, useRef, useCallback } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { useCellValues, activeEditor$ } from '@mdxeditor/editor';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isLinkNode } from '@lexical/link';
import { $getSelection, $isRangeSelection } from 'lexical';
import { ExternalLink } from 'lucide-react';
import { LinkButton } from './LinkButton';

export function LinkButtonAdapter() {
  const [editor] = useCellValues(activeEditor$);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const savedSelectionRef = useRef<{ url: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = useCallback(() => {
    if (!editor) return;

    // Read current link URL (if cursor is on a link) before opening dialog
    let existingUrl = '';
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const nodes = selection.getNodes();
      const node = nodes[0];
      if (!node) return;
      const parent = node.getParent();
      if (parent && $isLinkNode(parent)) {
        existingUrl = parent.getURL();
      } else if ($isLinkNode(node)) {
        existingUrl = (node as any).getURL?.() ?? '';
      }
    });

    savedSelectionRef.current = { url: existingUrl };
    setUrl(existingUrl);
    setOpen(true);
  }, [editor]);

  const handleApply = useCallback(() => {
    if (!editor) return;
    const trimmed = url.trim();
    editor.focus(() => {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, trimmed || null);
    });
    setOpen(false);
    setUrl('');
  }, [editor, url]);

  const handleRemove = useCallback(() => {
    if (!editor) return;
    editor.focus(() => {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    });
    setOpen(false);
    setUrl('');
  }, [editor]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setUrl('');
  }, []);

  const hasExistingLink = !!savedSelectionRef.current?.url;

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Trigger asChild>
        <span onMouseDown={(e) => e.preventDefault()}>
          <LinkButton onClick={handleOpen} />
        </span>
      </RadixDialog.Trigger>

      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[100000] bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          className="fixed left-1/2 top-1/2 z-[100001] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-5 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            // Focus the input after a tick so animation completes
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <RadixDialog.Title className="text-sm font-semibold mb-4">
            {hasExistingLink ? 'Edit link' : 'Insert link'}
          </RadixDialog.Title>

          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1.5">URL</label>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleApply(); }
                if (e.key === 'Escape') { e.preventDefault(); handleOpenChange(false); }
              }}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {hasExistingLink && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="text-xs px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Remove
                </button>
              )}
              {url.trim() && (
                <a
                  href={url.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={12} />
                  Open
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <RadixDialog.Close asChild>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </RadixDialog.Close>
              <button
                type="button"
                onClick={handleApply}
                disabled={!url.trim()}
                className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
              >
                Apply
              </button>
            </div>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
