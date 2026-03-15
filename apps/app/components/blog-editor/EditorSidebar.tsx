'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Globe,
  Lock,
  Bell,
  BellOff,
  Heart,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { BlogSettings, BlogVersionSummary } from '@/types/blog';
import type { BlogPublishStatus } from './BlogEditorMeta';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(date: Date | null): string {
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

function fmtVersionDate(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    let d = s;
    if (d.includes(' ') && !d.includes('T')) d = d.replace(' ', 'T') + 'Z';
    const date = new Date(d);
    if (isNaN(date.getTime())) return s;
    return fmtDate(date);
  } catch { return s; }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--muted-foreground, rgba(0,0,0,0.35))',
      marginBottom: 8,
      paddingBottom: 4,
      borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
    }}>
      {children}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function InfoRow({ label, value, valueStyle }: { label: string; value: React.ReactNode; valueStyle?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--muted-foreground, rgba(0,0,0,0.45))', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground, rgba(0,0,0,0.8))', textAlign: 'right', ...valueStyle }}>{value}</span>
    </div>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  icon, label, enabled, onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 6px',
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        marginBottom: 2,
        color: enabled ? 'var(--foreground, #111)' : 'var(--muted-foreground, rgba(0,0,0,0.35))',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent, rgba(0,0,0,0.04))'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 12, textAlign: 'left' }}>{label}</span>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '1px 6px',
        borderRadius: 4,
        background: enabled ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.1)',
        color: enabled ? 'rgb(21,128,61)' : 'rgba(107,114,128,0.8)',
      }}>
        {enabled ? 'On' : 'Off'}
      </span>
    </button>
  );
}

// ── Slug section ──────────────────────────────────────────────────────────────

