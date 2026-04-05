'use client';

import React, { memo } from 'react';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FullscreenHeaderProps {
  /** Content-focus mode: "Done" button on the right */
  onDone?: () => void;
  /** Main-page mode: Back button on the left */
  onBack?: () => void;
  /** Main-page mode: Save draft button */
  onSave?: () => void;
  isSaving?: boolean;
  /** Main-page mode: Publish button */
  onPublish?: () => void;
  isPublishing?: boolean;
  /** Main-page mode: Unpublish button (only shown when blog is published) */
  onUnpublish?: () => void;
  /** Preview link — opens admin blog detail page in a new tab */
  previewHref?: string;
  title?: string;
  showCenteredTitle?: boolean;
  lastDraftSavedAt?: Date | null;
  draftVersionNumber?: number | null;
  publishedVersionNumber?: number | null;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

// ── Component ──────────────────────────────────────────────────────────────────

function fmtSaveTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const btnBase: React.CSSProperties = {
  height: 32,
  padding: '0 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  letterSpacing: '0.01em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

export const FullscreenHeader = memo(function FullscreenHeader({
  onDone,
  onBack,
  onSave,
  isSaving,
  onPublish,
  isPublishing,
  onUnpublish,
  previewHref,
  title,
  showCenteredTitle = true,
  lastDraftSavedAt,
  draftVersionNumber,
  publishedVersionNumber,
  saveStatus,
}: Readonly<FullscreenHeaderProps>) {
  const saveLabel = saveStatus === 'saving'
    ? 'Saving…'
    : lastDraftSavedAt
      ? `Autosaved${draftVersionNumber != null ? ` v${draftVersionNumber}` : ''} · ${fmtSaveTime(lastDraftSavedAt)}`
      : null;

  // Version status line: shown below save label in main mode
  const versionLine = (() => {
    if (draftVersionNumber == null) return null;
    if (publishedVersionNumber == null) return `Draft v${draftVersionNumber} · Not published`;
    if (draftVersionNumber === publishedVersionNumber) return `v${draftVersionNumber} · Published`;
    return `Draft v${draftVersionNumber} · Live: v${publishedVersionNumber}`;
  })();

  const isMainMode = !!onBack;

  return (
    <div
      style={{
        background: 'var(--background, #fff)',
        flexShrink: 0,
        borderBottom: '1px solid var(--border, rgba(0,0,0,.08))',
        position: 'relative',
      }}
    >
      <div
        data-fullscreen-header-inner
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 48,
          maxWidth: 720,
          margin: '0 auto',
          padding: '0 24px',
          background: 'var(--background, #fff)',
        }}
      >
        {/* Left side */}
        {isMainMode ? (
          <button
            type="button"
            onClick={onBack}
            style={{
              ...btnBase,
              padding: '0 10px 0 8px',
              border: '1px solid var(--border, rgba(0,0,0,.12))',
              background: 'transparent',
              color: 'var(--foreground, #111)',
            }}
          >
            <ChevronLeft size={15} strokeWidth={2.2} />
            Back
          </button>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {isMainMode ? (
            <>
              {onSave && (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  style={{
                    ...btnBase,
                    border: '1px solid var(--border, rgba(0,0,0,.12))',
                    background: 'transparent',
                    color: 'var(--foreground, #111)',
                    opacity: isSaving ? 0.5 : 1,
                  }}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              )}
              {previewHref && (
                <a
                  href={previewHref}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...btnBase,
                    border: '1px solid var(--border, rgba(0,0,0,.12))',
                    background: 'transparent',
                    color: 'var(--foreground, #111)',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={13} />
                  Preview
                </a>
              )}
              {onUnpublish && (
                <button
                  type="button"
                  onClick={onUnpublish}
                  style={{
                    ...btnBase,
                    border: '1px solid var(--border, rgba(0,0,0,.12))',
                    background: 'transparent',
                    color: 'var(--foreground, #111)',
                  }}
                >
                  Unpublish
                </button>
              )}
              <button
                type="button"
                onClick={onPublish}
                disabled={isPublishing}
                style={{
                  ...btnBase,
                  border: 'none',
                  background: 'var(--foreground, #111)',
                  color: 'var(--background, #fff)',
                  opacity: isPublishing ? 0.7 : 1,
                }}
              >
                {isPublishing ? '…' : 'Publish'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDone}
              style={{
                ...btnBase,
                border: 'none',
                background: 'var(--foreground, #111)',
                color: 'var(--background, #fff)',
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>

      {showCenteredTitle && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 48, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            initial={{ y: -6, opacity: 0, scale: 1.05 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            style={{ pointerEvents: 'none', textAlign: 'center', maxWidth: '60%', overflow: 'hidden' }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground, #111)', lineHeight: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'New Blog'}</div>
            {saveLabel && (
              <div style={{ fontSize: 10, color: 'var(--muted-foreground, rgba(0,0,0,0.4))', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {saveLabel}
              </div>
            )}
            {!saveLabel && versionLine && (
              <div style={{ fontSize: 10, color: 'var(--muted-foreground, rgba(0,0,0,0.4))', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {versionLine}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
});
