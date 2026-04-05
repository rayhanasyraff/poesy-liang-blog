'use client';

import React, { useState, useRef, useCallback } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import {
  useMdastNodeUpdater,
  useLexicalNodeRemove,
  type JsxEditorProps,
} from '@mdxeditor/editor';
import { Pencil, Trash2, Upload } from 'lucide-react';
import { getYouTubeId, getVimeoId, isDirectVideo } from '@/components/video-player/utils';

async function uploadVideoFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.url as string;
}

function VideoPreview({ url }: { url: string }) {
  if (!url) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)', opacity: 0.6 }}>No video URL set</span>
      </div>
    );
  }

  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}?rel=0`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ width: '100%', height: '100%', border: 0 }}
      />
    );
  }

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}`}
        title="Vimeo video"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        style={{ width: '100%', height: '100%', border: 0 }}
      />
    );
  }

  if (isDirectVideo(url)) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={url} controls style={{ width: '100%', height: '100%', background: '#000' }} />
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)', textAlign: 'center', wordBreak: 'break-all' }}>{url}</span>
    </div>
  );
}

export function VideoJsxEditor({ mdastNode }: JsxEditorProps) {
  const updateMdastNode = useMdastNodeUpdater();
  const removeNode = useLexicalNodeRemove();

  // Read current url attribute — handle both string and expression-object values
  const currentUrl: string = (() => {
    const attr = (mdastNode.attributes as any[]).find((a: any) => a.name === 'url');
    if (!attr) return '';
    const val = attr.value;
    return typeof val === 'string' ? val : (val?.value ?? '');
  })();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleOpenEdit = useCallback(() => {
    setUrl(currentUrl);
    setTab('url');
    setFile(null);
    setSaving(false);
    setOpen(true);
  }, [currentUrl]);

  const applyUrl = useCallback((newUrl: string) => {
    updateMdastNode({
      attributes: [{ type: 'mdxJsxAttribute', name: 'url', value: newUrl }],
    } as any);
  }, [updateMdastNode]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (tab === 'url') {
        const trimmed = url.trim();
        if (!trimmed) return;
        applyUrl(trimmed);
        setOpen(false);
      } else {
        if (!file) return;
        const uploadedUrl = await uploadVideoFile(file);
        applyUrl(uploadedUrl);
        setOpen(false);
      }
    } catch (err) {
      console.error('Video save failed', err);
    } finally {
      setSaving(false);
    }
  }, [tab, url, file, applyUrl]);

  const canSave = tab === 'url' ? !!url.trim() : !!file;

  return (
    <>
      <div className="group" style={{ position: 'relative', display: 'block', width: '100%', margin: '1rem 0' }}>
        {/* Video preview — 16:9 aspect ratio */}
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <VideoPreview url={currentUrl} />
          </div>
        </div>

        {/* Toolbar: appears on group hover */}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1 py-1 rounded-lg bg-background/95 backdrop-blur-sm border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title="Edit video"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleOpenEdit}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            title="Delete video"
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
            onOpenAutoFocus={(e) => { e.preventDefault(); setTimeout(() => urlInputRef.current?.focus(), 0); }}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <RadixDialog.Title className="text-sm font-semibold mb-4">Edit video</RadixDialog.Title>

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
                <label className="block text-xs text-muted-foreground mb-1.5">YouTube URL or video file URL</label>
                <input
                  ref={urlInputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); if (canSave && !saving) handleSave(); }
                    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
                  }}
                  placeholder="https://youtube.com/watch?v=... or .mp4"
                  className="w-full rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-xs text-muted-foreground mb-1.5">Video file</label>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-border bg-accent/30 hover:bg-accent/50 transition-colors px-3 py-4 text-sm text-muted-foreground flex flex-col items-center gap-1.5">
                  <Upload size={18} />
                  <span>{file ? file.name : 'Click to select video'}</span>
                  {file && <span className="text-xs opacity-60">{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
                </button>
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <RadixDialog.Close asChild>
                <button type="button" disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40">
                  Cancel
                </button>
              </RadixDialog.Close>
              <button type="button" onClick={handleSave} disabled={!canSave || saving}
                className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </>
  );
}
