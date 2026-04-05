'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '@/api/core/client';
import { useRouter } from 'next/navigation';
import type { BlogVersionSummary } from '@/types/blog';

interface VersionHistoryModalProps {
  blogId: number | null;
  blogTitle?: string;
  onClose: () => void;
  onEdited: () => void;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    let d = s;
    if (d.includes(' ') && !d.includes('T')) d = d.replace(' ', 'T') + 'Z';
    const date = new Date(d);
    if (isNaN(date.getTime())) return s;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return s;
  }
}

export function VersionHistoryModal({ blogId, blogTitle, onClose, onEdited }: VersionHistoryModalProps) {
  const router = useRouter();
  const [versions, setVersions] = useState<BlogVersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!blogId) { setVersions([]); return; }
    setLoading(true);
    apiClient.get(`/blogs/${blogId}/versions?limit=100&offset=0`)
      .then((res) => {
        const data: BlogVersionSummary[] = Array.isArray(res.data?.data) ? res.data.data : [];
        data.sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));
        setVersions(data);
      })
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [blogId]);

  const latestCommitted = versions.find((v) => v.status === 'committed' || v.status === 'published');

  const handlePublish = async (versionId: number) => {
    if (!blogId) return;
    setActionLoading(versionId);
    try {
      await apiClient.post(`/blogs/${blogId}/versions/${versionId}/publish`, {});
      onEdited();
      onClose();
    } catch (err) {
      console.error('Publish version failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (versionId: number) => {
    if (!blogId) return;
    setActionLoading(versionId);
    try {
      await apiClient.post(`/blogs/${blogId}/versions/${versionId}/revert`, {});
      onEdited();
      onClose();
    } catch (err) {
      console.error('Restore version failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = () => {
    if (!blogId) return;
    onClose();
    router.push(`/admin/blog/${blogId}/edit`);
  };

  const statusBadge = (v: BlogVersionSummary) => {
    const isLive = v.id === latestCommitted?.id;
    if (v.status === 'draft') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
          Draft
        </span>
      );
    }
    if (isLive) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
          Live
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        Archived
      </span>
    );
  };

  if (!mounted || blogId == null) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* panel */}
      <div className="relative w-full max-w-[600px] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <h2 className="font-semibold text-sm">
            {blogTitle ? `Version history — ${blogTitle}` : 'Version history'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors w-6 h-6 flex items-center justify-center rounded"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="overflow-auto max-h-[65vh] p-5">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-400" />
            </div>
          ) : versions.length === 0 ? (
            <p className="py-8 text-center text-neutral-400 text-sm">No versions found.</p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center gap-3 py-3">
                  <span className="w-10 text-sm font-mono font-semibold text-neutral-700 dark:text-neutral-300 shrink-0">
                    v{v.version_number}
                  </span>
                  <div className="w-20 shrink-0">{statusBadge(v)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-neutral-700 dark:text-neutral-300">{v.blog_title || 'Untitled'}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      Edited {fmtDate(v.draft_saved_at ?? v.created_at)}
                      {v.published_at ? ` · Published ${fmtDate(v.published_at)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {v.status === 'draft' && (
                      <>
                        <button
                          type="button"
                          onClick={handleEdit}
                          disabled={actionLoading != null}
                          className="text-xs px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePublish(v.id)}
                          disabled={actionLoading != null}
                          className="text-xs px-2.5 py-1 rounded border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === v.id ? '…' : 'Publish'}
                        </button>
                      </>
                    )}
                    {(v.status === 'committed' || v.status === 'published') && (
                      <button
                        type="button"
                        onClick={() => handleRestore(v.id)}
                        disabled={actionLoading != null}
                        className="text-xs px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === v.id ? '…' : 'Restore'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
