'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FilePlus2 } from 'lucide-react';
import { BlogEditorToolbarButton } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';
import { useBlogStore } from '@/stores/blogs/useBlogStore';
import type { BlogVersionSummary } from '@/types/blog';

// ── Types ─────────────────────────────────────────────────────────────────────

type NewDraftSource = 'empty' | 'current' | number;

// ── NewDraftModal ─────────────────────────────────────────────────────────────

function NewDraftModal({
  open,
  onClose,
  versions,
  onCreateDraft,
}: {
  open: boolean;
  onClose: () => void;
  versions: BlogVersionSummary[];
  onCreateDraft: (source: NewDraftSource) => Promise<void>;
}) {
  const [selected, setSelected] = useState<'empty' | 'current' | 'version'>('current');
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const sortedVersions = [...versions].sort(
    (a, b) => (b.version_number ?? 0) - (a.version_number ?? 0),
  );

  useEffect(() => {
    if (open) {
      setSelected('current');
      setSelectedVersionId(sortedVersions[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleCreate() {
    const source: NewDraftSource =
      selected === 'empty' ? 'empty' :
      selected === 'current' ? 'current' :
      selectedVersionId!;
    setCreating(true);
    try {
      await onCreateDraft(source);
      onClose();
    } finally {
      setCreating(false);
    }
  }

  if (!open || typeof document === 'undefined') return null;

  const OPTIONS = [
    {
      key: 'current' as const,
      label: 'Derive from current',
      desc: "Start from what's in the editor now",
    },
    {
      key: 'empty' as const,
      label: 'Empty draft',
      desc: 'Start with a blank slate',
    },
    {
      key: 'version' as const,
      label: 'From a saved version',
      desc: 'Pick any existing version as the base',
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-5">
        <h2 className="text-sm font-semibold mb-1">New draft version</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Choose what to base the new draft on
        </p>

        <div className="flex flex-col gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelected(opt.key)}
              className={`flex flex-col items-start text-left px-3 py-2.5 rounded-xl border transition-colors ${
                selected === opt.key
                  ? 'border-foreground bg-accent'
                  : 'border-border hover:bg-accent/50'
              }`}
            >
              <span className="text-xs font-medium">{opt.label}</span>
              <span className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>

        {selected === 'version' && (
          <div className="mt-3">
            {sortedVersions.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No saved versions yet</p>
            ) : (
              <select
                value={selectedVersionId ?? ''}
                onChange={(e) => setSelectedVersionId(Number(e.target.value))}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-background outline-none focus:border-ring transition-colors"
              >
                {sortedVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version_number}
                    {' — '}
                    {v.blog_title || 'Untitled'}
                    {' ('}
                    {v.status === 'committed' ? 'live' : v.status}
                    {')'}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || (selected === 'version' && !selectedVersionId)}
            className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            {creating ? 'Creating…' : 'Create draft'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── NewDraftButton ────────────────────────────────────────────────────────────

export function NewDraftButton() {
  const blogVersions = useBlogStore((s) => s.blogVersions);
  const newDraft = useBlogStore((s) => s.newDraft);
  const blog = useBlogStore((s) => s.blog);

  const [open, setOpen] = useState(false);

  return (
    <>
      <BlogEditorToolbarButton
        icon={<FilePlus2 size={16} />}
        title="New draft version"
        disabled={!blog?.id}
        onClick={() => setOpen(true)}
      />
      <NewDraftModal
        open={open}
        onClose={() => setOpen(false)}
        versions={blogVersions}
        onCreateDraft={async (source) => {
          await newDraft(source);
        }}
      />
    </>
  );
}
