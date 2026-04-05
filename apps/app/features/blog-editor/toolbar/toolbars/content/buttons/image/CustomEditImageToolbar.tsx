'use client';

import React, { useState, useRef, useCallback } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { useCellValues, activeEditor$, imageUploadHandler$, $isImageNode } from '@mdxeditor/editor';
import { $getNodeByKey } from 'lexical';
import { Pencil, Trash2, Upload } from 'lucide-react';

export interface EditImageToolbarProps {
  nodeKey: string;
  imageSource: string;
  initialImagePath: string | null;
  title: string;
  alt: string;
  width?: number | 'inherit';
  height?: number | 'inherit';
}

export function CustomEditImageToolbar({
  nodeKey,
  imageSource,
  initialImagePath,
  title,
  alt,
}: EditImageToolbarProps) {
  const [editor, imageUploadHandler] = useCellValues(activeEditor$, imageUploadHandler$);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleOpenEdit = useCallback(() => {
    setUrl(initialImagePath ?? imageSource ?? '');
    setAltText(alt ?? '');
    setTab('url');
    setFile(null);
    setSaving(false);
    setOpen(true);
  }, [imageSource, initialImagePath, alt]);

  const handleDelete = useCallback(() => {
    if (!editor) return;
    editor.update(() => {
      $getNodeByKey(nodeKey)?.remove();
    });
  }, [editor, nodeKey]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    setSaving(true);
    try {
      if (tab === 'url') {
        const trimmed = url.trim();
        if (!trimmed) return;
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            node.setSrc(trimmed);
            node.setAltText(altText.trim() || '');
          }
        });
        setOpen(false);
      } else {
        if (!file || !imageUploadHandler) return;
        const uploadedUrl = await imageUploadHandler(file);
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            node.setSrc(uploadedUrl);
            node.setAltText(altText.trim() || '');
          }
        });
        setOpen(false);
      }
    } catch (err) {
      console.error('Image save failed', err);
    } finally {
      setSaving(false);
    }
  }, [editor, nodeKey, tab, url, altText, file, imageUploadHandler]);

  const handleOpenChange = useCallback((next: boolean) => {
    if (saving) return;
    setOpen(next);
  }, [saving]);

  const canSave = tab === 'url' ? !!url.trim() : !!file;

  return (
    <>
      {/* Toolbar: shown by MDXEditor when the image node is selected */}
      <div className="flex items-center gap-0.5 px-1 py-1 rounded-lg bg-background/95 backdrop-blur-sm border border-border shadow-lg">
        <button
          type="button"
          title="Edit image"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleOpenEdit}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          title="Delete image"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleDelete}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Edit dialog */}
      <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
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
              Edit image
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
              {imageUploadHandler && (
                <button
                  type="button"
                  onClick={() => setTab('upload')}
                  className={`flex-1 py-1.5 transition-colors ${tab === 'upload' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}
                >
                  Upload new
                </button>
              )}
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
                    if (e.key === 'Enter') { e.preventDefault(); if (canSave && !saving) handleSave(); }
                    if (e.key === 'Escape') { e.preventDefault(); handleOpenChange(false); }
                  }}
                  placeholder="https://example.com/image.png"
                  className="w-full rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-xs text-muted-foreground mb-1.5">Replace with file</label>
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
              <label className="block text-xs text-muted-foreground mb-1.5">
                Alt text <span className="opacity-50">(optional)</span>
              </label>
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
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </RadixDialog.Close>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
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
