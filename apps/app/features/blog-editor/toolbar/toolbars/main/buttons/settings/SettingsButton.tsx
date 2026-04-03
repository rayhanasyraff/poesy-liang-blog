'use client';

import React from 'react';
import {
  Settings2,
  MessageSquare,
  Globe,
  Lock,
  Bell,
  BellOff,
  Heart,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { BlogEditorToolbarButton } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';
import { BlogEditorToolbarMenu } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenu';
import { BlogEditorToolbarMenuTrigger } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuTrigger';
import { BlogEditorToolbarMenuContent } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuContent';
import { BlogEditorToolbarMenuLabel } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuLabel';
import { BlogEditorToolbarMenuSeparator } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuSeparator';
import { BlogEditorToolbarMenuItem } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuItem';
import { useBlogStore } from '@/stores/blogs/useBlogStore';
import type { BlogSettings } from '@/types/blog';

// ── ToggleItem ────────────────────────────────────────────────────────────────

function ToggleItem({
  icon,
  label,
  active,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <BlogEditorToolbarMenuItem
      onSelect={(e) => { e.preventDefault(); onToggle(); }}
      className="flex items-center gap-2 cursor-pointer"
    >
      <span className="text-muted-foreground w-4 flex-shrink-0">{icon}</span>
      <span className="flex-1 text-xs">{label}</span>
      {active && <Check size={13} className="text-green-600 flex-shrink-0" />}
    </BlogEditorToolbarMenuItem>
  );
}

// ── SettingsButton ────────────────────────────────────────────────────────────

export function SettingsButton() {
  const blog = useBlogStore((s) => s.blog);
  const saveSettings = useBlogStore((s) => s.saveSettings);

  const settings: BlogSettings = {
    blog_visibility: blog?.blog_visibility ?? 'public',
    comment_status: blog?.comment_status ?? 'open',
    notification_status: blog?.notification_status ?? 'all',
    like_visibility: blog?.like_visibility ?? 'open',
    view_visibility: blog?.view_visibility ?? 'open',
  };

  const s = settings;

  function onSettingChange(key: keyof BlogSettings, value: string) {
    saveSettings(key, value);
  }

  return (
    <BlogEditorToolbarMenu>
      <BlogEditorToolbarMenuTrigger>
        <BlogEditorToolbarButton icon={<Settings2 size={18} />} title="Post settings" />
      </BlogEditorToolbarMenuTrigger>
      <BlogEditorToolbarMenuContent side="top" className="w-52">
        <BlogEditorToolbarMenuLabel>Post settings</BlogEditorToolbarMenuLabel>
        <BlogEditorToolbarMenuSeparator />
        <ToggleItem
          icon={<MessageSquare size={13} />}
          label="Comments"
          active={s.comment_status === 'open'}
          onToggle={() =>
            onSettingChange('comment_status', s.comment_status === 'open' ? 'close' : 'open')
          }
        />
        <ToggleItem
          icon={s.blog_visibility === 'public' ? <Globe size={13} /> : <Lock size={13} />}
          label="Public visibility"
          active={s.blog_visibility === 'public'}
          onToggle={() =>
            onSettingChange(
              'blog_visibility',
              s.blog_visibility === 'public' ? 'private' : 'public',
            )
          }
        />
        <ToggleItem
          icon={s.notification_status === 'all' ? <Bell size={13} /> : <BellOff size={13} />}
          label="Notifications"
          active={s.notification_status === 'all'}
          onToggle={() =>
            onSettingChange(
              'notification_status',
              s.notification_status === 'all' ? 'none' : 'all',
            )
          }
        />
        <ToggleItem
          icon={<Heart size={13} />}
          label="Show likes"
          active={s.like_visibility === 'open'}
          onToggle={() =>
            onSettingChange('like_visibility', s.like_visibility === 'open' ? 'close' : 'open')
          }
        />
        <ToggleItem
          icon={s.view_visibility === 'open' ? <Eye size={13} /> : <EyeOff size={13} />}
          label="Show view count"
          active={s.view_visibility === 'open'}
          onToggle={() =>
            onSettingChange('view_visibility', s.view_visibility === 'open' ? 'close' : 'open')
          }
        />
      </BlogEditorToolbarMenuContent>
    </BlogEditorToolbarMenu>
  );
}
