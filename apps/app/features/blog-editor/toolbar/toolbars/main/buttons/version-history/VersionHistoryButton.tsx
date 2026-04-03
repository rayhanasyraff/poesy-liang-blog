'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { History } from 'lucide-react';
import { BlogEditorToolbarButton } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';
import { BlogEditorToolbarMenu } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenu';
import { BlogEditorToolbarMenuTrigger } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuTrigger';
import { BlogEditorToolbarMenuContent } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuContent';
import { BlogEditorToolbarMenuLabel } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuLabel';
import { BlogEditorToolbarMenuSeparator } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuSeparator';
import { useBlogStore } from '@/stores/blogs/useBlogStore';
import type { BlogVersionSummary } from '@/types/blog';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtV(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    let d = iso;
    if (d.includes(' ') && !d.includes('T')) d = d.replace(' ', 'T') + 'Z';
    return new Date(d).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function versionLabel(status: string) {
  if (status === 'committed' || status === 'published') return 'published';
  return 'draft';
}

function versionBadgeClass(status: string) {
  return status === 'committed' || status === 'published'
    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
    : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
}

// ── VersionSwitchModal ────────────────────────────────────────────────────────

function VersionSwitchModal({
  version,
  onConfirm,
  onClose,
  loading,
}: {
  version: BlogVersionSummary;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-5">
        <h2 className="text-sm font-semibold mb-1">Switch to this version?</h2>
        <p className="text-xs text-muted-foreground mb-4">
          This will create a new draft based on the selected version. Your current unsaved changes
          will remain in the version history.
        </p>

        <div className="rounded-xl border border-border bg-accent/40 px-3 py-2.5 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">v{version.version_number}</span>
            <span
              className={`inline-block px-1.5 py-px rounded text-[10px] font-medium ${versionBadgeClass(version.status)}`}
            >
              {versionLabel(version.status)}
            </span>
          </div>
          <div className="text-xs text-foreground mt-0.5 truncate">
            {version.blog_title || 'Untitled'}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {fmtV(version.draft_saved_at ?? version.published_at ?? version.created_at)}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? 'Switching…' : 'Use this version'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── VersionHistoryButton ──────────────────────────────────────────────────────

export function VersionHistoryButton() {
  const blogVersions = useBlogStore((s) => s.blogVersions);
  const fetchVersions = useBlogStore((s) => s.fetchVersions);
  const revertVersion = useBlogStore((s) => s.revertVersion);

  const sorted = [...blogVersions].sort((a, b) => b.version_number - a.version_number);
  const currentVersionId = sorted[0]?.id ?? null;

  const [pendingVersion, setPendingVersion] = useState<BlogVersionSummary | null>(null);
  const [switching, setSwitching] = useState(false);

  async function handleConfirmSwitch() {
    if (!pendingVersion) return;
    setSwitching(true);
    try {
      await revertVersion(pendingVersion.id);
      setPendingVersion(null);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <>
      <BlogEditorToolbarMenu onOpenChange={(open) => { if (open) fetchVersions(); }}>
        <BlogEditorToolbarMenuTrigger>
          <BlogEditorToolbarButton icon={<History size={18} />} title="Version history" />
        </BlogEditorToolbarMenuTrigger>
        <BlogEditorToolbarMenuContent side="top" className="w-80 py-1">
          <BlogEditorToolbarMenuLabel className="text-xs text-muted-foreground px-3 py-2">
            Version history
          </BlogEditorToolbarMenuLabel>
          <BlogEditorToolbarMenuSeparator />
          {!sorted.length ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No versions saved yet</div>
          ) : (
            sorted.map((v) => {
              const isCurrent = v.id === currentVersionId;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={isCurrent}
                  onClick={(e) => { e.stopPropagation(); setPendingVersion(v); }}
                  className={`w-full text-left flex items-start gap-2 px-3 py-2 transition-colors ${
                    isCurrent
                      ? 'opacity-60 cursor-default'
                      : 'hover:bg-accent cursor-pointer'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5 w-5 text-[11px] font-mono text-muted-foreground leading-tight">
                    v{v.version_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium truncate">
                        {v.blog_title || 'Untitled'}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-px rounded bg-foreground/10 text-foreground font-medium">
                          current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span
                        className={`inline-block px-1.5 py-px rounded text-[10px] font-medium ${versionBadgeClass(v.status)}`}
                      >
                        {versionLabel(v.status)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {fmtV(v.draft_saved_at ?? v.published_at ?? v.created_at)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </BlogEditorToolbarMenuContent>
      </BlogEditorToolbarMenu>

      {pendingVersion && (
        <VersionSwitchModal
          version={pendingVersion}
          onConfirm={handleConfirmSwitch}
          onClose={() => setPendingVersion(null)}
          loading={switching}
        />
      )}
    </>
  );
}
