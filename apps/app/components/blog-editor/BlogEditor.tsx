'use client';

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FullscreenHeader } from './FullscreenHeader';
import { BottomToolbarContents } from './BottomToolbar';
import { BlogActionBar } from './BlogActionBar';
import { BlogEditorMeta, type BlogPublishStatus } from './BlogEditorMeta';
import { apiClient } from '@/api/core/client';
import type { ApiBlog, BlogSettings } from '@/types/blog';
import { useBlogStore } from '@/stores/blogs/useBlogStore';
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
  linkDialogPlugin,
  imagePlugin,
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

// ── ToolbarContentsWrapper ────────────────────────────────────────────────────
const ToolbarContentsWrapper = () => <BottomToolbarContents />;

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
    setBlog, setBlogVersions, setBlogTitle, setSaveStatus, setUnsavedChangesAt,
    resetEditorState,
  } = useBlogStore();

  // ── Derived from store ────────────────────────────────────────────────────
  const currentBlogId = blog?.id ?? null;
  const sortedVersions = [...blogVersions].sort((a, b) => b.version_number - a.version_number);
  const latestVersionId = sortedVersions[0]?.id ?? null;
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
  const settings: BlogSettings = {
    blog_visibility: blog?.blog_visibility ?? 'public',
    comment_status: blog?.comment_status ?? 'open',
    notification_status: blog?.notification_status ?? 'all',
    like_visibility: blog?.like_visibility ?? 'open',
    view_visibility: blog?.view_visibility ?? 'open',
  };
  const blogName = blog?.blog_name ?? null;
  const excerpt = blog?.blog_excerpt ?? '';
  const tags = blog?.tags ?? '';
  const publishedDate = (() => {
    const s = blog?.blog_date_published;
    return s && s !== '0000-00-00 00:00:00' ? s : '';
  })();

  // ── Local UI state (not shared) ───────────────────────────────────────────
  const [isContentFocused, setIsContentFocused] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishModalStep, setPublishModalStep] = useState<'confirm' | 'done'>('confirm');
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [editorLeft, setEditorLeft] = useState(0);
  const [editorRight, setEditorRight] = useState(0);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unsavedDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveDraftFnRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const blogCreationPromiseRef = useRef<Promise<number | string> | null>(null);
  const blogIdRef = useRef<number | string | null>(null);
  blogIdRef.current = currentBlogId;

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
    linkDialogPlugin(),
    imagePlugin({
      imageUploadHandler: async (image: File) => {
        const result = await uploadFile(image);
        return result.url;
      },
    }),
    diffSourcePlugin({ viewMode: 'rich-text' }),
    toolbarPlugin({
      toolbarContents: ToolbarContentsWrapper,
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []); // stable — never recreated

  // ── Sync isContentFocused + editor bounds to body data attributes ──────────
  // BottomToolbarContents reads these via MutationObserver.
  useEffect(() => {
    document.body.dataset.editorFocused = isContentFocused ? 'true' : 'false';
    return () => { delete document.body.dataset.editorFocused; };
  }, [isContentFocused]);

  useEffect(() => {
    document.body.dataset.editorLeft = String(editorLeft);
    document.body.dataset.editorRight = String(editorRight);
    return () => {
      delete document.body.dataset.editorLeft;
      delete document.body.dataset.editorRight;
    };
  }, [editorLeft, editorRight]);

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
      setEditorLeft(r.left);
      setEditorRight(window.innerWidth - r.right);
    }
    setIsContentFocused(true);
  }, [isContentFocused]);

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
    setIsContentFocused(false);
    suppressFocusEntryRef.current = true;
    setTimeout(() => {
      focusBody();
      setTimeout(() => { suppressFocusEntryRef.current = false; }, 50);
    }, 260);
  }, [focusBody]);

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
    autoSaveTimerRef.current = setTimeout(() => { saveDraftFnRef.current?.(); }, 800);
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

  const ensureBlogExists = useCallback(async (): Promise<number | string> => {
    if (blogIdRef.current) return blogIdRef.current;
    if (blogCreationPromiseRef.current) return blogCreationPromiseRef.current;

    const promise = (async () => {
      const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
      const { blog: currentBlogSnap, blogTitle: currentTitle } = useBlogStore.getState();
      const currentSettings: BlogSettings = {
        blog_visibility: currentBlogSnap?.blog_visibility ?? 'public',
        comment_status: currentBlogSnap?.comment_status ?? 'open',
        notification_status: currentBlogSnap?.notification_status ?? 'all',
        like_visibility: currentBlogSnap?.like_visibility ?? 'open',
        view_visibility: currentBlogSnap?.view_visibility ?? 'open',
      };
      try {
        const res = await apiClient.post('/blogs', {
          blog_name: slugify(currentTitle || 'untitled'),
          blog_title: currentTitle || 'Untitled',
          blog_excerpt: '',
          blog_date: now,
          blog_date_gmt: now,
          blog_content: mdxEditorRef.current?.getMarkdown() ?? '',
          blog_status: 'draft',
          comment_status: currentSettings.comment_status,
          notification_status: currentSettings.notification_status,
          blog_modified: now,
          blog_modified_gmt: now,
          tags: '',
          blog_visibility: currentSettings.blog_visibility,
          like_count: 0,
        });
        const id = res.data?.data?.id;
        if (!id) throw new Error('Failed to create blog');
        // Fetch full blog data and set in store
        const blogRes = await apiClient.get(`/blogs/${id}`);
        const blogData = blogRes.data?.data;
        setBlog(Array.isArray(blogData) ? blogData[0] : blogData);
        onBlogCreated?.(id);
        return id;
      } catch (err: any) {
        console.error('ensureBlogExists failed', err);
        const msg = err?.response?.data?.message || err?.message || 'Network error';
        throw new Error(msg);
      }
    })();

    blogCreationPromiseRef.current = promise;
    promise.finally(() => { blogCreationPromiseRef.current = null; });
    return promise;
  }, [setBlog, onBlogCreated]);

  const handleSaveDraft = useCallback(async () => {
    const { blogTitle: currentTitle, unsavedChangesAt: currentUnsaved, blog: currentBlog, blogVersions: currentVersions } = useBlogStore.getState();
    const content = mdxEditorRef.current?.getMarkdown() ?? '';
    if (!currentTitle.trim() && !content.trim()) return;
    if (!currentUnsaved) return;
    setSaveStatus('saving');
    try {
      const id = await ensureBlogExists();
      const sorted = [...currentVersions].sort((a, b) => b.version_number - a.version_number);
      const currentSettings: BlogSettings = {
        blog_visibility: currentBlog?.blog_visibility ?? 'public',
        comment_status: currentBlog?.comment_status ?? 'open',
        notification_status: currentBlog?.notification_status ?? 'all',
        like_visibility: currentBlog?.like_visibility ?? 'open',
        view_visibility: currentBlog?.view_visibility ?? 'open',
      };
      await apiClient.post(`/blogs/${id}/versions/draft`, {
        blog_title: currentTitle || 'Untitled',
        blog_content: content,
        parent_version_id: sorted[0]?.id ?? null,
        tags: currentBlog?.tags ?? '',
        ...currentSettings,
      });
      await handleFetchVersions();
      setUnsavedChangesAt(null);
      setSaveStatus('saved');
    } catch (err: any) {
      console.error('Save draft failed', err);
      const msg = err?.response?.data?.message || err?.message || 'Network error';
      try { alert('Failed to save draft: ' + msg); } catch {}
      setSaveStatus('error');
    }
  }, [ensureBlogExists, setSaveStatus, setUnsavedChangesAt]);

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
        blog_content: mdxEditorRef.current?.getMarkdown() ?? '',
        tags: currentBlog?.tags ?? '',
        ...currentSettings,
      });
      await handleFetchVersions();
      setUnsavedChangesAt(null);
      setSaveStatus('saved');
      setPublishModalStep('done');
    } catch (err: any) {
      console.error('Publish failed', err);
      const msg = err?.response?.data?.message || err?.message || 'Network error';
      try { alert('Publish failed: ' + msg); } catch {}
      setSaveStatus('error');
      setPublishModalOpen(false);
    } finally {
      setIsPublishing(false);
    }
  }, [ensureBlogExists, setSaveStatus, setUnsavedChangesAt]);

  const handlePublish = useCallback(() => {
    if (!blogTitle.trim()) return;
    setPublishModalStep('confirm');
    setPublishModalOpen(true);
  }, [blogTitle]);

  const handleSettingChange = useCallback(async (key: keyof BlogSettings, value: string) => {
    const snap = useBlogStore.getState().blog;
    if (snap) setBlog({ ...snap, [key]: value } as ApiBlog);
    if (!currentBlogId) return;
    try {
      await apiClient.patch(`/blogs/${currentBlogId}/settings`, { [key]: value });
    } catch {
      if (snap) setBlog(snap);
    }
  }, [currentBlogId, setBlog]);

  const handleFetchVersions = useCallback(async () => {
    if (!currentBlogId) return;
    try {
      const [blogRes, versRes] = await Promise.all([
        apiClient.get(`/blogs/${currentBlogId}`),
        apiClient.get(`/blogs/${currentBlogId}/versions`),
      ]);
      const blogData: ApiBlog | null = blogRes?.data?.data ?? null;
      const versData = versRes?.data?.data ?? [];

      if (blogData) setBlog(blogData);

      const versions: typeof blogVersions = Array.isArray(versData) ? versData : [];
      setBlogVersions(versions);

      if (versions.length > 0) {
        const sorted = [...versions].sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0));
        const latest = sorted[0];
        setBlogTitle(latest.blog_title ?? blogData?.blog_title ?? '');
        mdxEditorRef.current?.setMarkdown(latest.blog_content ?? '');
      } else if (blogData) {
        const title = blogData.blog_title ?? '';
        setBlogTitle(title);
        mdxEditorRef.current?.setMarkdown(blogData.blog_content ?? '');
        try {
          const draftRes = await apiClient.post(`/blogs/${currentBlogId}/versions/draft`, {
            blog_title: title || 'Untitled',
            blog_content: blogData.blog_content ?? '',
            blog_visibility: blogData.blog_visibility ?? 'public',
            comment_status: blogData.comment_status ?? 'open',
            like_visibility: blogData.like_visibility ?? 'open',
            view_visibility: blogData.view_visibility ?? 'open',
          });
          const draftData = draftRes.data?.data;
          if (draftData) setBlogVersions([draftData]);
        } catch (err) {
          console.warn('[BlogEditor] Failed to auto-create v1 draft', err);
        }
      }
    } catch (err) {
      console.error('Failed to fetch versions/blog data', err);
      setBlogVersions([]);
    }
  }, [currentBlogId, setBlog, setBlogVersions, setBlogTitle]);

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

  const handleVersionRevert = useCallback(async (versionId: number) => {
    if (!currentBlogId) return;
    try {
      await apiClient.post(`/blogs/${currentBlogId}/versions/${versionId}/revert`, {});
      await handleFetchVersions();
    } catch {}
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

  const handleCheckSlugAvailable = useCallback(async (slug: string): Promise<boolean> => {
    try {
      const base = '/api/proxy';
      const params = new URLSearchParams({ slug });
      if (currentBlogId) params.set('exclude_id', String(currentBlogId));
      const res = await fetch(`${base}/blogs/check-slug?${params}`);
      const json = await res.json();
      return json.available ?? true;
    } catch {
      return true;
    }
  }, [currentBlogId]);

  const handleRenameBlogName = useCallback(async (newSlug: string) => {
    if (!currentBlogId) return;
    await apiClient.patch(`/blogs/${currentBlogId}/settings`, { blog_name: newSlug });
    const snap = useBlogStore.getState().blog;
    if (snap) setBlog({ ...snap, blog_name: newSlug });
  }, [currentBlogId, setBlog]);

  const handleNewDraft = useCallback(async (source: 'empty' | 'current' | number) => {
    if (!currentBlogId) return;
    if (typeof source === 'number') {
      await apiClient.post(`/blogs/${currentBlogId}/versions/${source}/revert`, {});
    } else if (source === 'empty') {
      await apiClient.post(`/blogs/${currentBlogId}/versions/draft`, {
        blog_title: '',
        blog_content: '',
        tags: '',
      });
    } else {
      const { blogTitle: t, blog: b } = useBlogStore.getState();
      const currentSettings: BlogSettings = {
        blog_visibility: b?.blog_visibility ?? 'public',
        comment_status: b?.comment_status ?? 'open',
        notification_status: b?.notification_status ?? 'all',
        like_visibility: b?.like_visibility ?? 'open',
        view_visibility: b?.view_visibility ?? 'open',
      };
      await apiClient.post(`/blogs/${currentBlogId}/versions/draft`, {
        blog_title: t || 'Untitled',
        blog_content: mdxEditorRef.current?.getMarkdown() ?? '',
        tags: b?.tags ?? '',
        ...currentSettings,
      });
    }
    await handleFetchVersions();
  }, [currentBlogId, handleFetchVersions]);

  const handleDeleteBlog = useCallback(async () => {
    if (!currentBlogId) return;
    if (!window.confirm('Delete this blog and all its versions? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/blogs/${currentBlogId}`);
      setBlog(null);
      setBlogVersions([]);
      setIsContentFocused(false);
    } catch {}
  }, [currentBlogId, setBlog, setBlogVersions]);

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

  // Keep ref in sync
  saveDraftFnRef.current = handleSaveDraft;

  const previewSlug = !currentBlogId ? (slugify(blogTitle || '') || null) : null;

  const autoExcerpt = (() => {
    const md = mdxEditorRef.current?.getMarkdown() ?? '';
    return md ? md.replace(/[#*_`>\[\]!]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 70) : '';
  })();

  const handleSaveExcerpt = useCallback(async (newExcerpt: string) => {
    const snap = useBlogStore.getState().blog;
    if (snap) setBlog({ ...snap, blog_excerpt: newExcerpt });
    if (!currentBlogId) return;
    await apiClient.patch(`/blogs/${currentBlogId}/settings`, { blog_excerpt: newExcerpt });
  }, [currentBlogId, setBlog]);

  const handleSaveTags = useCallback(async (newTags: string) => {
    const snap = useBlogStore.getState().blog;
    if (snap) setBlog({ ...snap, tags: newTags });
    if (!currentBlogId) return;
    await apiClient.patch(`/blogs/${currentBlogId}/settings`, { tags: newTags });
  }, [currentBlogId, setBlog]);

  const handleSavePublishedDate = useCallback(async (dateStr: string) => {
    const snap = useBlogStore.getState().blog;
    if (snap) setBlog({ ...snap, blog_date_published: dateStr });
    if (!currentBlogId) return;
    const iso = dateStr ? new Date(dateStr).toISOString().replace('T', ' ').replace(/\..+/, '') : '';
    await apiClient.patch(`/blogs/${currentBlogId}/settings`, {
      blog_date_published: iso,
      blog_date_published_gmt: iso,
    });
  }, [currentBlogId, setBlog]);

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
      <style>{`
        .blog-editor-title {
          position: relative;
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.25;
          outline: none;
          width: 100%;
          min-height: 2.5rem;
          word-break: break-word;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
          cursor: text;
        }
        .blog-editor-title::before {
          content: attr(data-placeholder);
          color: rgba(156, 163, 175, 0.55);
          pointer-events: none;
          position: absolute;
          top: 0;
          left: 32px;
        }
        .blog-editor-title[data-empty="false"]::before { display: none; }
        .blog-editor-title { padding-left: 24px; color: inherit; }

        /* MDX editor layout */
        .blog-mdx-editor {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        /* Collapse toolbar container. display:contents removes its own box so the
           position:fixed motion.div inside is not trapped inside sticky/overflow context. */
        .blog-mdx-editor > div:first-child {
          display: contents !important;
        }
        /* Also neutralise the inner _toolbarRoot_ so it doesn't add background/padding */
        .blog-mdx-editor > div:first-child > [class*="_toolbarRoot_"] {
          display: contents !important;
        }
        /* Content area: explicit low z-index so toolbar/dropdowns always paint above it */
        .blog-mdx-editor > div:last-child {
          flex: 1;
          min-height: 0;
          overflow: auto;
          position: relative;
          z-index: 0;
        }
        /* Use site foreground color so text is solid, not the prose-neutral muted tint */
        .blog-editor-content {
          color: hsl(var(--foreground)) !important;
          --tw-prose-body: hsl(var(--foreground));
          --tw-prose-invert-body: hsl(var(--foreground));
        }

        .editor-sidebar-panel { display: flex; flex-direction: column; }
        @media (max-width: 768px) { .editor-sidebar-panel { display: none !important; } }
        .editor-action-bar-wrap { display: block; }
        @media (min-width: 769px) { .editor-action-bar-wrap { display: none !important; } }

        /* ── Content editor toolbar: match main toolbar style ── */

        /* Reset group spacing */
        .editor-content-toolbar [class*="toolbarGroupOfGroups"],
        .editor-content-toolbar [class*="toolbarToggleSingleGroup"] {
          display: flex;
          margin: 0 !important;
        }

        /* Button base — 32×32 pill, muted color */
        .editor-content-toolbar [class*="toolbarToggleItem"],
        .editor-content-toolbar [class*="toolbarButton"] {
          height: 2rem !important;
          width: 2rem !important;
          min-width: 2rem !important;
          border-radius: 9999px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          color: hsl(var(--muted-foreground)) !important;
          background-color: transparent !important;
          transition: color 150ms ease, background-color 150ms ease !important;
        }

        /* Inner span inside toggle buttons */
        .editor-content-toolbar [class*="toolbarToggleItem"] > span {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
        }

        /* Hover */
        .editor-content-toolbar [class*="toolbarToggleItem"]:hover,
        .editor-content-toolbar [class*="toolbarButton"]:hover {
          background-color: hsl(var(--accent)) !important;
          color: hsl(var(--foreground)) !important;
        }

        /* Active / selected */
        .editor-content-toolbar [class*="toolbarToggleItem"][data-state="on"],
        .editor-content-toolbar [class*="toolbarButton"][data-state="on"] {
          background-color: hsl(var(--accent)) !important;
          color: hsl(var(--foreground)) !important;
        }

        /* Keep border-radius circular even when mdxeditor applies grouped radius */
        .editor-content-toolbar [class*="toolbarToggleItem"][style*="border-radius"],
        .editor-content-toolbar [class*="toolbarToggleSingleGroup"] [class*="toolbarToggleItem"]:first-child,
        .editor-content-toolbar [class*="toolbarToggleSingleGroup"] [class*="toolbarToggleItem"]:last-child,
        .editor-content-toolbar [class*="toolbarToggleSingleGroup"] [class*="toolbarToggleItem"]:only-child {
          border-radius: 9999px !important;
        }

        /* SVG icons inherit button color */
        .editor-content-toolbar svg {
          color: inherit !important;
        }

        /* Separator — matches main toolbar divider */
        .editor-content-toolbar div[role="separator"] {
          width: 1px !important;
          height: 1.25rem !important;
          background: hsl(var(--border) / 0.6) !important;
          border: none !important;
          margin: 0 0.125rem !important;
          flex-shrink: 0 !important;
        }

        /* BlockTypeSelect trigger */
        .editor-content-toolbar [class*="toolbarNodeKindSelectTrigger"] {
          display: flex !important;
          align-items: center !important;
          gap: 0.25rem !important;
          height: 2rem !important;
          padding: 0 0.5rem !important;
          border-radius: 9999px !important;
          font-size: 0.75rem !important;
          color: hsl(var(--muted-foreground)) !important;
          background-color: transparent !important;
          transition: color 150ms ease, background-color 150ms ease !important;
          white-space: nowrap !important;
        }
        .editor-content-toolbar [class*="toolbarNodeKindSelectTrigger"]:hover {
          background-color: hsl(var(--accent)) !important;
          color: hsl(var(--foreground)) !important;
        }

        /* Mode switch (rich/source/diff) */
        .editor-content-toolbar [class*="toolbarModeSwitch"] {
          border: 1px solid hsl(var(--border) / 0.5) !important;
          border-radius: 9999px !important;
          overflow: hidden !important;
          font-size: 0.7rem !important;
        }
        .editor-content-toolbar [class*="toolbarModeSwitch"] [class*="toolbarToggleItem"] {
          width: auto !important;
          padding: 0 0.5rem !important;
          border-radius: 0 !important;
        }
        .editor-content-toolbar [class*="toolbarModeSwitch"] [class*="toolbarToggleItem"][data-state="on"] {
          background-color: hsl(var(--accent)) !important;
          color: hsl(var(--foreground)) !important;
        }

        /* diffSourceToggleWrapper: remove sticky/auto-margin so it flows inline */
        .editor-content-toolbar [class*="diffSourceToggleWrapper"] {
          margin-left: 0 !important;
          position: static !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
        }
        /* diffSourceToggle group: remove background, use transparent */
        .editor-content-toolbar [class*="diffSourceToggle"]:not([class*="diffSourceToggleWrapper"]) {
          background-color: transparent !important;
          border-radius: 0 !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
        }
        /* Content editor toolbar: invisible scrollbar, minimal height */
        .editor-content-toolbar { scrollbar-width: none; }
        .editor-content-toolbar::-webkit-scrollbar { height: 1px; background: transparent; }
        .editor-content-toolbar::-webkit-scrollbar-track { background: transparent; }
        .editor-content-toolbar::-webkit-scrollbar-thumb { background: transparent; }
        /* MDXEditor popup container — appended directly to body (position:relative; z-index:2
           by default). Setting z-index:100000 places it above blog-editor-root (z-index:40)
           in the root stacking context, so image/link dialogs paint over the toolbar. */
        [class*="_popupContainer_"] { z-index: 100000 !important; }
        /* MDXEditor dropdowns / tooltips / dialogs must clear the toolbar (z-index 99999).
           Let Radix handle placement — it has built-in collision detection and will open
           above the trigger automatically when there is no room below. */
        [class*="_toolbarNodeKindSelectContainer_"],
        [class*="_selectContainer_"],
        [class*="_toolbarCodeBlockLanguageSelectContent_"],
        [class*="_toolbarButtonDropdownContainer_"] {
          z-index: 100001 !important;
          filter: none !important;
        }
        /* Tooltips, link/image dialogs */
        [class*="_tooltipContent_"],
        [class*="_linkDialogPopoverContent_"],
        [class*="_dialogContent_"] { z-index: 100001 !important; }
        [data-radix-popper-content-wrapper] { z-index: 100001 !important; }
      `}</style>

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
                autoSaveTimerRef.current = setTimeout(() => { saveDraftFnRef.current?.(); }, 800);
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

      {/* ── Blog action bar ── */}
      <AnimatePresence initial={false}>
        {!isContentFocused && (
          <BlogActionBar
            key="blog-action-bar"
            settings={settings}
            onSettingChange={handleSettingChange}
            versions={blogVersions}
            onFetchVersions={handleFetchVersions}
            onVersionRevert={handleVersionRevert}
            onDeleteBlog={currentBlogId ? handleDeleteBlog : undefined}
            currentVersionId={latestVersionId as number | null}
            onNewDraft={currentBlogId ? handleNewDraft : undefined}
            blogName={blogName}
            previewSlug={previewSlug}
            onCheckSlugAvailable={handleCheckSlugAvailable}
            onRenameBlogName={handleRenameBlogName}
            excerpt={excerpt}
            autoExcerpt={autoExcerpt}
            onSaveExcerpt={handleSaveExcerpt}
            tags={tags}
            onSaveTags={handleSaveTags}
            publishedDate={publishedDate}
            onSavePublishedDate={handleSavePublishedDate}
          />
        )}
      </AnimatePresence>

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
