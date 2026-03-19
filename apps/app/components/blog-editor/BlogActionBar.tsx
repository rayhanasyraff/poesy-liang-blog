'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  History,
  Settings2,
  Trash2,
  MessageSquare,
  Globe,
  Lock,
  Bell,
  BellOff,
  Heart,
  Eye,
  EyeOff,
  Check,
  Link2,
  AlignLeft,
  Tag,
  Calendar,
  FilePlus2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BlogSettings, BlogVersionSummary } from '@/types/blog';
// import { BlogEditorToolbar } from './toolbar/BlogEditorToolbar';
// import { BlogEditorToolbarNew } from './toolbar/BlogEditorToolbarNew';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BlogActionBarProps {
  settings: BlogSettings;
  onSettingChange: (key: keyof BlogSettings, value: string) => void;
  versions: BlogVersionSummary[];
  onFetchVersions: () => void;
  onVersionRevert: (versionId: number) => void;
  onDeleteBlog?: () => void;
  currentVersionId?: number | null;
  blogName?: string | null;
  previewSlug?: string | null;
  onCheckSlugAvailable?: (slug: string) => Promise<boolean>;
  onRenameBlogName?: (slug: string) => Promise<void>;
  excerpt?: string;
  autoExcerpt?: string;
  onSaveExcerpt?: (excerpt: string) => Promise<void>;
  tags?: string;
  onSaveTags?: (tags: string) => Promise<void>;
  publishedDate?: string;
  onSavePublishedDate?: (date: string) => Promise<void>;
  onNewDraft?: (source: 'empty' | 'current' | number) => Promise<void>;
}

// ── Icon button ───────────────────────────────────────────────────────────────

