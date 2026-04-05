'use client';

import React, { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import { BlogEditorToolbarButton } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';
import {
  BlogEditorToolbarPopover,
  BlogEditorToolbarPopoverTrigger,
  BlogEditorToolbarPopoverContent,
} from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarPopover';
import { useBlogStore } from '@/stores/blogs/useBlogStore';

export function TagsButton() {
  const tags = useBlogStore((s) => s.blog?.tags ?? '');
  const saveTags = useBlogStore((s) => s.saveTags);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setInput(tags);
  }, [open, tags]);

  const tagList = input.split(',').map((t) => t.trim()).filter(Boolean);

  function removeTag(tag: string) {
    const updated = tagList.filter((t) => t !== tag).join(', ');
    setInput(updated);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveTags(input.trim());
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BlogEditorToolbarPopover open={open} onOpenChange={setOpen}>
      <BlogEditorToolbarPopoverTrigger>
        <BlogEditorToolbarButton icon={<Tag size={16} />} title="Tags" />
      </BlogEditorToolbarPopoverTrigger>
      <BlogEditorToolbarPopoverContent side="top" className="w-72">
        <p className="text-xs text-muted-foreground font-medium pb-2">Tags</p>
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tagList.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent text-foreground"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="opacity-60 hover:opacity-100 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="tag1, tag2, tag3"
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background outline-none focus:border-ring transition-colors"
        />
        <p className="text-[11px] text-muted-foreground mt-1">Comma-separated</p>
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
            disabled={saving || input.trim() === tags}
            className="text-[11px] px-2 py-1 rounded bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </BlogEditorToolbarPopoverContent>
    </BlogEditorToolbarPopover>
  );
}
