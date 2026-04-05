'use client';

import React, { useState, useRef, useCallback } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { usePublisher, saveImage$ } from '@mdxeditor/editor';
import { Upload } from 'lucide-react';
import { ImageButton } from './ImageButton';

export function ImageButtonAdapter() {
  const saveImage = usePublisher(saveImage$);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setUrl('');
    setAltText('');
    setFile(null);
    setTab('url');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) reset();
  }, [reset]);

  const handleInsert = useCallback(() => {
    if (tab === 'url') {
      const trimmed = url.trim();
      if (!trimmed) return;
      saveImage({ src: trimmed, altText: altText.trim() || undefined });
    } else {
      if (!file) return;
      const dt = new DataTransfer();
      dt.items.add(file);
      saveImage({ file: dt.files, altText: altText.trim() || undefined });
    }
    handleOpenChange(false);
  }, [tab, url, altText, file, saveImage, handleOpenChange]);

  const canInsert = tab === 'url' ? !!url.trim() : !!file;

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Trigger asChild>
        <span onMouseDown={(e) => e.preventDefault()}>
          <ImageButton onClick={() => setOpen(true)} />
        </span>
      </RadixDialog.Trigger>

      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[100000] bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          className="fixed left-1/2 top-1/2 z-[100001] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-5 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            setTimeout(() => urlInputRef.current?.focus(), 0);
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <RadixDialog.Title className="text-sm font-semibold mb-4">
            Insert image
          </RadixDialog.Title>

          {/* Tab switcher */}
          <div className="flex rounded-lg border border-border overflow-hidden mb-4 text-xs">
            <button
              type="button"
              onClick={() => setTab('url')}
              className={`flex-1 py-1.5 transition-colors ${tab === 'url' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setTab('upload')}
              className={`flex-1 py-1.5 transition-colors ${tab === 'upload' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}
            >
              Upload
            </button>
          </div>

          {tab === 'url' ? (
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-1.5">Image URL</label>
              <input
                ref={urlInputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); if (canInsert) handleInsert(); }
                  if (e.key === 'Escape') { e.preventDefault(); handleOpenChange(false); }
                }}
                placeholder="https://example.com/image.png"
                className="w-full rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
              />
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-1.5">Image file</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-border bg-accent/30 hover:bg-accent/50 transition-colors px-3 py-4 text-sm text-muted-foreground flex flex-col items-center gap-1.5"
              >
                <Upload size={18} />
                <span>{file ? file.name : 'Click to select image'}</span>
                {file && <span className="text-xs opacity-60">{(file.size / 1024).toFixed(1)} KB</span>}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1.5">Alt text <span className="opacity-50">(optional)</span></label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image"
              className="w-full rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex justify-end gap-2">
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
              onClick={handleInsert}
              disabled={!canInsert}
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
