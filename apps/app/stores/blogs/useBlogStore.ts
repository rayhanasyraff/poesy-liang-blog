import { create } from 'zustand';
import { apiClient } from '@/api/core/client';
import type { ApiBlog, BlogSettings, BlogVersionSummary } from '@/types/blog';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type NewDraftSource = 'empty' | 'current' | number;

// ── Module-level closures ──────────────────────────────────────────────────────
// Not Zustand state — avoids serializing markdown on every keystroke.
// BlogEditor registers these once on mount via registerMarkdownAccessor().
let _getMarkdown: (() => string) | null = null;
let _setMarkdown: ((md: string) => void) | null = null;

// Deduplicates concurrent blog-creation requests (race condition guard).
let _creationPromise: Promise<number | string> | null = null;

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
  applyEditorContent: (md: string) => void;
  getAutoExcerpt: () => string;
  getPreviewSlug: () => string | null;

  // ── Async actions ───────────────────────────────────────────────────────────
  fetchVersions: () => Promise<void>;
  saveDraft: () => Promise<void>;
  saveSettings: (key: keyof BlogSettings, value: string) => Promise<void>;
  revertVersion: (versionId: number) => Promise<void>;
  newDraft: (source: NewDraftSource) => Promise<void>;
  deleteBlog: () => Promise<void>;
  checkSlugAvailable: (slug: string) => Promise<boolean>;
  renameBlogName: (slug: string) => Promise<void>;
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
  setUnsavedChangesAt: (unsavedChangesAt) => set({ unsavedChangesAt }),

  resetEditorState: () => {
    _getMarkdown = null;
    _setMarkdown = null;
    _creationPromise = null;
    set(initialState);
  },

  // ── Markdown accessor ──────────────────────────────────────────────────────

  registerMarkdownAccessor: (getter, setter) => {
    _getMarkdown = getter;
    _setMarkdown = setter;
  },

  getEditorContent: () => _getMarkdown?.() ?? '',

  applyEditorContent: (md) => _setMarkdown?.(md),

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

  // ── Internal: ensure blog exists before first save ─────────────────────────

  // ── fetchVersions ──────────────────────────────────────────────────────────

  fetchVersions: async () => {
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
        get().setBlogTitle(latest.blog_title ?? blogData?.blog_title ?? '');
        get().applyEditorContent(latest.blog_content ?? '');
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
            const res = await apiClient.post('/blogs', {
              blog_name: slugify(blogTitle || 'untitled'),
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
        parent_version_id: sorted[0]?.id ?? null,
        tags: currentBlog?.tags ?? '',
        blog_visibility: currentBlog?.blog_visibility ?? 'public',
        comment_status: currentBlog?.comment_status ?? 'open',
        notification_status: currentBlog?.notification_status ?? 'all',
        like_visibility: currentBlog?.like_visibility ?? 'open',
        view_visibility: currentBlog?.view_visibility ?? 'open',
      });

      await get().fetchVersions();
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
    if (!window.confirm('Delete this blog and all its versions? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/blogs/${blog.id}`);
      get().setBlog(null);
      get().setBlogVersions([]);
    } catch (err) {
      console.error('[BlogStore] deleteBlog failed', err);
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
