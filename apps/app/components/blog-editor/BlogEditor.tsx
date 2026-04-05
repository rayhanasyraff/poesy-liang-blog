'use client';

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FullscreenHeader } from './FullscreenHeader';
import { BlogEditorMeta, type BlogPublishStatus } from './BlogEditorMeta';
import { BlogEditorContentToolbar } from './toolbar/toolbars/content/BlogEditorContentToolbar';
import { BlogEditorMainToolbar } from './toolbar/toolbars/main/BlogEditorMainToolbar';
import { useEditorToolbarStore } from '@/stores/useEditorToolbarStore';
import './style.css';
import { apiClient } from '@/api/core/client';
import type { ApiBlog, BlogSettings } from '@/types/blog';
import { useBlogStore } from '@/stores/blogs/useBlogStore';
import { CustomEditImageToolbar } from './toolbar/toolbars/content/buttons/image/CustomEditImageToolbar';
import { VideoJsxEditor } from './toolbar/toolbars/content/buttons/video/VideoJsxEditor';
import { SocialPostJsxEditor } from './toolbar/toolbars/content/buttons/social-post/SocialPostJsxEditor';
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  tablePlugin,
  linkPlugin,
  imagePlugin,
  jsxPlugin,
  diffSourcePlugin,
  toolbarPlugin,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

// ── Upload handler ─────────────────────────────────────────────────────────────

async function uploadFile(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
}

// ── JSX descriptors ───────────────────────────────────────────────────────────
const VideoDescriptor = {
  name: 'Video',
  kind: 'flow' as const,
  props: [{ name: 'url', type: 'string' as const }],
  hasChildren: false,
  Editor: VideoJsxEditor,
};

const SocialPostDescriptor = {
  name: 'SocialPost',
  kind: 'flow' as const,
  props: [{ name: 'url', type: 'string' as const }],
  hasChildren: false,
  Editor: SocialPostJsxEditor,
};

// ── ToolbarContentsWrapper ────────────────────────────────────────────────────
const ToolbarContentsWrapper = () => <BlogEditorContentToolbar />;

// ── Main component ────────────────────────────────────────────────────────────

