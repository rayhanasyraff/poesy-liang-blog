'use client';

import React, { useState, useRef, useCallback } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { usePublisher, insertJsx$ } from '@mdxeditor/editor';
import { Loader2, Upload } from 'lucide-react';

async function uploadVideoFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.url as string;
}

export function VideoButtonAdapter() {
  const insertJsxNode = usePublisher(insertJsx$);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setUrl('');
    setFile(null);
    setTab('url');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) reset();
  }, [reset]);

  const handleInsert = useCallback(async () => {
    if (tab === 'url') {
      const trimmed = url.trim();
      if (!trimmed) return;
      insertJsxNode({ kind: 'flow', name: 'Video', props: { url: trimmed } });
      handleOpenChange(false);
    } else {
      if (!file) return;
      setUploading(true);
      try {
        const uploadedUrl = await uploadVideoFile(file);
        insertJsxNode({ kind: 'flow', name: 'Video', props: { url: uploadedUrl } });
        handleOpenChange(false);
      } catch (err) {
        console.error('Video upload failed', err);
      } finally {
        setUploading(false);
      }
    }
  }, [tab, url, file, insertJsxNode, handleOpenChange]);

  const canInsert = tab === 'url' ? !!url.trim() : !!file;

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Trigger asChild>
        <button
          type="button"
          title="Insert video"
          onMouseDown={(e) => e.preventDefault()}
          className="h-8 w-8 flex items-center justify-center rounded-full flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M3 8C3 6.89543 3.89543 6 5 6H13C14.1046 6 15 6.89543 15 8V16C15 17.1046 14.1046 18 13 18H5C3.89543 18 3 17.1046 3 16V8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </RadixDialog.Trigger>

      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[100000] bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          className="fixed left-1/2 top-1/2 z-[100001] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-5 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onOpenAutoFocus={(e) => { e.preventDefault(); setTimeout(() => urlInputRef.current?.focus(), 0); }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <RadixDialog.Title className="text-sm font-semibold mb-4">Insert video</RadixDialog.Title>

          <div className="flex rounded-lg border border-border overflow-hidden mb-4 text-xs">
            <button type="button" onClick={() => setTab('url')}
              className={`flex-1 py-1.5 transition-colors ${tab === 'url' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}>
              URL / Embed
            </button>
            <button type="button" onClick={() => setTab('upload')}
              className={`flex-1 py-1.5 transition-colors ${tab === 'upload' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}>
              Upload
            </button>
          </div>

          {tab === 'url' ? (
            <div className="mb-4">
              <label htmlFor="video-url-input" className="block text-xs text-muted-foreground mb-1.5">YouTube URL or video file URL</label>
              <input
                id="video-url-input"
                ref={urlInputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); if (canInsert && !uploading) handleInsert(); }
                  if (e.key === 'Escape') { e.preventDefault(); handleOpenChange(false); }
                }}
                placeholder="https://youtube.com/watch?v=... or .mp4"
                className="w-full rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
              />
            </div>
          ) : (
            <div className="mb-4">
              <label htmlFor="video-file-input" className="block text-xs text-muted-foreground mb-1.5">Video file</label>
              <button type="button" onClick={() => !uploading && fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-lg border border-dashed border-border bg-accent/30 hover:bg-accent/50 transition-colors px-3 py-4 text-sm text-muted-foreground flex flex-col items-center gap-1.5 disabled:pointer-events-none">
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                <span>{uploading ? 'Uploading…' : file ? file.name : 'Click to select video'}</span>
                {file && !uploading && <span className="text-xs opacity-60">{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
              </button>
              <input id="video-file-input" ref={fileInputRef} type="file" accept="video/*" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <RadixDialog.Close asChild>
              <button type="button" disabled={uploading}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40">
                Cancel
              </button>
            </RadixDialog.Close>
            <button type="button" onClick={handleInsert} disabled={!canInsert || uploading}
              className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none">
              {uploading ? 'Uploading…' : 'Insert'}
            </button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
