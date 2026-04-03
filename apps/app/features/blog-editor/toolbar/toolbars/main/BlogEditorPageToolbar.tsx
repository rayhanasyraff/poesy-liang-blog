'use client';

import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useEditorToolbarStore } from '@/stores/useEditorToolbarStore';
import { BlogEditorToolbar } from '../../BlogEditorToolbar';
import { BlogEditorToolbarButtonDivider } from '../../buttons/BlogEditorToolbarButtonDivider';
import { VersionHistoryButton } from './buttons/version-history/VersionHistoryButton';
import { NewDraftButton } from './buttons/new-draft/NewDraftButton';
import { TagsButton } from './buttons/tags/TagsButton';
import { PublishedDateButton } from './buttons/published-date/PublishedDateButton';
import { ExcerptButton } from './buttons/excerpt/ExcerptButton';
import { UrlSlugButton } from './buttons/url-slug/UrlSlugButton';
import { SettingsButton } from './buttons/settings/SettingsButton';
import { DeleteBlogButton } from './buttons/delete-blog/DeleteBlogButton';

export function BlogEditorPageToolbar() {
  const isContentFocused = useEditorToolbarStore((s) => s.isContentFocused);
  const setKeyboardOffset = useEditorToolbarStore((s) => s.setKeyboardOffset);

  // Keep toolbar above the virtual keyboard on mobile
  useEffect(() => {
    const update = () => {
      const vv = (window as any).visualViewport;
      setKeyboardOffset(
        vv && typeof vv.height === 'number'
          ? Math.max(0, window.innerHeight - vv.height)
          : 0,
      );
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
  }, [setKeyboardOffset]);


  return (
    <AnimatePresence initial={false}>
      {!isContentFocused && (
        <BlogEditorToolbar key="main-toolbar" visible={!isContentFocused}>
          <div
            id="blog-editor-main-toolbar"
            className="flex items-center gap-0.5 px-2 py-[5px] rounded-full border border-border/50 bg-background shadow-xl shadow-black/12"
          >
            <VersionHistoryButton />
            <NewDraftButton />
            <BlogEditorToolbarButtonDivider />
            <TagsButton />
            <BlogEditorToolbarButtonDivider />
            <PublishedDateButton />
            <BlogEditorToolbarButtonDivider />
            <ExcerptButton />
            <BlogEditorToolbarButtonDivider />
            <UrlSlugButton />
            <BlogEditorToolbarButtonDivider />
            <SettingsButton />
            <BlogEditorToolbarButtonDivider />
            <DeleteBlogButton />
          </div>
        </BlogEditorToolbar>
      )}
    </AnimatePresence>
  );
}
