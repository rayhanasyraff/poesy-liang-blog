'use client';

import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { BlogEditorToolbarButton } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';
import {
  BlogEditorToolbarPopover,
  BlogEditorToolbarPopoverTrigger,
  BlogEditorToolbarPopoverContent,
} from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarPopover';
import { useBlogStore } from '@/stores/blogs/useBlogStore';

// ── Helper ────────────────────────────────────────────────────────────────────

function toInputValue(raw: string): string {
  if (!raw) return '';
  try {
    const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

// ── PublishedDateButton ───────────────────────────────────────────────────────

export function PublishedDateButton() {
  const publishedDate = useBlogStore((s) => s.blog?.blog_date_published ?? '');
  const savePublishedDate = useBlogStore((s) => s.savePublishedDate);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setInput(toInputValue(publishedDate));
  }, [open, publishedDate]);

  const currentInputValue = toInputValue(publishedDate);

  async function handleSave() {
    setSaving(true);
    try {
      await savePublishedDate(input);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BlogEditorToolbarPopover open={open} onOpenChange={setOpen}>
      <BlogEditorToolbarPopoverTrigger>
        <BlogEditorToolbarButton icon={<Calendar size={16} />} title="Published date" />
      </BlogEditorToolbarPopoverTrigger>
      <BlogEditorToolbarPopoverContent side="top" className="w-72">
        <p className="text-xs text-muted-foreground font-medium pb-2">Published date</p>
        {!publishedDate && (
          <p className="text-[11px] text-muted-foreground mb-2">
            Will be set automatically when published
          </p>
        )}
        <input
          type="datetime-local"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background outline-none focus:border-ring transition-colors"
        />
        <div className="flex justify-end gap-1.5 mt-2">
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
            disabled={saving || input === currentInputValue}
            className="text-[11px] px-2 py-1 rounded bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </BlogEditorToolbarPopoverContent>
    </BlogEditorToolbarPopover>
  );
}
