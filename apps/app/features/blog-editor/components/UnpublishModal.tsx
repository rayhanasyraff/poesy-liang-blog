'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useBlogStore } from '@/stores/blogs/useBlogStore';

export interface UnpublishModalProps {
  open: boolean;
  isUnpublishing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = iso.includes(' ') && !iso.includes('T') ? iso.replace(' ', 'T') + 'Z' : iso;
    return new Date(d).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function statusLabel(s: string): string {
  return (s === 'committed' || s === 'published') ? 'published' : 'draft';
}

export function UnpublishModal({ open, isUnpublishing, onConfirm, onClose }: UnpublishModalProps) {
  const blogVersions = useBlogStore((s) => s.blogVersions);
  const sorted   = [...blogVersions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));
  const fallback = sorted[0] ?? null;

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !isUnpublishing && onClose()}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-5">
        <h2 className="text-sm font-semibold mb-1">Unpublish this blog?</h2>
        <p className="text-xs text-muted-foreground mb-4">
          This will remove the blog from public view. It will return to draft status using the latest saved version.
        </p>

        {fallback && (
          <>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">
              Will revert to
            </p>
            <div className="rounded-xl border border-border bg-accent/40 px-3 py-2.5 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">v{fallback.version_number}</span>
                <span className={`inline-block px-1.5 py-px rounded text-[10px] font-medium ${
                  (fallback.status === 'committed' || fallback.status === 'published')
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                }`}>
                  {statusLabel(fallback.status)}
                </span>
              </div>
              <div className="text-xs text-foreground mt-0.5 truncate">{fallback.blog_title || 'Untitled'}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {fmtDate(fallback.draft_saved_at ?? fallback.published_at ?? fallback.created_at)}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUnpublishing}
            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isUnpublishing}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {isUnpublishing ? 'Unpublishing…' : 'Unpublish'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
