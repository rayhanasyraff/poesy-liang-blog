'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { FullscreenHeader } from '../FullscreenHeader';
import { BlogEditorPageTitle, type BlogEditorPageTitleHandle } from '../components/BlogEditorPageTitle';
import { BlogEditorPageToolbar } from '../toolbar/toolbars/main/BlogEditorPageToolbar';
import { PublishModal } from '../components/PublishModal';
import { UnpublishModal } from '../components/UnpublishModal';
import { BlogEditor, type BlogEditorHandle } from '../BlogEditor';
import { useEditorToolbarStore } from '@/stores/useEditorToolbarStore';
import { useBlogStore } from '@/stores/blogs/useBlogStore';
import { usePublishModal } from '../hooks/usePublishModal';

// ── BlogEditorPage ─────────────────────────────────────────────────────────────
// Page shell: header, title, modals, toolbar. Delegates MDX editing to BlogEditor.

export default function BlogEditorPage({ blogId }: { blogId?: number | string }) {
  const editorRef = useRef<BlogEditorHandle>(null);
  const titleRef  = useRef<BlogEditorPageTitleHandle>(null);

  const blog             = useBlogStore((s) => s.blog);
  const saveStatus       = useBlogStore((s) => s.saveStatus);
  const unsavedChangesAt = useBlogStore((s) => s.unsavedChangesAt);
  const publishStatus    = useBlogStore((s) => s.getBlogStatusInfo().publishStatus);
  const { resolveBlogId, fetchVersions, saveDraft } = useBlogStore();

  const isContentFocused  = useEditorToolbarStore((s) => s.isContentFocused);
  const setContentFocused = useEditorToolbarStore((s) => s.setContentFocused);

  const publish      = usePublishModal();
  const currentBlogId = blog?.id ?? null;

  // Resolve blog ID once on mount
  useEffect(() => {
    resolveBlogId(blogId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch versions whenever a blog ID becomes available
  useEffect(() => {
    if (!currentBlogId) return;
    fetchVersions();
  }, [currentBlogId, fetchVersions]);

  // When a new blog is created on the /new page, redirect to its canonical edit URL
  // so the browser history entry points to the correct blog and returning to it
  // doesn't create yet another duplicate.
  const prevBlogIdRef = useRef<number | string | null>(null);
  useEffect(() => {
    if (!currentBlogId) { prevBlogIdRef.current = null; return; }
    if (prevBlogIdRef.current === null && !blogId) {
      // blog.id just transitioned from null → value on a "new blog" page
      globalThis.window.location.replace(`/admin/blog/${currentBlogId}/edit`);
    }
    prevBlogIdRef.current = currentBlogId;
  }, [currentBlogId, blogId]);

  // Exit focus mode when blog is deleted
  useEffect(() => {
    if (!blog) setContentFocused(false);
  }, [blog, setContentFocused]);

  const focusBody      = useCallback(() => { editorRef.current?.focusBody(); }, []);
  const focusTitleAtEnd = useCallback(() => { titleRef.current?.focusTitleAtEnd(); }, []);

  const handleBack = useCallback(async () => {
    if (!unsavedChangesAt) { globalThis.window.location.href = '/admin'; return; }
    const confirmed = globalThis.window.confirm(
      'You have unsaved changes. Press OK to save and go back, or Cancel to continue editing.',
    );
    if (!confirmed) return;
    try { await saveDraft(); } catch (err: any) {
      try { alert('Failed to save changes before leaving: ' + (err?.message || 'Unknown error')); } catch {}
      return;
    }
    globalThis.window.location.href = '/admin';
  }, [saveDraft, unsavedChangesAt]);

  return (
    // Fixed overlay — escapes the admin layout's max-width/margin constraints
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'var(--background, #fff)', overflow: 'hidden' }}>

      {/* Main-page header (fixed full-width, hidden in focus mode) */}
      {!isContentFocused && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
          <FullscreenHeader
            onBack={handleBack}
            onSave={saveDraft}
            isSaving={saveStatus === 'saving'}
            onPublish={publish.openPublish}
            isPublishing={publish.isPublishing}
            onUnpublish={publishStatus === 'published' ? publish.openUnpublish : undefined}
            previewHref={currentBlogId ? `/admin/blog/${currentBlogId}` : undefined}
            showCenteredTitle={false}
          />
        </div>
      )}

      {/* Spacer for fixed header */}
      <div style={{ flexShrink: 0, height: 48 }} />

      {/* Scrollable content — only this area scrolls */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 96px' }}>

          {/* Title + meta strip (hidden in focus mode) */}
          {!isContentFocused && (
            <BlogEditorPageTitle ref={titleRef} onFocusBody={focusBody} />
          )}

          {/* MDX editor */}
          <BlogEditor ref={editorRef} onFocusTitleAtEnd={focusTitleAtEnd} />

        </div>
      </div>

      {/* Bottom toolbar */}
      <BlogEditorPageToolbar />

      {/* Modals */}
      <PublishModal
        open={publish.publishOpen}
        step={publish.publishStep}
        isPublishing={publish.isPublishing}
        onConfirm={publish.handlePublishConfirm}
        onClose={publish.handlePublishClose}
        onGoToAdmin={() => { globalThis.window.location.href = '/admin'; }}
      />
      <UnpublishModal
        open={publish.unpublishOpen}
        isUnpublishing={publish.isUnpublishing}
        onConfirm={publish.handleUnpublishConfirm}
        onClose={publish.handleUnpublishClose}
      />

    </div>
  );
}
