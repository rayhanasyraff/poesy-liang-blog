import { create } from 'zustand';
import { apiClient } from '@/api/core/client';
import type { ApiBlog, BlogSettings, BlogVersionSummary } from '@/types/blog';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type NewDraftSource = 'empty' | 'current' | number;
export type BlogPublishStatus = 'unsaved' | 'draft' | 'published';

export interface BlogStatusInfo {
  currentVersionNumber: number | null;
  publishedVersionNumber: number | null;
  lastDraftSavedAt: Date | null;
  createdAt: Date | null;
  lastPublishedAt: Date | null;
  publishStatus: BlogPublishStatus;
}

// ── Module-level closures ──────────────────────────────────────────────────────
// Not Zustand state — avoids serializing markdown on every keystroke.
// BlogEditor registers these once on mount via registerMarkdownAccessor().
let _getMarkdown: (() => string) | null = null;
let _setMarkdown: ((md: string) => void) | null = null;

// Deduplicates concurrent blog-creation requests (race condition guard).
let _creationPromise: Promise<number | string> | null = null;

// Queues content applied before BlogEditor registers its accessor.
let _pendingContent: string | null = null;

// Cache for getBlogStatusInfo — returns the same reference when inputs haven't changed,
// so Zustand's useSyncExternalStore doesn't trigger an infinite re-render loop.
let _statusInfoCache: { blog: ApiBlog | null; versions: BlogVersionSummary[]; result: BlogStatusInfo } | null = null;

// Set to true while applyEditorContent is loading content into the editor.
// Prevents setUnsavedChangesAt from being called (which would allow saveDraft to run).
let _isApplyingContent = false;
let _applyingContentTimer: ReturnType<typeof setTimeout> | undefined = undefined;

// The last raw content applied to the editor (after NBSP conversion).
// Used so title-only saves don't call getMarkdown() and normalize the body.
let _lastAppliedContent: string | null = null;

// True once the user has actually edited the body (onChange fired).
// False after content is applied. Lets us skip getMarkdown() when body is untouched.
let _bodyModified = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
}

