'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { BlogEditorToolbarButton } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';
import {
  BlogEditorToolbarPopover,
  BlogEditorToolbarPopoverTrigger,
  BlogEditorToolbarPopoverContent,
} from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarPopover';
import { useBlogStore } from '@/stores/blogs/useBlogStore';

export function UrlSlugButton() {
  const blogName = useBlogStore((s) => s.blog?.blog_name ?? null);
  const getPreviewSlug = useBlogStore((s) => s.getPreviewSlug);
  const checkSlugAvailable = useBlogStore((s) => s.checkSlugAvailable);
  const renameBlogName = useBlogStore((s) => s.renameBlogName);

  const previewSlug = getPreviewSlug();
  const currentSlug = blogName ?? previewSlug ?? '';

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setInput(currentSlug);
      setStatus('idle');
    }
  }, [open, currentSlug]);

  const handleInputChange = useCallback(
    (val: string) => {
      setInput(val);
      setStatus('idle');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!val || val === currentSlug) return;
      setStatus('checking');
      debounceRef.current = setTimeout(async () => {
        const ok = await checkSlugAvailable(val);
        setStatus(ok ? 'available' : 'taken');
      }, 500);
    },
    [currentSlug, checkSlugAvailable],
  );

  const canSave =
    input && input !== currentSlug && (status === 'available' || status === 'idle') && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await renameBlogName(input);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BlogEditorToolbarPopover open={open} onOpenChange={setOpen}>
      <BlogEditorToolbarPopoverTrigger>
        <BlogEditorToolbarButton icon={<Link2 size={18} />} title="URL slug" />
      </BlogEditorToolbarPopoverTrigger>
      <BlogEditorToolbarPopoverContent side="top" className="w-72">
        <p className="text-xs text-muted-foreground font-medium pb-2">URL slug</p>
        {previewSlug && !blogName && (
          <p className="text-[11px] text-muted-foreground mb-2">
            Preview (not saved yet):{' '}
            <span className="font-mono">{previewSlug}</span>
          </p>
        )}
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) =>
              handleInputChange(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '-')
                  .replace(/--+/g, '-'),
              )
            }
            placeholder="url-slug"
            className={`w-full text-xs px-2 py-1.5 rounded border bg-background font-mono outline-none transition-colors ${
              status === 'available'
                ? 'border-green-500'
                : status === 'taken'
                ? 'border-red-400'
                : 'border-border focus:border-ring'
            }`}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px]">
              {status === 'checking' && (
                <span className="text-muted-foreground">● Checking…</span>
              )}
              {status === 'available' && (
                <span className="text-green-600 dark:text-green-400">✓ Available</span>
              )}
              {status === 'taken' && (
                <span className="text-red-500">✕ Used by a published blog — choose a different slug</span>
              )}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] px-2 py-1 rounded border border-border bg-transparent hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="text-[11px] px-2 py-1 rounded bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </BlogEditorToolbarPopoverContent>
    </BlogEditorToolbarPopover>
  );
}
