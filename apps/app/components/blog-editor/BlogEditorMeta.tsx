'use client';

import React from 'react';

export type BlogPublishStatus = 'unsaved' | 'draft' | 'published';

export interface BlogEditorMetaProps {
  publishStatus: BlogPublishStatus;
  createdAt: Date | null;
  draftVersionNumber: number | null;
  publishedVersionNumber: number | null;
  lastDraftSavedAt: Date | null;
  lastPublishedAt: Date | null;
  unsavedChangesAt: Date | null;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

function fmt(date: Date | null): string {
  if (!date) return '—';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(!sameYear ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  });
}

const lineStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--muted-foreground, rgba(0,0,0,0.45))',
  lineHeight: '1.65',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const strong: React.CSSProperties = {
  color: 'var(--foreground, rgba(0,0,0,0.7))',
  fontWeight: 500,
};

export function BlogEditorMeta({
  createdAt,
  draftVersionNumber,
  publishedVersionNumber,
  lastDraftSavedAt,
  lastPublishedAt,
  saveStatus,
}: BlogEditorMetaProps) {
  const adminStatus: 'draft-ahead' | 'published' | 'draft-only' = (() => {
    if (!publishedVersionNumber) return 'draft-only';
    if (draftVersionNumber && draftVersionNumber > publishedVersionNumber) return 'draft-ahead';
    return 'published';
  })();

  const hasDraft = draftVersionNumber != null;
  const hasLive = publishedVersionNumber != null && lastPublishedAt != null;

  return (
    <div style={{ padding: '2px 24px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

      {/* Status indicator — only when relevant */}
      {adminStatus === 'draft-ahead' && (
        <div style={{ ...lineStyle, marginBottom: 1 }}>
          <span style={{ color: 'rgba(161,120,0,0.9)', fontWeight: 600 }}>🟡 Draft ahead of published</span>
        </div>
      )}
      {adminStatus === 'draft-only' && hasDraft && (
        <div style={{ ...lineStyle, marginBottom: 1 }}>
          <span style={{ color: 'rgba(107,114,128,0.75)', fontWeight: 600 }}>⚪ Not published yet</span>
        </div>
      )}

      {/* Draft line */}
      {hasDraft && (
        <div style={lineStyle}>
          <span style={strong}>Draft v{draftVersionNumber}</span>
          {saveStatus === 'saving' && <span style={{ color: 'rgba(161,120,0,0.8)' }}>{' · Saving…'}</span>}
          {saveStatus === 'error' && <span style={{ color: 'rgb(220,38,38)' }}>{' · Save failed'}</span>}
          {saveStatus !== 'saving' && saveStatus !== 'error' && lastDraftSavedAt && (
            <span>{' · Saved '}{fmt(lastDraftSavedAt)}</span>
          )}
        </div>
      )}

      {/* Live version line */}
      {hasLive && (
        <div style={lineStyle}>
          {'Live version: '}
          <span style={strong}>v{publishedVersionNumber}</span>
          {' · '}{fmt(lastPublishedAt)}
        </div>
      )}

      {/* Created line */}
      {createdAt && (
        <div style={lineStyle}>
          {'Created '}{fmt(createdAt)}
        </div>
      )}
    </div>
  );
}
