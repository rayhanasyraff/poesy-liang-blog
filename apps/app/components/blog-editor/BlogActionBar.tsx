'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  Send,
  History,
  MessageSquare,
  Globe,
  Lock,
  Bell,
  BellOff,
  Heart,
  Eye,
  EyeOff,
  Trash2,
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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BlogActionBarProps {
  onSaveDraft: () => void;
  onPublish: () => void;
  isPublishing: boolean;
  settings: BlogSettings;
  onSettingChange: (key: keyof BlogSettings, value: string) => void;
  versions: BlogVersionSummary[];
  onFetchVersions: () => void;
  onVersionPublish: (versionId: number) => void;
  onVersionRevert: (versionId: number) => void;
  onUnpublish?: () => void;
  onDeleteBlog?: () => void;
}

// ── Shared button components (mirrors BottomToolbar) ─────────────────────────

function Btn({
  icon,
  title,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={
        active
          ? 'h-8 w-8 flex items-center justify-center rounded-full bg-accent text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none flex-shrink-0'
          : 'h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none flex-shrink-0'
      }
    >
      {icon}
    </button>
  );
}

function TextBtn({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string;
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
      className="h-8 flex items-center justify-center rounded-full px-2 min-w-[2.75rem] text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border/60 mx-0.5 flex-shrink-0" />;
}

// ── Version history dropdown ───────────────────────────────────────────────────

function HistoryMenu({
  versions,
  onFetchVersions,
  onVersionPublish,
  onVersionRevert,
}: Pick<BlogActionBarProps, 'versions' | 'onFetchVersions' | 'onVersionPublish' | 'onVersionRevert'>) {
  function fmt(iso: string) {
    try {
      return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  return (
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
      <DropdownMenuContent side="bottom" align="center" sideOffset={8} className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Version history</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!versions.length ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">No versions saved yet</div>
        ) : (
          versions.map((v) => (
            <div key={v.id} className="flex items-center gap-2 px-2 py-1.5 text-xs">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">v{v.version_number} — {v.blog_title || 'Untitled'}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`inline-block px-1.5 py-px rounded text-[10px] ${
                    v.status === 'committed'
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {v.status}
                  </span>
                  <span className="text-muted-foreground">{fmt(v.created_at)}</span>
                </div>
              </div>
              {v.status === 'committed' && (
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onVersionPublish(v.id); }}
                    className="text-[11px] px-1.5 py-0.5 rounded border border-border bg-transparent hover:bg-accent transition-colors cursor-pointer"
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onVersionRevert(v.id); }}
                    className="text-[11px] px-1.5 py-0.5 rounded border border-border bg-transparent hover:bg-accent transition-colors cursor-pointer"
                  >
                    Revert
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BlogActionBar({
  onSaveDraft,
  onPublish,
  isPublishing,
  settings,
  onSettingChange,
  versions,
  onFetchVersions,
  onVersionPublish,
  onVersionRevert,
  onUnpublish,
  onDeleteBlog,
}: BlogActionBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll indicator + wheel + drag — same logic as BottomToolbar
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const showIndicator = () => {
      const thumb = thumbRef.current;
      if (!thumb) return;
      const trackW = el.clientWidth;
      const contentW = el.scrollWidth;
      if (contentW <= trackW) return;
      const thumbW = Math.max((trackW / contentW) * trackW, 24);
      const maxOffset = trackW - thumbW;
      const offset = (el.scrollLeft / (contentW - trackW)) * maxOffset;
      thumb.style.width = `${thumbW}px`;
      thumb.style.transform = `translateX(${offset}px)`;
      thumb.style.opacity = '1';
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (thumbRef.current) thumbRef.current.style.opacity = '0';
      }, 1500);
    };

    el.addEventListener('scroll', showIndicator, { passive: true });

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
      showIndicator();
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    let dragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => { dragging = true; hasMoved = false; startX = e.clientX; scrollLeft = el.scrollLeft; };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { hasMoved = true; el.scrollLeft = scrollLeft - dx; el.style.cursor = 'grabbing'; showIndicator(); }
    };
    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = 'grab';
      if (hasMoved) el.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
      hasMoved = false;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('scroll', showIndicator);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const s = settings;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}
      className="flex justify-center px-4 pb-4 pt-2"
    >
      <style>{`.blog-action-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="rounded-full border border-border/50 bg-background/95 backdrop-blur-md shadow-xl shadow-black/12 overflow-hidden relative"
        style={{ width: 'max-content', maxWidth: 'min(390px, calc(100vw - 2rem))' }}
      >
        <div
          ref={scrollRef}
          className="blog-action-scroll overflow-x-auto"
          style={{ scrollbarWidth: 'none', cursor: 'grab', touchAction: 'pan-x' }}
        >
          <div className="flex items-center gap-0.5 px-2 py-[5px] w-max">

            {/* Save Draft */}
            <TextBtn
              label="Draft"
              title="Save current content as a draft"
              onClick={onSaveDraft}
            />

            {/* Publish */}
            <TextBtn
              label={isPublishing ? '…' : 'Publish'}
              title="Publish blog"
              onClick={onPublish}
              disabled={isPublishing}
            />

            {/* Unpublish — only shown when blog is currently published */}
            {onUnpublish && (
              <TextBtn
                label="Unpublish"
                title="Revert blog to draft (unpublish)"
                onClick={onUnpublish}
              />
            )}

            <Divider />

            {/* Version History */}
            <HistoryMenu
              versions={versions}
              onFetchVersions={onFetchVersions}
              onVersionPublish={onVersionPublish}
              onVersionRevert={onVersionRevert}
            />

            <Divider />

            {/* Comments */}
            <Btn
              icon={<MessageSquare size={18} />}
              title={s.comment_status === 'open' ? 'Comments open — click to close' : 'Comments closed — click to open'}
              active={s.comment_status === 'open'}
              onClick={() => onSettingChange('comment_status', s.comment_status === 'open' ? 'close' : 'open')}
            />

            {/* Visibility */}
            <Btn
              icon={s.blog_visibility === 'public' ? <Globe size={18} /> : <Lock size={18} />}
              title={s.blog_visibility === 'public' ? 'Public — click to make private' : 'Private — click to make public'}
              active={s.blog_visibility === 'public'}
              onClick={() => onSettingChange('blog_visibility', s.blog_visibility === 'public' ? 'private' : 'public')}
            />

            {/* Notifications */}
            <Btn
              icon={s.notification_status === 'all' ? <Bell size={18} /> : <BellOff size={18} />}
              title={s.notification_status === 'all' ? 'Notifications on — click to turn off' : 'Notifications off — click to turn on'}
              active={s.notification_status === 'all'}
              onClick={() => onSettingChange('notification_status', s.notification_status === 'all' ? 'none' : 'all')}
            />

            {/* Likes */}
            <Btn
              icon={<Heart size={18} />}
              title={s.like_visibility === 'open' ? 'Likes count visible — click to hide' : 'Likes count hidden — click to show'}
              active={s.like_visibility === 'open'}
              onClick={() => onSettingChange('like_visibility', s.like_visibility === 'open' ? 'close' : 'open')}
            />

            {/* Views */}
            <Btn
              icon={s.view_visibility === 'open' ? <Eye size={18} /> : <EyeOff size={18} />}
              title={s.view_visibility === 'open' ? 'Views count visible — click to hide' : 'Views count hidden — click to show'}
              active={s.view_visibility === 'open'}
              onClick={() => onSettingChange('view_visibility', s.view_visibility === 'open' ? 'close' : 'open')}
            />

            <Divider />
            <Btn
              icon={<Trash2 size={18} />}
              title={onDeleteBlog ? 'Delete blog' : 'Save the blog first to delete it'}
              onClick={onDeleteBlog}
              disabled={!onDeleteBlog}
            />
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 2, left: 8, right: 8, height: 2, pointerEvents: 'none' }}>
          <div
            ref={thumbRef}
            style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              background: 'rgba(128,128,128,0.45)', borderRadius: 999,
              opacity: 0, transition: 'opacity 0.3s ease', willChange: 'transform, opacity',
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
