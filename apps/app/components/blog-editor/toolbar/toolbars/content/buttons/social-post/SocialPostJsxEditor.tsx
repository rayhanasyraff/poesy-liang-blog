'use client';

import React, { useState, useRef, useCallback } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { useMdastNodeUpdater, useLexicalNodeRemove, type JsxEditorProps } from '@mdxeditor/editor';
import { Pencil, Trash2 } from 'lucide-react';
import { detectPlatform } from '@/components/social-post/detect';
import SocialPost from '@/components/social-post/SocialPost';

// ── Editor node component ─────────────────────────────────────────────────────

export function SocialPostJsxEditor({ mdastNode }: JsxEditorProps) {
  const updateMdastNode = useMdastNodeUpdater();
  const removeNode = useLexicalNodeRemove();

  const currentUrl: string = (() => {
    const attr = (mdastNode.attributes as any[]).find((a: any) => a.name === 'url');
    if (!attr) return '';
    const val = attr.value;
    return typeof val === 'string' ? val : (val?.value ?? '');
  })();

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenEdit = useCallback(() => {
    setUrl(currentUrl);
    setError('');
    setSaving(false);
    setOpen(true);
  }, [currentUrl]);

  const handleSave = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const p = detectPlatform(trimmed);
    if (p === 'unknown') {
      setError('Unsupported URL.');
      return;
    }
    setSaving(true);
    updateMdastNode({
      attributes: [{ type: 'mdxJsxAttribute', name: 'url', value: trimmed }],
    } as any);
    setOpen(false);
    setSaving(false);
  }, [url, updateMdastNode]);

  return (
    <>
      <div
        className="group"
        style={{ position: 'relative', display: 'block', width: '100%', margin: '1rem 0' }}
      >
        {/* Actual embed preview */}
        <SocialPost url={currentUrl} />

        {/* Hover toolbar */}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1 py-1 rounded-lg bg-background/95 backdrop-blur-sm border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title="Edit post URL"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleOpenEdit}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            title="Delete"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => removeNode()}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Edit dialog */}
      <RadixDialog.Root open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-[100000] bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <RadixDialog.Content
            className="fixed left-1/2 top-1/2 z-[100001] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-5 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            onOpenAutoFocus={(e) => { e.preventDefault(); setTimeout(() => inputRef.current?.focus(), 0); }}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <RadixDialog.Title className="text-sm font-semibold mb-4">Edit social post</RadixDialog.Title>
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-1.5">Post URL</label>
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); if (url.trim() && !saving) handleSave(); }
                  if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
                }}
                placeholder="https://x.com/user/status/..."
                className="w-full rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
              />
              {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <RadixDialog.Close asChild>
                <button type="button" disabled={saving} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40">
                  Cancel
                </button>
              </RadixDialog.Close>
              <button
                type="button"
                onClick={handleSave}
                disabled={!url.trim() || saving}
                className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </>
  );
}