function nowMysql(): string {
  return new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface BlogState {
  blog: ApiBlog | null;
  blogVersions: BlogVersionSummary[];
  blogTitle: string;
  saveStatus: SaveStatus;
  unsavedChangesAt: Date | null;
  initialized: boolean;
}

interface BlogActions {
  // ── Setters (kept for backward compat during incremental migration) ─────────
  setBlog: (blog: ApiBlog | null) => void;
  setBlogVersions: (versions: BlogVersionSummary[]) => void;
  setBlogTitle: (title: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setUnsavedChangesAt: (date: Date | null) => void;
  resetEditorState: () => void;

  // ── Markdown accessor (registered by BlogEditor on mount) ───────────────────
  registerMarkdownAccessor: (
    getter: () => string,
    setter: (md: string) => void,
  ) => void;

  // ── Content helpers ─────────────────────────────────────────────────────────
  getEditorContent: () => string;
  markBodyModified: () => void;
  applyEditorContent: (md: string) => void;
  getAutoExcerpt: () => string;
  getPreviewSlug: () => string | null;
  getBlogStatusInfo: () => BlogStatusInfo;

  // ── Blog ID resolution ───────────────────────────────────────────────────────
  resolveBlogId: (blogId: number | string | undefined) => Promise<void>;

  // ── Async actions ───────────────────────────────────────────────────────────
  fetchVersions: (options?: { applyContent?: boolean }) => Promise<void>;
  saveDraft: () => Promise<void>;
  saveSettings: (key: keyof BlogSettings, value: string) => Promise<void>;
  revertVersion: (versionId: number) => Promise<void>;
  newDraft: (source: NewDraftSource) => Promise<void>;
  deleteBlog: () => Promise<void>;
  checkSlugAvailable: (slug: string) => Promise<boolean>;
  renameBlogName: (slug: string) => Promise<void>;
  publishBlog: () => Promise<{ success: boolean; error?: string; status?: number }>;
  unpublishBlog: () => Promise<{ success: boolean }>;
  saveTags: (tags: string) => Promise<void>;
  saveExcerpt: (excerpt: string) => Promise<void>;
  savePublishedDate: (dateStr: string) => Promise<void>;
}

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState: BlogState = {
  blog: null,
  blogVersions: [],
  blogTitle: '',
  saveStatus: 'idle',
  unsavedChangesAt: null,
  initialized: false,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBlogStore = create<BlogState & BlogActions>((set, get) => ({
  ...initialState,

  // ── Setters ────────────────────────────────────────────────────────────────

  setBlog: (blog) => set({ blog }),
  setBlogVersions: (blogVersions) => set({ blogVersions }),
  setBlogTitle: (blogTitle) => set({ blogTitle }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setUnsavedChangesAt: (unsavedChangesAt) => {
    // Don't mark unsaved while we're loading content — that would let saveDraft fire.
    if (_isApplyingContent && unsavedChangesAt !== null) return;
    set({ unsavedChangesAt });
  },

  resetEditorState: () => {
    _getMarkdown = null;
    _setMarkdown = null;
    _creationPromise = null;
    _pendingContent = null;
    _statusInfoCache = null;
    _isApplyingContent = false;
    _lastAppliedContent = null;
    _bodyModified = false;
    if (_applyingContentTimer) { clearTimeout(_applyingContentTimer); _applyingContentTimer = undefined; }
    set(initialState);
  },

  // ── Markdown accessor ──────────────────────────────────────────────────────

  registerMarkdownAccessor: (getter, setter) => {
    _getMarkdown = getter;
    _setMarkdown = setter;
    if (_pendingContent !== null) {
      setter(_pendingContent.replaceAll('\r\n', '\n').replaceAll('\r', '\n'));
      _pendingContent = null;
    }
  },

  // Returns the body content to save.
  // If the user hasn't edited the body since the last content load, returns the
  // original loaded content directly — skipping getMarkdown() and its normalizations.
  // If the body has been edited, calls getMarkdown() and converts \u00a0 back to &#x20;.
  getEditorContent: () => {
    if (!_bodyModified && _lastAppliedContent !== null) return _lastAppliedContent;
    return (_getMarkdown?.() ?? '').replaceAll('\u00a0', '&#x20;');
  },

  // Called by BlogEditor's onChange whenever the user edits the body.
  markBodyModified: () => { _bodyModified = true; },

  applyEditorContent: (md) => {
    // Normalize line endings, then convert &#x20; HTML entities to \u00a0 so remark
    // preserves them (remark decodes &#x20; to a plain space then may drop leading spaces).
    const normalized = md.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replaceAll('&#x20;', '\u00a0');
    _lastAppliedContent = md.replaceAll('\r\n', '\n').replaceAll('\r', '\n'); // original (with &#x20;)
    _bodyModified = false;
    _isApplyingContent = true;
    set({ unsavedChangesAt: null });
    if (_applyingContentTimer) clearTimeout(_applyingContentTimer);
    _applyingContentTimer = setTimeout(() => { _isApplyingContent = false; }, 1000);
    if (_setMarkdown) {
      _setMarkdown(normalized);
    } else {
      _pendingContent = normalized;
    }
  },

  getAutoExcerpt: () => {
    const md = _getMarkdown?.() ?? '';
    return md
      ? md.replace(/[#*_`>\[\]!]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 70)
      : '';
  },

  getPreviewSlug: () => {
    const { blog, blogTitle } = get();
    return !blog?.id ? slugify(blogTitle || '') || null : null;
  },

  getBlogStatusInfo: (): BlogStatusInfo => {
    const { blog, blogVersions } = get();
    const cached = _statusInfoCache;
    if (cached && cached.blog === blog && cached.versions === blogVersions) {
      return cached.result;
    }
    const sorted = [...blogVersions].sort((a, b) => b.version_number - a.version_number);

    const parseDate = (s: string | null | undefined): Date | null => {
      if (!s || s === '0000-00-00 00:00:00') return null;
      try { return new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z'); } catch { return null; }
    };

    const result: BlogStatusInfo = {
      currentVersionNumber: sorted[0]?.version_number ?? null,
      publishedVersionNumber:
        sorted.find((v) => v.status === 'committed' || v.status === 'published')?.version_number ?? null,
      lastDraftSavedAt: parseDate(sorted.find((v) => v.status === 'draft')?.draft_saved_at),
      createdAt: parseDate(blog?.blog_date_created),
      lastPublishedAt: parseDate(blog?.blog_date_published),
      publishStatus: !blog
        ? 'unsaved'
        : blog.blog_status === 'publish' || blog.blog_status === 'published'
          ? 'published'
          : 'draft',
    };
    _statusInfoCache = { blog, versions: blogVersions, result };
    return result;
  },

  // ── resolveBlogId ──────────────────────────────────────────────────────────

  resolveBlogId: async (blogId) => {
    if (!blogId) return;

    if (typeof blogId === 'number') {
      get().setBlog({ id: blogId } as ApiBlog);
      return;
    }

    const s = String(blogId);

    const blogDashMatch = s.match(/^blog-(\d+)$/i);
    if (blogDashMatch) {
      get().setBlog({ id: Number(blogDashMatch[1]) } as ApiBlog);
      return;
    }

    const numeric = Number(s);
    if (!isNaN(numeric) && s.trim() !== '') {
      get().setBlog({ id: numeric } as ApiBlog);
      return;
    }

    // URL slug — resolve via API
    try {
      const res = await fetch(`/api/blogs/resolve?slug=${encodeURIComponent(s)}`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success || !json.data) return;
      const apiId = json.data?.apiData?.id ?? null;
      if (apiId) {
        get().setBlog({ id: apiId } as ApiBlog);
      } else {
        get().applyEditorContent(json.data.content ?? '');
        get().setBlogTitle(json.data.metadata?.title ?? '');
        if (json.data.apiData) get().setBlog(json.data.apiData as ApiBlog);
      }
    } catch (err) {
      console.error('[useBlogStore] resolveBlogId failed', err);
    }
  },

  // ── Internal: ensure blog exists before first save ─────────────────────────

  // ── fetchVersions ──────────────────────────────────────────────────────────

  fetchVersions: async (options) => {
    const applyContent = options?.applyContent ?? true;
    const { blog } = get();
    if (!blog?.id) return;
    try {
      const [blogRes, versRes] = await Promise.all([
        apiClient.get(`/blogs/${blog.id}`),
        apiClient.get(`/blogs/${blog.id}/versions`),
      ]);
      const blogData: ApiBlog | null = blogRes?.data?.data ?? null;
      const versData = versRes?.data?.data ?? [];

      if (blogData) get().setBlog(blogData);

      const versions: BlogVersionSummary[] = Array.isArray(versData) ? versData : [];
      get().setBlogVersions(versions);

      if (versions.length > 0) {
        const sorted = [...versions].sort(
          (a, b) => (b.version_number ?? 0) - (a.version_number ?? 0),
        );
        const latest = sorted[0];
        if (applyContent) {
          get().setBlogTitle(latest.blog_title ?? blogData?.blog_title ?? '');
          get().applyEditorContent(latest.blog_content ?? '');
        }
      } else if (blogData) {
        const title = blogData.blog_title ?? '';
        get().setBlogTitle(title);
        get().applyEditorContent(blogData.blog_content ?? '');
        try {
          const draftRes = await apiClient.post(`/blogs/${blog.id}/versions/draft`, {
            blog_title: title || 'Untitled',
            blog_content: blogData.blog_content ?? '',
            blog_visibility: blogData.blog_visibility ?? 'public',
            comment_status: blogData.comment_status ?? 'open',
            like_visibility: blogData.like_visibility ?? 'open',
            view_visibility: blogData.view_visibility ?? 'open',
          });
          const draftData = draftRes.data?.data;
          if (draftData) get().setBlogVersions([draftData]);
        } catch (err) {
          console.warn('[BlogStore] Failed to auto-create v1 draft', err);
        }
      }

      set({ initialized: true });
    } catch (err) {
      console.error('[BlogStore] fetchVersions failed', err);
      get().setBlogVersions([]);
    }
  },

  // ── saveDraft ──────────────────────────────────────────────────────────────

  saveDraft: async () => {
    const { blog, blogTitle, unsavedChangesAt, blogVersions } = get();
    const content = get().getEditorContent();

    if (!blogTitle.trim() && !content.trim()) return;
    if (!unsavedChangesAt) return;

    get().setSaveStatus('saving');
    try {
      // Ensure blog exists (create if new)
      let blogId: number | string | undefined = blog?.id;
      if (!blogId) {
        if (!_creationPromise) {
          const now = nowMysql();
          _creationPromise = (async () => {
            let slug = slugify(blogTitle || 'untitled');
            const slugAvailable = await get().checkSlugAvailable(slug);
            if (!slugAvailable) {
              const suffix = Math.random().toString(36).slice(2, 6);
              slug = `${slug}-${suffix}`;
            }
            const res = await apiClient.post('/blogs', {
              blog_name: slug,
              blog_title: blogTitle || 'Untitled',
              blog_excerpt: '',
              blog_date: now,
              blog_date_gmt: now,
              blog_content: content,
              blog_status: 'draft',
              comment_status: blog?.comment_status ?? 'open',
              notification_status: blog?.notification_status ?? 'all',
              blog_modified: now,
              blog_modified_gmt: now,
              tags: '',
              blog_visibility: blog?.blog_visibility ?? 'public',
              like_count: 0,
            });
            const id = res.data?.data?.id;
            if (!id) throw new Error('Failed to create blog');
            const blogRes = await apiClient.get(`/blogs/${id}`);
            const blogData = blogRes.data?.data;
            get().setBlog(Array.isArray(blogData) ? blogData[0] : blogData);
            return id as number | string;
          })();
          _creationPromise.finally(() => { _creationPromise = null; });
        }
        blogId = await _creationPromise;
      }

      const sorted = [...blogVersions].sort((a, b) => b.version_number - a.version_number);
      const currentBlog = get().blog;

      await apiClient.post(`/blogs/${blogId}/versions/draft`, {
        blog_title: blogTitle || 'Untitled',
        blog_content: content,
        blog_excerpt: currentBlog?.blog_excerpt ?? '',
        parent_version_id: sorted[0]?.id ?? null,
        tags: currentBlog?.tags ?? '',
        blog_visibility: currentBlog?.blog_visibility ?? 'public',
        comment_status: currentBlog?.comment_status ?? 'open',
        notification_status: currentBlog?.notification_status ?? 'all',
        like_visibility: currentBlog?.like_visibility ?? 'open',
        view_visibility: currentBlog?.view_visibility ?? 'open',
      });

      await get().fetchVersions({ applyContent: false });
      get().setUnsavedChangesAt(null);
      get().setSaveStatus('saved');
    } catch (err: any) {
      console.error('[BlogStore] saveDraft failed', err);
      get().setSaveStatus('error');
    }
  },

  // ── saveSettings ───────────────────────────────────────────────────────────

  saveSettings: async (key, value) => {
    const { blog } = get();
    const snap = blog;
    if (snap) get().setBlog({ ...snap, [key]: value } as ApiBlog);
    if (!snap?.id) return;
    try {
      await apiClient.patch(`/blogs/${snap.id}/settings`, { [key]: value });
    } catch {
      if (snap) get().setBlog(snap);
    }
  },

  // ── revertVersion ──────────────────────────────────────────────────────────

  revertVersion: async (versionId) => {
    const { blog } = get();
    if (!blog?.id) return;
    try {
      await apiClient.post(`/blogs/${blog.id}/versions/${versionId}/revert`, {});
      await get().fetchVersions();
    } catch (err) {
      console.error('[BlogStore] revertVersion failed', err);
    }
  },

  // ── newDraft ───────────────────────────────────────────────────────────────

  newDraft: async (source) => {
    const { blog, blogTitle } = get();
    if (!blog?.id) return;
    try {
      if (typeof source === 'number') {
        await apiClient.post(`/blogs/${blog.id}/versions/${source}/revert`, {});
      } else if (source === 'empty') {
        await apiClient.post(`/blogs/${blog.id}/versions/draft`, {
          blog_title: '',
          blog_content: '',
          tags: '',
        });
      } else {
        const content = get().getEditorContent();
        await apiClient.post(`/blogs/${blog.id}/versions/draft`, {
          blog_title: blogTitle || 'Untitled',
          blog_content: content,
          tags: blog.tags ?? '',
          blog_visibility: blog.blog_visibility ?? 'public',
          comment_status: blog.comment_status ?? 'open',
          notification_status: blog.notification_status ?? 'all',
          like_visibility: blog.like_visibility ?? 'open',
          view_visibility: blog.view_visibility ?? 'open',
        });
      }
      await get().fetchVersions();
    } catch (err) {
      console.error('[BlogStore] newDraft failed', err);
    }
  },

  // ── deleteBlog ─────────────────────────────────────────────────────────────

  deleteBlog: async () => {
    const { blog } = get();
    if (!blog?.id) return;
    try {
      await apiClient.delete(`/blogs/${blog.id}`);
      get().setBlog(null);
      get().setBlogVersions([]);
    } catch (err) {
      console.error('[BlogStore] deleteBlog failed', err);
    }
  },

  // ── publishBlog ────────────────────────────────────────────────────────────

  publishBlog: async () => {
    const { blogTitle } = get();
    if (!blogTitle.trim()) return { success: false, error: 'No title' };

    // Ensure blog exists — saveDraft handles creation with slug collision check
    let id = get().blog?.id;
    if (!id) {
      get().setUnsavedChangesAt(new Date());
      await get().saveDraft();
      id = get().blog?.id;
      if (!id) return { success: false, error: 'Failed to create blog' };
    }

    const { blog: currentBlog } = get();
    try {
      await apiClient.post(`/blogs/${id}/versions/publish`, {
        blog_title: get().blogTitle || 'Untitled',
        blog_content: get().getEditorContent(),
        blog_excerpt: currentBlog?.blog_excerpt ?? '',
        tags: currentBlog?.tags ?? '',
        blog_visibility: currentBlog?.blog_visibility ?? 'public',
        comment_status: currentBlog?.comment_status ?? 'open',
        notification_status: currentBlog?.notification_status ?? 'all',
        like_visibility: currentBlog?.like_visibility ?? 'open',
        view_visibility: currentBlog?.view_visibility ?? 'open',
      });
      await get().fetchVersions({ applyContent: false });
      get().setUnsavedChangesAt(null);
      get().setSaveStatus('saved');
      return { success: true };
    } catch (err: any) {
      get().setSaveStatus('error');
      return {
        success: false,
        error: err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? 'Network error',
        status: err?.response?.status,
      };
    }
  },

  // ── unpublishBlog ──────────────────────────────────────────────────────────

  unpublishBlog: async () => {
    const { blog } = get();
    if (!blog?.id) return { success: false };
    try {
      await apiClient.post(`/blogs/${blog.id}/unpublish`, {});
      await get().fetchVersions({ applyContent: false });
      return { success: true };
    } catch {
      return { success: false };
    }
  },

  // ── checkSlugAvailable ─────────────────────────────────────────────────────

  checkSlugAvailable: async (slug) => {
    const { blog } = get();
    try {
      const params = new URLSearchParams({ slug });
      if (blog?.id) params.set('exclude_id', String(blog.id));
      const res = await fetch(`/api/proxy/blogs/check-slug?${params}`);
      const json = await res.json();
      return json.available ?? true;
    } catch {
      return true;
    }
  },

  // ── renameBlogName ─────────────────────────────────────────────────────────

  renameBlogName: async (slug) => {
    const { blog } = get();
    if (!blog?.id) return;
    await apiClient.patch(`/blogs/${blog.id}/settings`, { blog_name: slug });
    get().setBlog({ ...blog, blog_name: slug });
  },

  // ── saveTags ───────────────────────────────────────────────────────────────

  saveTags: async (tags) => {
    const { blog } = get();
    const snap = blog;
    if (snap) get().setBlog({ ...snap, tags });
    if (!snap?.id) return;
    await apiClient.patch(`/blogs/${snap.id}/settings`, { tags });
  },

  // ── saveExcerpt ────────────────────────────────────────────────────────────

  saveExcerpt: async (excerpt) => {
    const { blog } = get();
    const snap = blog;
    if (snap) get().setBlog({ ...snap, blog_excerpt: excerpt });
    if (!snap?.id) return;
    await apiClient.patch(`/blogs/${snap.id}/settings`, { blog_excerpt: excerpt });
  },

  // ── savePublishedDate ──────────────────────────────────────────────────────

  savePublishedDate: async (dateStr) => {
    const { blog } = get();
    const snap = blog;
    if (snap) get().setBlog({ ...snap, blog_date_published: dateStr });
    if (!snap?.id) return;
    const iso = dateStr
      ? new Date(dateStr).toISOString().replace('T', ' ').replace(/\..+/, '')
      : '';
    await apiClient.patch(`/blogs/${snap.id}/settings`, {
      blog_date_published: iso,
      blog_date_published_gmt: iso,
    });
  },
}));
