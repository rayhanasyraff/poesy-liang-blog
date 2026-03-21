'use client';

import React, { useEffect, useState } from 'react';
import { AlignLeft } from 'lucide-react';
import { BlogEditorToolbarButton } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';
import {
  BlogEditorToolbarPopover,
  BlogEditorToolbarPopoverTrigger,
  BlogEditorToolbarPopoverContent,
} from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarPopover';
import { useBlogStore } from '@/stores/blogs/useBlogStore';

export function ExcerptButton() {
  const excerpt = useBlogStore((s) => s.blog?.blog_excerpt ?? '');
  const saveExcerpt = useBlogStore((s) => s.saveExcerpt);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [autoExcerpt, setAutoExcerpt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setInput(excerpt);
      setAutoExcerpt(useBlogStore.getState().getAutoExcerpt());
    }
  }, [open, excerpt]);

  const isCustom = input.trim() !== '';

  async function handleSave() {
    setSaving(true);
    try {
      await saveExcerpt(input.trim());
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await saveExcerpt('');
      setInput('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BlogEditorToolbarPopover open={open} onOpenChange={setOpen}>
      <BlogEditorToolbarPopoverTrigger>
        <BlogEditorToolbarButton icon={<AlignLeft size={18} />} title="Excerpt" />
      </BlogEditorToolbarPopoverTrigger>
      <BlogEditorToolbarPopoverContent side="top" className="w-80">
        <p className="text-xs text-muted-foreground font-medium pb-2">Excerpt</p>
        <textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={autoExcerpt || 'Write a short excerpt…'}
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background outline-none focus:border-ring transition-colors resize-none"
        />
        {!isCustom && autoExcerpt && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Auto: first 70 chars of content
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div>
            {isCustom && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                Reset to auto
              </button>
            )}
          </div>
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
              disabled={saving || input.trim() === excerpt}
              className="text-[11px] px-2 py-1 rounded bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </BlogEditorToolbarPopoverContent>
    </BlogEditorToolbarPopover>
  );
}