export const BlogEditor = ({
  style,
  onTitleChange,
  blogId: blogIdProp,
  onBlogCreated,
}: {
  style?: React.CSSProperties;
  onTitleChange?: (title: string) => void;
  blogId?: number | string;
  onBlogCreated?: (id: number | string) => void;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyWrapperRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const mdxEditorRef = useRef<MDXEditorMethods | null>(null);

  // ── Store ─────────────────────────────────────────────────────────────────
  const {
    blog, blogVersions, blogTitle, saveStatus, unsavedChangesAt,
    setBlog, setBlogTitle, setSaveStatus, setUnsavedChangesAt,
    resetEditorState,
  } = useBlogStore();

  // ── Derived from store ────────────────────────────────────────────────────
  const currentBlogId = blog?.id ?? null;
  const sortedVersions = [...blogVersions].sort((a, b) => b.version_number - a.version_number);
  const currentVersionNumber = sortedVersions[0]?.version_number ?? null;
  const publishedVersionNumber = sortedVersions.find(v => v.status === 'committed' || v.status === 'published')?.version_number ?? null;
  const lastDraftSavedAt = (() => {
    const s = sortedVersions.find(v => v.status === 'draft')?.draft_saved_at;
    if (!s) return null;
    try { return new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z'); } catch { return null; }
  })();
  const createdAt = (() => {
    if (!blog?.blog_date_created) return null;
    try { const s = blog.blog_date_created; return new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z'); } catch { return null; }
  })();
  const lastPublishedAt = (() => {
    const s = blog?.blog_date_published;
    if (!s || s === '0000-00-00 00:00:00') return null;
    try { return new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z'); } catch { return null; }
  })();
  const publishStatus: BlogPublishStatus = !blog ? 'unsaved'
    : (blog.blog_status === 'publish' || blog.blog_status === 'published') ? 'published'
    : 'draft';

  // ── Toolbar store ─────────────────────────────────────────────────────────
  const isContentFocused = useEditorToolbarStore((s) => s.isContentFocused);
  const setContentFocused = useEditorToolbarStore((s) => s.setContentFocused);
  const setEditorBounds = useEditorToolbarStore((s) => s.setEditorBounds);
  const editorLeft = useEditorToolbarStore((s) => s.editorLeft);
  const editorRight = useEditorToolbarStore((s) => s.editorRight);

  // ── Local UI state (not shared) ───────────────────────────────────────────
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishModalStep, setPublishModalStep] = useState<'confirm' | 'done'>('confirm');
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unsavedDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Register markdown accessor with the store ────────────────────────────
  useEffect(() => {
    const { registerMarkdownAccessor } = useBlogStore.getState();
    registerMarkdownAccessor(
      () => mdxEditorRef.current?.getMarkdown() ?? '',
      (md) => mdxEditorRef.current?.setMarkdown(md),
    );
  }, []);

  // ── Reset store on unmount ────────────────────────────────────────────────
  useEffect(() => () => { resetEditorState(); }, [resetEditorState]);

  // ── Stable plugin list (created once on mount) ────────────────────────────
  const mdxPlugins = useMemo(() => [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
    codeMirrorPlugin({
      codeBlockLanguages: {
        text: 'Plain Text',
        js: 'JavaScript',
        javascript: 'JavaScript',
        ts: 'TypeScript',
        typescript: 'TypeScript',
        tsx: 'TSX',
        jsx: 'JSX',
        css: 'CSS',
        html: 'HTML',
        json: 'JSON',
        bash: 'Bash',
        sh: 'Shell',
        python: 'Python',
        py: 'Python',
        rust: 'Rust',
        go: 'Go',
        sql: 'SQL',
        yaml: 'YAML',
        yml: 'YAML',
        markdown: 'Markdown',
        md: 'Markdown',
      },
    }),
    tablePlugin(),
    linkPlugin(),
    imagePlugin({
      imageUploadHandler: async (image: File) => {
        const result = await uploadFile(image);
        return result.url;
      },
      EditImageToolbar: CustomEditImageToolbar,
    }),
    jsxPlugin({ jsxComponentDescriptors: [VideoDescriptor, SocialPostDescriptor] }),
    diffSourcePlugin({ viewMode: 'rich-text' }),
    toolbarPlugin({
      toolbarContents: ToolbarContentsWrapper,
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []); // stable — never recreated


  // ── Focus helpers ─────────────────────────────────────────────────────────

  const focusBody = useCallback(() => {
    const ce = bodyWrapperRef.current?.querySelector<HTMLElement>('[contenteditable]');
    try {
      (ce as any)?.focus?.({ preventScroll: true });
    } catch {
      ce?.focus();
    }
  }, []);

  const enterFocusMode = useCallback(() => {
    if (isContentFocused) return;
    const root = rootRef.current;
    if (root) {
      const r = root.getBoundingClientRect();
      setEditorBounds(Math.round(r.left), Math.round(window.innerWidth - r.right));
    }
    setContentFocused(true);
  }, [isContentFocused, setContentFocused, setEditorBounds]);

  const focusTitleAtEnd = useCallback(() => {
    const title = titleRef.current;
    if (!title) return;
    title.focus();
    try {
      const len = title.value.length;
      title.setSelectionRange(len, len);
    } catch {}
  }, []);

  const handleBodyPointerDown = useCallback((e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return;
    enterFocusMode();
  }, [enterFocusMode]);

  const handleBodyFocus = useCallback((e: React.FocusEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return;
    enterFocusMode();
  }, [enterFocusMode]);

  const suppressFocusEntryRef = useRef(false);

  const handleDone = useCallback(() => {
    setContentFocused(false);
    suppressFocusEntryRef.current = true;
    setTimeout(() => {
      focusBody();
      setTimeout(() => { suppressFocusEntryRef.current = false; }, 50);
    }, 260);
  }, [focusBody, setContentFocused]);

  // ── Title keyboard navigation ─────────────────────────────────────────────

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const title = titleRef.current;
    if (e.key === 'Enter') {
      e.preventDefault();
      focusBody();
      return;
    }
    if (e.key === 'ArrowRight') {
      if (!title) return;
      if ((title.selectionStart ?? 0) >= (title.value?.length ?? 0)) {
        e.preventDefault();
        focusBody();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      if (!title) return;
      if ((title.selectionStart ?? 0) >= (title.value?.length ?? 0)) {
        e.preventDefault();
        focusBody();
      }
    }
  }, [focusBody]);

  const handleTitleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    try {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    } catch {}
    const rawText = (el.value ?? '').replace(/\u200B/g, '');
    const trimmed = rawText.trim();
    el.parentElement?.setAttribute('data-empty', trimmed === '' ? 'true' : 'false');
    setBlogTitle(rawText);
    setUnsavedChangesAt(new Date());
    onTitleChange?.(trimmed);
  }, [onTitleChange, setBlogTitle, setUnsavedChangesAt]);

  const handleTitleBlur = useCallback(() => {
    const trimmed = blogTitle.trim();
    if (trimmed !== blogTitle) {
      setBlogTitle(trimmed);
      onTitleChange?.(trimmed);
    }
  }, [blogTitle, onTitleChange, setBlogTitle]);

  // ── Body keyboard shortcuts ───────────────────────────────────────────────

  useEffect(() => {
    const wrapper = bodyWrapperRef.current;
    if (!wrapper) return;

    const handler = (e: KeyboardEvent) => {
      const ce = wrapper.querySelector('[contenteditable]');
      if (!ce) return;

      if (e.key === 'Backspace') {
        const hasText = (ce.textContent ?? '').replaceAll('\u200B', '') !== '';
        if (hasText) return;
        const blocks = Array.from(ce.children);
        const isDefaultEmpty = blocks.length === 1 && blocks[0].tagName === 'P';
        if (!isDefaultEmpty) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        focusTitleAtEnd();
        return;
      }

      if (e.key === 'ArrowUp') {
        const sel = window.getSelection();
        if (!sel?.isCollapsed || !sel.rangeCount) return;
        const caretRect = sel.getRangeAt(0).getBoundingClientRect();
        const ceRect = ce.getBoundingClientRect();
        if (!caretRect.height || caretRect.top < ceRect.top) return;
        if (caretRect.top - ceRect.top < caretRect.height) {
          e.preventDefault();
          e.stopImmediatePropagation();
          focusTitleAtEnd();
        }
      }

      if (e.key === 'ArrowLeft') {
        const sel = window.getSelection();
        if (!sel?.isCollapsed || !sel.rangeCount) return;
        try {
          const preCaretRange = document.createRange();
          preCaretRange.selectNodeContents(ce);
          preCaretRange.setEnd(sel.anchorNode!, sel.anchorOffset);
          const textBefore = (preCaretRange.cloneContents().textContent ?? '').replace(/\u200B/g, '');
          if (textBefore !== '') return;
        } catch {
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        {
          const title = titleRef.current;
          if (title) {
            title.focus();
            const range = document.createRange();
            range.collapse(false);
            const sel2 = globalThis.getSelection();
            sel2?.removeAllRanges();
            sel2?.addRange(range);
          }
        }
      }
    };

    wrapper.addEventListener('keydown', handler, true);
    return () => wrapper.removeEventListener('keydown', handler, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTitlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/[\r\n]+/g, ' ');
    const ta = titleRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const newVal = ta.value.slice(0, start) + text + ta.value.slice(end);
    ta.value = newVal;
    ta.selectionStart = ta.selectionEnd = start + text.length;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);

  // ── Auto-save draft (800 ms after last title change) ─────────────────────
  // Content changes schedule auto-save directly in the MDXEditor onChange
  // callback to avoid serializing markdown on every keystroke.
  useEffect(() => {
    if (!blogTitle) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { useBlogStore.getState().saveDraft(); }, 800);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogTitle]);

  // Initialize title height
  useEffect(() => {
    const t = titleRef.current;
    if (t) {
      try {
        t.style.height = 'auto';
        t.style.height = `${t.scrollHeight}px`;
      } catch {}
    }
  }, []);

  // ── Blog versioning helpers ───────────────────────────────────────────────

  const handleSaveDraft = useCallback(async () => {
    await useBlogStore.getState().saveDraft();
  }, []);

  const handleFetchVersions = useCallback(async () => {
    await useBlogStore.getState().fetchVersions();
  }, []);

  // Used only for the publish flow (store doesn't have a publish action yet).
  const creationPromiseRef = useRef<Promise<number | string> | null>(null);
  const ensureBlogExists = useCallback(async (): Promise<number | string> => {
    const blogId = useBlogStore.getState().blog?.id;
    if (blogId) return blogId;
    if (creationPromiseRef.current) return creationPromiseRef.current;
    const promise = (async () => {
      const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
      const { blog: snap, blogTitle: currentTitle } = useBlogStore.getState();
      const res = await apiClient.post('/blogs', {
        blog_name: slugify(currentTitle || 'untitled'),
        blog_title: currentTitle || 'Untitled',
        blog_excerpt: '',
        blog_date: now, blog_date_gmt: now,
        blog_content: useBlogStore.getState().getEditorContent(),
        blog_status: 'draft',
        comment_status: snap?.comment_status ?? 'open',
        notification_status: snap?.notification_status ?? 'all',
        blog_modified: now, blog_modified_gmt: now,
        tags: '', blog_visibility: snap?.blog_visibility ?? 'public', like_count: 0,
      });
      const id = res.data?.data?.id;
      if (!id) throw new Error('Failed to create blog');
      const blogRes = await apiClient.get(`/blogs/${id}`);
      const blogData = blogRes.data?.data;
      setBlog(Array.isArray(blogData) ? blogData[0] : blogData);
      return id as number | string;
    })();
    creationPromiseRef.current = promise;
    promise.finally(() => { creationPromiseRef.current = null; });
    return promise;
  }, [setBlog]);

  // Wire onBlogCreated: call it once when the blog gets an ID for the first time.
  const onBlogCreatedCalledRef = useRef(false);
  useEffect(() => {
    if (!currentBlogId || onBlogCreatedCalledRef.current) return;
    onBlogCreatedCalledRef.current = true;
    onBlogCreated?.(currentBlogId);
  }, [currentBlogId, onBlogCreated]);

  const handlePublishConfirm = useCallback(async () => {
    const { blogTitle: currentTitle, blog: currentBlog } = useBlogStore.getState();
    if (!currentTitle.trim()) return;
    setIsPublishing(true);
    try {
      const id = await ensureBlogExists();
      const currentSettings: BlogSettings = {
        blog_visibility: currentBlog?.blog_visibility ?? 'public',
        comment_status: currentBlog?.comment_status ?? 'open',
        notification_status: currentBlog?.notification_status ?? 'all',
        like_visibility: currentBlog?.like_visibility ?? 'open',
        view_visibility: currentBlog?.view_visibility ?? 'open',
      };
      await apiClient.post(`/blogs/${id}/versions/publish`, {
        blog_title: currentTitle || 'Untitled',
        blog_content: useBlogStore.getState().getEditorContent(),
        tags: currentBlog?.tags ?? '',
        ...currentSettings,
      });
      await handleFetchVersions();
      setUnsavedChangesAt(null);
      setSaveStatus('saved');
      setPublishModalStep('done');
    } catch (err: any) {
      console.error('Publish failed', err);
      if (err?.response?.status === 401) {
        try { alert('Your session has expired. Please log in again.'); } catch {}
        window.location.href = '/admin/login';
        return;
      }
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Network error';
      try { alert('Publish failed: ' + msg); } catch {}
      setSaveStatus('error');
      setPublishModalOpen(false);
    } finally {
      setIsPublishing(false);
    }
  }, [ensureBlogExists, handleFetchVersions, setSaveStatus, setUnsavedChangesAt]);

  const handlePublish = useCallback(() => {
    if (!blogTitle.trim()) return;
    setPublishModalStep('confirm');
    setPublishModalOpen(true);
  }, [blogTitle]);

  useEffect(() => {
    const resolveBlogId = async () => {
      if (!blogIdProp) return;
      if (typeof blogIdProp === 'number') {
        setBlog({ id: blogIdProp } as ApiBlog);
        return;
      }
      const s = String(blogIdProp);
      const blogDashMatch = s.match(/^blog-(\d+)$/i);
      if (blogDashMatch) {
        setBlog({ id: Number(blogDashMatch[1]) } as ApiBlog);
        return;
      }
      const numeric = Number(s);
      if (!isNaN(numeric) && s.trim() !== '') {
        setBlog({ id: numeric } as ApiBlog);
        return;
      }

      try {
        const res = await fetch(`/api/blogs/resolve?slug=${encodeURIComponent(s)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success || !json.data) return;
        const apiId = json.data?.apiData?.id ?? null;
        if (apiId) {
          setBlog({ id: apiId } as ApiBlog);
        } else {
          mdxEditorRef.current?.setMarkdown(json.data.content ?? '');
          setBlogTitle(json.data.metadata?.title ?? '');
          const apiData = json.data.apiData;
          if (apiData) setBlog(apiData as ApiBlog);
        }
      } catch (err) {
        console.error('Failed to resolve blog slug', err);
      }
    };

    resolveBlogId();
  }, [blogIdProp, setBlog, setBlogTitle]);

  useEffect(() => {
    if (!currentBlogId) return;
    handleFetchVersions();
  }, [currentBlogId, handleFetchVersions]);

  const handleUnpublish = useCallback(() => {
    setUnpublishModalOpen(true);
  }, []);

  const handleUnpublishConfirm = useCallback(async () => {
    if (!currentBlogId) return;
    setIsUnpublishing(true);
    try {
      await apiClient.post(`/blogs/${currentBlogId}/unpublish`, {});
      setUnpublishModalOpen(false);
      await handleFetchVersions();
    } catch {
    } finally {
      setIsUnpublishing(false);
    }
  }, [currentBlogId, handleFetchVersions]);

  // When blog is deleted (blog becomes null), exit content focus mode
  useEffect(() => {
    if (!blog) setContentFocused(false);
  }, [blog, setContentFocused]);

  const handleBackClick = useCallback(async () => {
    if (!unsavedChangesAt) {
      window.location.href = '/admin';
      return;
    }
    const confirmed = window.confirm(
      'You have unsaved changes. Press OK to save and go back, or Cancel to continue editing.'
    );
    if (!confirmed) return;
    try {
      await handleSaveDraft();
    } catch (err: any) {
      try { alert('Failed to save changes before leaving: ' + (err?.message || 'Unknown error')); } catch {}
      return;
    }
    window.location.href = '/admin';
  }, [handleSaveDraft, unsavedChangesAt]);


  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={rootRef}
      className="blog-editor-root"
      style={isContentFocused ? {
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: editorLeft,
        right: editorRight,
        zIndex: 40,
        background: 'var(--background, #fff)',
      } : {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >


      {/* ── Main-page header ── */}
      {!isContentFocused && (
        <div style={{ position: 'fixed', top: 0, left: editorLeft, right: editorRight, zIndex: 50 }}>
          <FullscreenHeader
            onBack={handleBackClick}
            onSave={handleSaveDraft}
            isSaving={saveStatus === 'saving'}
            onPublish={handlePublish}
            isPublishing={isPublishing}
            onUnpublish={publishStatus === 'published' ? handleUnpublish : undefined}
            previewHref={currentBlogId ? `/admin/blog/${currentBlogId}` : undefined}
            showCenteredTitle={false}
          />
        </div>
      )}

      {/* ── Focus mode header ── */}
      <AnimatePresence initial={false}>
        {isContentFocused && (
          <motion.div
            key="focus-header"
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: 'fixed', top: 0, left: editorLeft, right: editorRight, zIndex: 50 }}
          >
            <FullscreenHeader
              onDone={handleDone}
              title={blogTitle}
              showCenteredTitle
              lastDraftSavedAt={lastDraftSavedAt}
              draftVersionNumber={currentVersionNumber}
              publishedVersionNumber={publishedVersionNumber}
              saveStatus={saveStatus}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header spacer */}
      <div style={{ flexShrink: 0, height: 48 }} />

      {/* ── Content area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Title + meta strip */}
        {!isContentFocused && (
          <div style={{ flexShrink: 0 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 6, maxWidth: '80%' }}>
              <textarea
                ref={titleRef}
                className="blog-editor-title"
                placeholder="New Blog"
                data-empty="true"
                rows={1}
                value={blogTitle}
                onKeyDown={handleTitleKeyDown}
                onInput={handleTitleInput}
                onBlur={handleTitleBlur}
                onPaste={handleTitlePaste}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                style={{ resize: 'none', overflow: 'hidden', flex: 1 }}
              />
            </div>
            <BlogEditorMeta
              publishStatus={publishStatus}
              createdAt={createdAt}
              draftVersionNumber={currentVersionNumber}
              publishedVersionNumber={publishedVersionNumber}
              lastDraftSavedAt={lastDraftSavedAt}
              lastPublishedAt={lastPublishedAt}
              unsavedChangesAt={unsavedChangesAt}
              saveStatus={saveStatus}
            />
          </div>
        )}

        {/* ── MDX Editor ── */}
        <div
          ref={bodyWrapperRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            paddingBottom: isContentFocused ? 72 : 88,
            transition: 'padding-bottom 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onPointerDownCapture={(e) => {
            if (suppressFocusEntryRef.current) return;
            if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return;
            handleBodyPointerDown(e);
          }}
          onFocus={(e) => {
            if (suppressFocusEntryRef.current) return;
            if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return;
            handleBodyFocus(e);
          }}
        >
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <MDXEditor
              ref={mdxEditorRef}
              className="blog-mdx-editor"
              markdown=""
              onChange={() => {
                // Schedule auto-save directly — avoids serializing markdown on every keystroke.
                if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
                autoSaveTimerRef.current = setTimeout(() => { useBlogStore.getState().saveDraft(); }, 800);
                // Debounce the UI "unsaved" indicator — at most once per 300ms.
                if (unsavedDebounceRef.current) clearTimeout(unsavedDebounceRef.current);
                unsavedDebounceRef.current = setTimeout(() => {
                  setUnsavedChangesAt(new Date());
                }, 300);
              }}
              plugins={mdxPlugins}
              contentEditableClassName="blog-editor-content prose prose-neutral dark:prose-invert text-justify"
            />
          </div>
        </div>

      </div>{/* end content area */}

      {/* ── Main toolbar (zero props — reads from store) ── */}
      <BlogEditorMainToolbar />

      {/* ── Publish confirmation modal ── */}
      {publishModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={!isPublishing ? () => { setPublishModalOpen(false); setPublishModalStep('confirm'); } : undefined}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-5">
            {publishModalStep === 'confirm' ? (
              <>
                <h2 className="text-sm font-semibold mb-2">Publish blog?</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Are you sure you want to publish this blog? Your current draft will be saved and published.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPublishModalOpen(false)}
                    disabled={isPublishing}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishConfirm}
                    disabled={isPublishing}
                    className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {isPublishing ? 'Publishing…' : 'Save & Publish'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold mb-2">Published!</h2>
                <p className="text-sm text-muted-foreground mb-5">Your blog is now live.</p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setPublishModalOpen(false); setPublishModalStep('confirm'); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    Continue Editing
                  </button>
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/admin'; }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
                  >
                    Go to Admin
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* ── Unpublish confirmation modal ── */}
      {unpublishModalOpen && typeof document !== 'undefined' && (() => {
        const sorted = [...blogVersions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));
        const fallback = sorted[0] ?? null;

        function fmtDate(iso: string | null | undefined) {
          if (!iso) return '—';
          try {
            let d = iso;
            if (d.includes(' ') && !d.includes('T')) d = d.replace(' ', 'T') + 'Z';
            return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          } catch { return iso; }
        }

        function statusLabel(s: string) {
          return (s === 'committed' || s === 'published') ? 'published' : 'draft';
        }

        return createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isUnpublishing && setUnpublishModalOpen(false)} />
            <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-5">
              <h2 className="text-sm font-semibold mb-1">Unpublish this blog?</h2>
              <p className="text-xs text-muted-foreground mb-4">
                This will remove the blog from public view. It will return to draft status using the latest saved version.
              </p>

              {fallback && (
                <>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">
                    Will revert to
                  </p>
                  <div className="rounded-xl border border-border bg-accent/40 px-3 py-2.5 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">v{fallback.version_number}</span>
                      <span className={`inline-block px-1.5 py-px rounded text-[10px] font-medium ${
                        (fallback.status === 'committed' || fallback.status === 'published')
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                          : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {statusLabel(fallback.status)}
                      </span>
                    </div>
                    <div className="text-xs text-foreground mt-0.5 truncate">{fallback.blog_title || 'Untitled'}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {fmtDate(fallback.draft_saved_at ?? fallback.published_at ?? fallback.created_at)}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUnpublishModalOpen(false)}
                  disabled={isUnpublishing}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUnpublishConfirm}
                  disabled={isUnpublishing}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isUnpublishing ? 'Unpublishing…' : 'Unpublish'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        );
      })()}
    </div>
  );
};