function SlugSection({
  blogName,
  isNewBlog,
  previewSlug,
  onCheckAvailable,
  onSave,
}: {
  blogName: string | null;
  isNewBlog: boolean;
  previewSlug?: string | null;
  onCheckAvailable?: (slug: string) => Promise<boolean>;
  onSave?: (slug: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [checkState, setCheckState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayed = blogName ?? previewSlug ?? '—';

  const startEdit = () => {
    setInput(blogName ?? '');
    setCheckState('idle');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setInput('');
    setCheckState('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const handleInput = (raw: string) => {
    const clean = slugify(raw);
    setInput(clean);
    if (!clean || clean === blogName) { setCheckState('idle'); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCheckState('checking');
    debounceRef.current = setTimeout(async () => {
      if (!onCheckAvailable) return;
      try {
        const available = await onCheckAvailable(clean);
        setCheckState(available ? 'available' : 'taken');
      } catch {
        setCheckState('error');
      }
    }, 500);
  };

  const handleSave = async () => {
    if (!input || checkState !== 'available' || !onSave) return;
    setSaving(true);
    try {
      await onSave(input);
      setEditing(false);
      setInput('');
      setCheckState('idle');
    } catch {
      // stay open on error
    } finally {
      setSaving(false);
    }
  };

  const canSave = !saving && !!input && checkState === 'available';

  return (
    <section>
      <SectionLabel>URL Slug</SectionLabel>
      {!editing ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--foreground, rgba(0,0,0,0.8))',
              wordBreak: 'break-all',
              fontFamily: 'ui-monospace, monospace',
            }}>
              {displayed}
            </div>
            {!isNewBlog && blogName && (
              <div style={{ fontSize: 11, color: 'var(--muted-foreground, rgba(0,0,0,0.4))', marginTop: 2 }}>
                /blog/{blogName}
              </div>
            )}
            {isNewBlog && (
              <div style={{ fontSize: 11, color: 'var(--muted-foreground, rgba(0,0,0,0.4))', marginTop: 2 }}>
                auto from title
              </div>
            )}
          </div>
          {!isNewBlog && onSave && (
            <button
              type="button"
              onClick={startEdit}
              style={{
                flexShrink: 0,
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid var(--border, rgba(0,0,0,0.1))',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--muted-foreground, rgba(0,0,0,0.5))',
              }}
            >
              Rename
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            autoFocus
            value={input}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit(); }}
            placeholder="url-slug"
            style={{
              width: '100%',
              fontSize: 12,
              padding: '4px 8px',
              borderRadius: 4,
              border: `1px solid ${
                checkState === 'taken' ? 'rgb(220,38,38)' :
                checkState === 'available' ? 'rgb(34,197,94)' :
                'var(--border, rgba(0,0,0,0.15))'
              }`,
              background: 'var(--background, #fff)',
              color: 'var(--foreground, #111)',
              fontFamily: 'ui-monospace, monospace',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {checkState === 'checking' && (
            <span style={{ fontSize: 11, color: 'var(--muted-foreground, rgba(0,0,0,0.4))' }}>● Checking…</span>
          )}
          {checkState === 'available' && (
            <span style={{ fontSize: 11, color: 'rgb(21,128,61)' }}>✓ Available</span>
          )}
          {checkState === 'taken' && (
            <span style={{ fontSize: 11, color: 'rgb(185,28,28)' }}>✕ Already taken</span>
          )}
          {checkState === 'error' && (
            <span style={{ fontSize: 11, color: 'var(--muted-foreground, rgba(0,0,0,0.4))' }}>Could not check</span>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                flex: 1,
                fontSize: 11,
                padding: '4px 0',
                borderRadius: 4,
                border: '1px solid var(--border, rgba(0,0,0,0.1))',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--muted-foreground, rgba(0,0,0,0.5))',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              style={{
                flex: 1,
                fontSize: 11,
                padding: '4px 0',
                borderRadius: 4,
                border: 'none',
                background: canSave ? 'var(--foreground, #111)' : 'rgba(0,0,0,0.1)',
                cursor: canSave ? 'pointer' : 'default',
                color: canSave ? 'var(--background, #fff)' : 'rgba(0,0,0,0.3)',
              }}
            >
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface EditorSidebarProps {
  publishStatus: BlogPublishStatus;
  createdAt: Date | null;
  lastDraftSavedAt: Date | null;
  lastPublishedAt: Date | null;
  draftVersionNumber: number | null;
  publishedVersionNumber: number | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  versions: BlogVersionSummary[];
  onFetchVersions: () => void;
  onVersionRevert: (versionId: number) => void;
  settings: BlogSettings;
  onSettingChange: (key: keyof BlogSettings, value: string) => void;
  onDeleteBlog?: () => void;
  currentBlogId?: number | string | null;
  blogName?: string | null;
  previewSlug?: string | null;
  onCheckSlugAvailable?: (slug: string) => Promise<boolean>;
  onRenameBlogName?: (newSlug: string) => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditorSidebar({
  publishStatus,
  createdAt,
  lastDraftSavedAt,
  lastPublishedAt,
  draftVersionNumber,
  publishedVersionNumber,
  saveStatus,
  versions,
  onFetchVersions,
  onVersionRevert,
  settings,
  onSettingChange,
  onDeleteBlog,
  currentBlogId,
  blogName,
  previewSlug,
  onCheckSlugAvailable,
  onRenameBlogName,
}: EditorSidebarProps) {
  const [versionsExpanded, setVersionsExpanded] = useState(false);

  // Derived admin status
  const adminStatus: 'draft-ahead' | 'published' | 'draft-only' = (() => {
    if (!publishedVersionNumber) return 'draft-only';
    if (draftVersionNumber && draftVersionNumber > publishedVersionNumber) return 'draft-ahead';
    return 'published';
  })();

  const statusInfo = {
    'draft-ahead': { label: 'Draft Ahead of Published', dot: '🟡', bg: 'rgba(234,179,8,0.12)', color: 'rgba(161,120,0,0.95)' },
    'published':   { label: 'Published', dot: '🟢', bg: 'rgba(34,197,94,0.12)', color: 'rgb(21,128,61)' },
    'draft-only':  { label: 'Draft Only', dot: '⚪', bg: 'rgba(107,114,128,0.08)', color: 'rgba(107,114,128,0.9)' },
  }[adminStatus];

  // Fetch versions when the versions section is expanded
  useEffect(() => {
    if (versionsExpanded && currentBlogId) {
      onFetchVersions();
    }
  }, [versionsExpanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const latestCommitted = [...versions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))
    .find(v => v.status === 'committed' || v.status === 'published');

  const saveLabel = (() => {
    if (saveStatus === 'saving') return '● Saving...';
    if (saveStatus === 'error') return '✕ Save failed';
    if (lastDraftSavedAt) return `✓ Saved ${fmtDate(lastDraftSavedAt)}`;
    return null;
  })();

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      borderLeft: '1px solid var(--border, rgba(0,0,0,0.07))',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '16px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      background: 'var(--background, #fff)',
    }}>

      {/* ── POST INFO ── */}
      <section>
        <SectionLabel>Post Info</SectionLabel>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px',
          borderRadius: 999,
          background: statusInfo.bg,
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 11 }}>{statusInfo.dot}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: statusInfo.color }}>{statusInfo.label}</span>
        </div>
        {createdAt && <InfoRow label="Created" value={fmtDate(createdAt)} />}
        {lastDraftSavedAt && (
          <InfoRow
            label="Last edited"
            value={saveStatus === 'saving' ? '● Saving...' : fmtDate(lastDraftSavedAt)}
            valueStyle={saveStatus === 'saving' ? { color: 'var(--muted-foreground, rgba(0,0,0,0.45))' } : undefined}
          />
        )}
      </section>

      {/* ── URL SLUG ── */}
      <SlugSection
        blogName={blogName ?? null}
        isNewBlog={!currentBlogId}
        previewSlug={previewSlug}
        onCheckAvailable={currentBlogId ? onCheckSlugAvailable : undefined}
        onSave={currentBlogId ? onRenameBlogName : undefined}
      />

      {/* ── LIVE VERSION ── */}
      {publishedVersionNumber != null && (
        <section>
          <SectionLabel>Live Version</SectionLabel>
          <InfoRow label="Version" value={`v${publishedVersionNumber}`} />
          {lastPublishedAt && <InfoRow label="Published" value={fmtDate(lastPublishedAt)} />}
        </section>
      )}

      {/* ── DRAFT ── */}
      {draftVersionNumber != null && (
        <section>
          <SectionLabel>Draft</SectionLabel>
          <InfoRow label="Version" value={`v${draftVersionNumber}`} />
          {saveLabel && (
            <InfoRow
              label="Save status"
              value={saveLabel}
              valueStyle={{
                color: saveStatus === 'saving'
                  ? 'var(--muted-foreground, rgba(0,0,0,0.45))'
                  : saveStatus === 'error'
                    ? 'rgb(220,38,38)'
                    : 'rgb(21,128,61)',
                fontFamily: 'inherit',
                fontWeight: 400,
              }}
            />
          )}
        </section>
      )}

      {/* ── VERSIONS ── */}
      {currentBlogId && (
        <section>
          <button
            type="button"
            onClick={() => setVersionsExpanded(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: versionsExpanded ? 8 : 0,
            }}
          >
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--muted-foreground, rgba(0,0,0,0.35))',
              paddingBottom: versionsExpanded ? 4 : 0,
              borderBottom: versionsExpanded ? '1px solid var(--border, rgba(0,0,0,0.06))' : 'none',
              flex: 1,
              textAlign: 'left',
            }}>
              Versions
            </div>
            {versionsExpanded
              ? <ChevronUp size={12} style={{ color: 'var(--muted-foreground, rgba(0,0,0,0.3))', flexShrink: 0 }} />
              : <ChevronDown size={12} style={{ color: 'var(--muted-foreground, rgba(0,0,0,0.3))', flexShrink: 0 }} />
            }
          </button>
          {versionsExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {versions.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--muted-foreground, rgba(0,0,0,0.35))' }}>No versions yet</span>
              ) : (
                [...versions]
                  .sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))
                  .map((v) => {
                    const isLive = v.id === latestCommitted?.id;
                    const isDraft = v.status === 'draft';
                    const statusLabel = isDraft ? 'Draft' : isLive ? 'Live' : 'Archived';
                    const statusColor = isDraft
                      ? 'rgba(161,120,0,0.95)'
                      : isLive
                        ? 'rgb(21,128,61)'
                        : 'rgba(107,114,128,0.7)';
                    return (
                      <div key={v.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 0',
                        borderBottom: '1px solid var(--border, rgba(0,0,0,0.04))',
                      }}>
                        <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--foreground, rgba(0,0,0,0.8))', width: 24, flexShrink: 0 }}>
                          v{v.version_number}
                        </span>
                        <span style={{ fontSize: 11, color: statusColor, flex: 1 }}>{statusLabel}</span>
                        {!isDraft && (
                          <button
                            type="button"
                            onClick={() => onVersionRevert(v.id)}
                            style={{
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                              border: '1px solid var(--border, rgba(0,0,0,0.1))',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'var(--muted-foreground, rgba(0,0,0,0.5))',
                              flexShrink: 0,
                            }}
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </section>
      )}

      {/* ── SETTINGS ── */}
      <section>
        <SectionLabel>Settings</SectionLabel>
        <ToggleRow
          icon={settings.comment_status === 'open' ? <MessageSquare size={14} /> : <MessageSquare size={14} style={{ opacity: 0.4 }} />}
          label="Comments"
          enabled={settings.comment_status === 'open'}
          onToggle={() => onSettingChange('comment_status', settings.comment_status === 'open' ? 'close' : 'open')}
        />
        <ToggleRow
          icon={settings.blog_visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
          label="Public visibility"
          enabled={settings.blog_visibility === 'public'}
          onToggle={() => onSettingChange('blog_visibility', settings.blog_visibility === 'public' ? 'private' : 'public')}
        />
        <ToggleRow
          icon={settings.notification_status === 'all' ? <Bell size={14} /> : <BellOff size={14} />}
          label="Notifications"
          enabled={settings.notification_status === 'all'}
          onToggle={() => onSettingChange('notification_status', settings.notification_status === 'all' ? 'none' : 'all')}
        />
        <ToggleRow
          icon={settings.like_visibility === 'open' ? <Heart size={14} /> : <Heart size={14} style={{ opacity: 0.4 }} />}
          label="Likes"
          enabled={settings.like_visibility === 'open'}
          onToggle={() => onSettingChange('like_visibility', settings.like_visibility === 'open' ? 'close' : 'open')}
        />
        <ToggleRow
          icon={settings.view_visibility === 'open' ? <Eye size={14} /> : <EyeOff size={14} />}
          label="View count"
          enabled={settings.view_visibility === 'open'}
          onToggle={() => onSettingChange('view_visibility', settings.view_visibility === 'open' ? 'close' : 'open')}
        />
      </section>

      {/* ── DELETE ── */}
      {onDeleteBlog && (
        <section style={{ marginTop: 'auto', paddingTop: 8 }}>
          <button
            type="button"
            onClick={onDeleteBlog}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid rgba(220,38,38,0.2)',
              background: 'transparent',
              cursor: 'pointer',
              color: 'rgb(185,28,28)',
              fontSize: 12,
              fontWeight: 500,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.06)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <Trash2 size={13} />
            Delete this post
          </button>
        </section>
      )}
    </aside>
  );
}
