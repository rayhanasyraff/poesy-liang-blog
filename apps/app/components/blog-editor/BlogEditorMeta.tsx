'use client';

import React from 'react';

export type BlogPublishStatus = 'unsaved' | 'draft' | 'published';

export interface BlogEditorMetaProps {
  publishStatus: BlogPublishStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
  versionNumber: number | null;
  lastDraftSavedAt: Date | null;
  lastPublishedAt: Date | null;
}

function fmt(date: Date | null, fallback: string): string {
  if (!date) return fallback;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(!sameYear ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <span style={{ color: 'var(--muted-foreground, rgba(0,0,0,0.4))', fontSize: 11 }}>{label}</span>
      <span style={{ color: 'var(--foreground, rgba(0,0,0,0.65))', fontSize: 11, fontWeight: 500 }}>{value}</span>
    </span>
  );
}

function Dot() {
  return <span style={{ color: 'var(--muted-foreground, rgba(0,0,0,0.25))', fontSize: 11, flexShrink: 0 }}>·</span>;
}

const STATUS_STYLE: Record<BlogPublishStatus, { label: string; bg: string; color: string }> = {
  unsaved:   { label: 'Unsaved',   bg: 'rgba(107,114,128,0.1)', color: 'rgba(107,114,128,0.9)' },
  draft:     { label: 'Draft',     bg: 'rgba(234,179,8,0.12)',  color: 'rgba(161,120,0,0.95)'  },
  published: { label: 'Published', bg: 'rgba(34,197,94,0.12)',  color: 'rgb(21,128,61)'        },
};

function StatusBadge({ status }: { status: BlogPublishStatus }) {
  const { label, bg, color } = STATUS_STYLE[status];
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 7px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      background: bg,
      color,
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

export function BlogEditorMeta({
  publishStatus,
  createdAt,
  updatedAt,
  versionNumber,
  lastDraftSavedAt,
  lastPublishedAt,
}: BlogEditorMetaProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '4px 8px',
      padding: '4px 24px 8px',
      flexShrink: 0,
    }}>
      <StatusBadge status={publishStatus} />
      <Dot />
      <MetaItem label="Created"   value={fmt(createdAt,        '—')} />
      <Dot />
      <MetaItem label="Updated"   value={fmt(updatedAt,        '—')} />
      <Dot />
      <MetaItem label="Version"   value={versionNumber != null ? `v${versionNumber}` : '—'} />
      <Dot />
      <MetaItem label="Draft"     value={fmt(lastDraftSavedAt, 'Not saved as draft yet')} />
      <Dot />
      <MetaItem label="Published" value={fmt(lastPublishedAt,  'Not published yet')} />
    </div>
  );
}