function Btn({
  icon, title, onClick, disabled,
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
    >
      {icon}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border/60 mx-0.5 flex-shrink-0" />;
}

// ── New draft modal ───────────────────────────────────────────────────────────

type NewDraftSource = 'empty' | 'current' | number;

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

  const sortedVersions = [...versions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
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

// ── Version history dropdown ──────────────────────────────────────────────────

function fmtV(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    let d = iso;
    if (d.includes(' ') && !d.includes('T')) d = d.replace(' ', 'T') + 'Z';
    return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function versionLabel(status: string) {
  if (status === 'committed' || status === 'published') return 'published';
  return 'draft';
}

function versionBadgeClass(status: string) {
  return (status === 'committed' || status === 'published')
    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
    : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
}

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
          This will create a new draft based on the selected version. Your current unsaved changes will remain in the version history.
        </p>

        {/* Version card */}
        <div className="rounded-xl border border-border bg-accent/40 px-3 py-2.5 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">v{version.version_number}</span>
            <span className={`inline-block px-1.5 py-px rounded text-[10px] font-medium ${versionBadgeClass(version.status)}`}>
              {versionLabel(version.status)}
            </span>
          </div>
          <div className="text-xs text-foreground mt-0.5 truncate">{version.blog_title || 'Untitled'}</div>
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

function HistoryMenu({
  versions, onFetchVersions, onVersionRevert, currentVersionId,
}: Pick<BlogActionBarProps, 'versions' | 'onFetchVersions' | 'onVersionRevert' | 'currentVersionId'>) {
  const [pendingVersion, setPendingVersion] = useState<BlogVersionSummary | null>(null);
  const [switching, setSwitching] = useState(false);

  async function handleConfirmSwitch() {
    if (!pendingVersion) return;
    setSwitching(true);
    try {
      await onVersionRevert(pendingVersion.id);
      setPendingVersion(null);
    } finally {
      setSwitching(false);
    }
  }

  const sorted = [...versions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));

  return (
    <>
      <DropdownMenu onOpenChange={(open) => { if (open) onFetchVersions(); }}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Version history"
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            <History size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-80 py-1">
          <DropdownMenuLabel className="text-xs text-muted-foreground px-3 py-2">Version history</DropdownMenuLabel>
          <DropdownMenuSeparator />
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
                  {/* Version number + current indicator */}
                  <div className="flex-shrink-0 mt-0.5 w-5 text-[11px] font-mono text-muted-foreground leading-tight">
                    v{v.version_number}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium truncate">{v.blog_title || 'Untitled'}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-px rounded bg-foreground/10 text-foreground font-medium">
                          current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`inline-block px-1.5 py-px rounded text-[10px] font-medium ${versionBadgeClass(v.status)}`}>
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
        </DropdownMenuContent>
      </DropdownMenu>

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

// ── Settings dropdown ─────────────────────────────────────────────────────────

function SettingsMenu({
  settings, onSettingChange,
}: Pick<BlogActionBarProps, 'settings' | 'onSettingChange'>) {
  const s = settings;

  function ToggleItem({ icon, label, active, onToggle }: {
    icon: React.ReactNode; label: string; active: boolean; onToggle: () => void;
  }) {
    return (
      <DropdownMenuItem
        onSelect={(e) => { e.preventDefault(); onToggle(); }}
        className="flex items-center gap-2 cursor-pointer"
      >
        <span className="text-muted-foreground w-4 flex-shrink-0">{icon}</span>
        <span className="flex-1 text-xs">{label}</span>
        {active && <Check size={13} className="text-green-600 flex-shrink-0" />}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Post settings"
          className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <Settings2 size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Post settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ToggleItem
          icon={<MessageSquare size={13} />}
          label="Comments"
          active={s.comment_status === 'open'}
          onToggle={() => onSettingChange('comment_status', s.comment_status === 'open' ? 'close' : 'open')}
        />
        <ToggleItem
          icon={s.blog_visibility === 'public' ? <Globe size={13} /> : <Lock size={13} />}
          label="Public visibility"
          active={s.blog_visibility === 'public'}
          onToggle={() => onSettingChange('blog_visibility', s.blog_visibility === 'public' ? 'private' : 'public')}
        />
        <ToggleItem
          icon={s.notification_status === 'all' ? <Bell size={13} /> : <BellOff size={13} />}
          label="Notifications"
          active={s.notification_status === 'all'}
          onToggle={() => onSettingChange('notification_status', s.notification_status === 'all' ? 'none' : 'all')}
        />
        <ToggleItem
          icon={<Heart size={13} />}
          label="Show likes"
          active={s.like_visibility === 'open'}
          onToggle={() => onSettingChange('like_visibility', s.like_visibility === 'open' ? 'close' : 'open')}
        />
        <ToggleItem
          icon={s.view_visibility === 'open' ? <Eye size={13} /> : <EyeOff size={13} />}
          label="Show view count"
          active={s.view_visibility === 'open'}
          onToggle={() => onSettingChange('view_visibility', s.view_visibility === 'open' ? 'close' : 'open')}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Tags menu ─────────────────────────────────────────────────────────────────

function TagsMenu({
  tags, onSaveTags,
}: Pick<BlogActionBarProps, 'tags' | 'onSaveTags'>) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setInput(tags ?? '');
  }, [open, tags]);

  // Split into pill-style array for display only
  const tagList = input.split(',').map((t) => t.trim()).filter(Boolean);

  async function handleSave() {
    if (!onSaveTags) return;
    setSaving(true);
    try {
      await onSaveTags(input.trim());
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function removeTag(tag: string) {
    const updated = tagList.filter((t) => t !== tag).join(', ');
    setInput(updated);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Tags"
          className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <Tag size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-72 p-3">
        <DropdownMenuLabel className="text-xs text-muted-foreground px-0 pb-2">Tags</DropdownMenuLabel>
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tagList.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent text-foreground"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="opacity-60 hover:opacity-100 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="tag1, tag2, tag3"
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background outline-none focus:border-ring transition-colors"
        />
        <p className="text-[11px] text-muted-foreground mt-1">Comma-separated</p>
        <div className="flex justify-end gap-1.5 mt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] px-2 py-1 rounded border border-border bg-transparent hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || input.trim() === (tags ?? '')}
            className="text-[11px] px-2 py-1 rounded bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Published date menu ───────────────────────────────────────────────────────

function DateMenu({
  publishedDate, onSavePublishedDate,
}: Pick<BlogActionBarProps, 'publishedDate' | 'onSavePublishedDate'>) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Convert stored MySQL/ISO date → datetime-local value (YYYY-MM-DDTHH:mm)
  function toInputValue(raw: string): string {
    if (!raw) return '';
    try {
      const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
      if (isNaN(d.getTime())) return '';
      // datetime-local needs local time, not UTC
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
  }

  useEffect(() => {
    if (open) setInput(toInputValue(publishedDate ?? ''));
  }, [open, publishedDate]);

  async function handleSave() {
    if (!onSavePublishedDate) return;
    setSaving(true);
    try {
      await onSavePublishedDate(input);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const currentInputValue = toInputValue(publishedDate ?? '');

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Published date"
          className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <Calendar size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-72 p-3">
        <DropdownMenuLabel className="text-xs text-muted-foreground px-0 pb-2">Published date</DropdownMenuLabel>
        {!publishedDate && (
          <p className="text-[11px] text-muted-foreground mb-2">
            Will be set automatically when published
          </p>
        )}
        <input
          type="datetime-local"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background outline-none focus:border-ring transition-colors"
        />
        <div className="flex justify-end gap-1.5 mt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] px-2 py-1 rounded border border-border bg-transparent hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || input === currentInputValue}
            className="text-[11px] px-2 py-1 rounded bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Excerpt menu ──────────────────────────────────────────────────────────────

function ExcerptMenu({
  excerpt, autoExcerpt, onSaveExcerpt,
}: Pick<BlogActionBarProps, 'excerpt' | 'autoExcerpt' | 'onSaveExcerpt'>) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setInput(excerpt ?? '');
  }, [open, excerpt]);

  const effective = input.trim() || autoExcerpt || '';
  const isCustom = input.trim() !== '';

  async function handleSave() {
    if (!onSaveExcerpt) return;
    setSaving(true);
    try {
      await onSaveExcerpt(input.trim());
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!onSaveExcerpt) return;
    setSaving(true);
    try {
      await onSaveExcerpt('');
      setInput('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Excerpt"
          className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <AlignLeft size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-80 p-3">
        <DropdownMenuLabel className="text-xs text-muted-foreground px-0 pb-2">Excerpt</DropdownMenuLabel>
        <textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={autoExcerpt || 'Write a short excerpt…'}
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background outline-none focus:border-ring transition-colors resize-none"
        />
        {!isCustom && autoExcerpt && (
          <p className="text-[11px] text-muted-foreground mt-1">Auto: first 70 chars of content</p>
        )}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div>
            {isCustom && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                Reset to auto
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] px-2 py-1 rounded border border-border bg-transparent hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || input.trim() === (excerpt ?? '')}
              className="text-[11px] px-2 py-1 rounded bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── URL / slug menu ───────────────────────────────────────────────────────────

function UrlMenu({
  blogName, previewSlug, onCheckSlugAvailable, onRenameBlogName,
}: Pick<BlogActionBarProps, 'blogName' | 'previewSlug' | 'onCheckSlugAvailable' | 'onRenameBlogName'>) {
  const currentSlug = blogName ?? previewSlug ?? '';
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset input whenever dropdown opens
  useEffect(() => {
    if (open) {
      setInput(currentSlug);
      setStatus('idle');
    }
  }, [open, currentSlug]);

  const handleInputChange = useCallback((val: string) => {
    setInput(val);
    setStatus('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val || val === currentSlug) return;
    setStatus('checking');
    debounceRef.current = setTimeout(async () => {
      if (!onCheckSlugAvailable) { setStatus('idle'); return; }
      const ok = await onCheckSlugAvailable(val);
      setStatus(ok ? 'available' : 'taken');
    }, 500);
  }, [currentSlug, onCheckSlugAvailable]);

  const canSave = input && input !== currentSlug && (status === 'available' || status === 'idle') && !saving;

  async function handleSave() {
    if (!canSave || !onRenameBlogName) return;
    setSaving(true);
    try {
      await onRenameBlogName(input);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="URL slug"
          className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <Link2 size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-72 p-3">
        <DropdownMenuLabel className="text-xs text-muted-foreground px-0 pb-2">URL slug</DropdownMenuLabel>
        {previewSlug && !blogName && (
          <p className="text-[11px] text-muted-foreground mb-2">Preview (not saved yet): <span className="font-mono">{previewSlug}</span></p>
        )}
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-'))}
            placeholder="url-slug"
            className={`w-full text-xs px-2 py-1.5 rounded border bg-background font-mono outline-none transition-colors ${
              status === 'available' ? 'border-green-500' :
              status === 'taken' ? 'border-red-400' :
              'border-border focus:border-ring'
            }`}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px]">
              {status === 'checking' && <span className="text-muted-foreground">● Checking…</span>}
              {status === 'available' && <span className="text-green-600 dark:text-green-400">✓ Available</span>}
              {status === 'taken' && <span className="text-red-500">✕ Already taken</span>}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] px-2 py-1 rounded border border-border bg-transparent hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="text-[11px] px-2 py-1 rounded bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BlogActionBar({
  settings,
  onSettingChange,
  versions,
  onFetchVersions,
  onVersionRevert,
  onDeleteBlog,
  currentVersionId,
  blogName,
  previewSlug,
  onCheckSlugAvailable,
  onRenameBlogName,
  excerpt,
  autoExcerpt,
  onSaveExcerpt,
  tags,
  onSaveTags,
  publishedDate,
  onSavePublishedDate,
  onNewDraft,
}: BlogActionBarProps) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [newDraftOpen, setNewDraftOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const vv = (window as any).visualViewport;
      setKeyboardOffset(vv ? Math.max(0, window.innerHeight - vv.height) : 0);
    };
    update();
    const vv = (window as any).visualViewport;
    vv?.addEventListener?.('resize', update);
    vv?.addEventListener?.('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      vv?.removeEventListener?.('resize', update);
      vv?.removeEventListener?.('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Publish the main editor toolbar bounding rect to the body dataset so the
  // floating content toolbar can match it after the main toolbar unmounts.
  useEffect(() => {
    function computeToolbarData() {
      try {
        const t = document.getElementById('main-editor-toolbar');
        if (!t) {
          delete document.body.dataset.mainToolbarLeft;
          delete document.body.dataset.mainToolbarRight;
          delete document.body.dataset.mainToolbarHeight;
          delete document.body.dataset.mainToolbarBottom;
          return;
        }
        const r = t.getBoundingClientRect();
        document.body.dataset.mainToolbarLeft = String(Math.round(r.left));
        document.body.dataset.mainToolbarRight = String(Math.round(window.innerWidth - r.right));
        document.body.dataset.mainToolbarHeight = String(Math.round(r.height));
        document.body.dataset.mainToolbarBottom = String(Math.round(Math.max(0, window.innerHeight - r.bottom)));
      } catch {
        // ignore
      }
    }

    computeToolbarData();
    const ro = new ResizeObserver(computeToolbarData);
    const tEl = document.getElementById('main-editor-toolbar');
    if (tEl) ro.observe(tEl);
    window.addEventListener('resize', computeToolbarData);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', computeToolbarData);
    };
  }, []);

  return (
    <>
     <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            zIndex: 50,
            bottom: `calc(${keyboardOffset}px + env(safe-area-inset-bottom))`,
            transition: 'bottom 160ms ease',
          }}
          className="flex justify-center px-4 pb-4 pt-2"
        >
        <div id="main-editor-toolbar" className="flex items-center gap-0.5 px-2 py-[5px] rounded-full border border-border/50 bg-background shadow-xl shadow-black/12">
          <HistoryMenu
            versions={versions}
            onFetchVersions={onFetchVersions}
            onVersionRevert={onVersionRevert}
            currentVersionId={currentVersionId}
          />
          <Btn
            icon={<FilePlus2 size={16} />}
            title="New draft version"
            onClick={() => setNewDraftOpen(true)}
            disabled={!onNewDraft}
          />
          <Divider />
          <TagsMenu tags={tags} onSaveTags={onSaveTags} />
          <Divider />
          <DateMenu publishedDate={publishedDate} onSavePublishedDate={onSavePublishedDate} />
          <Divider />
          <ExcerptMenu
            excerpt={excerpt}
            autoExcerpt={autoExcerpt}
            onSaveExcerpt={onSaveExcerpt}
          />
          <Divider />
          <UrlMenu
            blogName={blogName}
            previewSlug={previewSlug}
            onCheckSlugAvailable={onCheckSlugAvailable}
            onRenameBlogName={onRenameBlogName}
          />
          <Divider />
          <SettingsMenu settings={settings} onSettingChange={onSettingChange} />
          <Divider />
          <Btn
            icon={<Trash2 size={18} />}
            title={onDeleteBlog ? 'Delete blog' : 'Save the blog first to delete it'}
            onClick={onDeleteBlog}
            disabled={!onDeleteBlog}
          />
        </div>
      </motion.div>
      {/* <BlogEditorToolbar /> */}
      {/* <BlogEditorToolbarNew /> */}
      <NewDraftModal
        open={newDraftOpen}
        onClose={() => setNewDraftOpen(false)}
        versions={versions}
        onCreateDraft={async (source) => {
          if (onNewDraft) await onNewDraft(source);
        }}
      />
    </>
  );
}
