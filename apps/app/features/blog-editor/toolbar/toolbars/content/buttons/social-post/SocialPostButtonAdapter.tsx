'use client';

import React, { useState, useRef, useCallback } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { usePublisher, insertJsx$ } from '@mdxeditor/editor';
import { detectPlatform, PLATFORM_LABELS } from '@/components/social-post/detect';

export function SocialPostButtonAdapter() {
  const insertJsxNode = usePublisher(insertJsx$);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setUrl('');
    setError('');
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) reset();
  }, [reset]);

  const handleInsert = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const platform = detectPlatform(trimmed);
    if (platform === 'unknown') {
      setError('Unsupported URL. Paste a link from X, Instagram, Facebook, TikTok, Pinterest, Threads, or BlueSky.');
      return;
    }
    if (platform === 'facebook' && /\/share\//.test(trimmed)) {
      setError('Facebook share links don\'t work with embeds. Click the post timestamp to get the direct URL (e.g. facebook.com/username/posts/...).');
      return;
    }
    insertJsxNode({ kind: 'flow', name: 'SocialPost', props: { url: trimmed } });
    handleOpenChange(false);
  }, [url, insertJsxNode, handleOpenChange]);

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Trigger asChild>
        <button
          type="button"
          title="Insert social media post"
          onMouseDown={(e) => e.preventDefault()}
          className="h-8 w-8 flex items-center justify-center rounded-full flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
        >
          {/* Share / social icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </RadixDialog.Trigger>

      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[100000] bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          className="fixed left-1/2 top-1/2 z-[100001] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-5 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onOpenAutoFocus={(e) => { e.preventDefault(); setTimeout(() => inputRef.current?.focus(), 0); }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <RadixDialog.Title className="text-sm font-semibold mb-1">Insert social post</RadixDialog.Title>
          <p className="text-xs text-muted-foreground mb-4">
            Supports: {Object.values(PLATFORM_LABELS).filter(l => l !== 'Social Post').join(', ')}
          </p>

          <div className="mb-4">
            <label htmlFor="social-url-input" className="block text-xs text-muted-foreground mb-1.5">Post URL</label>
            <input
              id="social-url-input"
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); if (url.trim()) handleInsert(); }
                if (e.key === 'Escape') { e.preventDefault(); handleOpenChange(false); }
              }}
              placeholder="https://x.com/user/status/..."
              className="w-full rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
            {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <RadixDialog.Close asChild>
              <button type="button" className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors">
                Cancel
              </button>
            </RadixDialog.Close>
            <button
              type="button"
              onClick={handleInsert}
              disabled={!url.trim()}
              className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
            >
              Insert
            </button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
