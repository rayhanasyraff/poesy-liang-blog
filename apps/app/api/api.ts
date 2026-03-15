import { apiClient } from './client';
import type { ApiResponse, ApiBlog, ApiBlogWithVersion, BlogSettings, BlogVersionSummary } from '@/types/blog';

// GET - Fetch blogs with pagination
export const fetchBlogs = async (limit = 50, offset = 0): Promise<ApiBlog[]> => {
  const res = await apiClient.get<ApiResponse>(`/blogs`, { params: { limit, offset } });
  if (!res.data.success) throw new Error('API returned unsuccessful response');
  return Array.isArray(res.data.data) ? res.data.data : [res.data.data];
};

// GET - Fetch blogs with latest-version overlay (admin homepage — no status/visibility filter)
export const fetchBlogsWithVersions = async (
  limit = 20,
  offset = 0
): Promise<{ rows: ApiBlogWithVersion[]; nextOffset: number | null }> => {
  // Use proxy path in the browser so the Express URL is resolved server-side
  const base = typeof window !== 'undefined'
    ? '/api/proxy'
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
  const res = await fetch(
    `${base}/blogs?limit=${limit}&offset=${offset}&include_versions=true`,
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (!res.ok) throw new Error(`Failed to fetch blogs: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error('API returned unsuccessful response');
  const rows: ApiBlogWithVersion[] = Array.isArray(data.data) ? data.data : [data.data];
  return { rows, nextOffset: data.nextOffset ?? null };
};

// GET - Fetch a single blog by ID
export const fetchBlogById = async (id: number | string): Promise<ApiBlog | null> => {
  const res = await apiClient.get<ApiResponse>(`/blogs/${id}`);

  if (!res.data.success || !res.data.data) {
    return null;
  }

  return Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
};

// GET - Fetch wp_posts from poesyliang.com
export const fetchPoesyliangComWpPosts = async (limit = 50, offset = 0) => {
  const res = await apiClient.get(`/poesyliang.com/wp-posts`, {
    params: { limit, offset },
  });
  return res.data;
};

// GET - Fetch wp_posts from poesyliang.net
export const fetchPoesyliangNetWpPosts = async (limit = 50, offset = 0) => {
  const res = await apiClient.get(`/poesyliang.net/wp-posts`, {
    params: { limit, offset },
  });
  return res.data;
};

// POST - Create a new blog
export const createBlog = async (blogData: Partial<ApiBlog>) => {
  const res = await apiClient.post('/blogs', blogData);
  return res.data;
};

// POST - Run migration from wp_posts to blogs
export const migrateBlogsFromWpPosts = async () => {
  const res = await apiClient.post('/migrate-wp-posts-journals-into-blogs');
  return res.data;
};

// GET - Get migration summary
export const getMigrationSummary = async () => {
  const res = await apiClient.get('/migrate-wp-posts-journals-into-blogs/summary');
  return res.data;
};

// ── Blog versioning ───────────────────────────────────────────────────────────

// GET - Fetch all versions for a blog
export const fetchBlogVersions = async (blogId: number | string): Promise<BlogVersionSummary[]> => {
  const res = await apiClient.get(`/blogs/${blogId}/versions`);
  return res.data.data ?? [];
};

// POST - Save a draft version
export const saveBlogDraft = async (
  blogId: number | string,
  data: {
    blog_title: string;
    blog_content: string;
  } & Partial<BlogSettings>
): Promise<{ id: number; version_number: number }> => {
  const res = await apiClient.post(`/blogs/${blogId}/versions`, data);
  return res.data.data;
};

// PUT - Commit a draft version
export const commitBlogVersion = async (
  blogId: number | string,
  versionId: number
): Promise<void> => {
  await apiClient.put(`/blogs/${blogId}/versions/${versionId}`);
};

// POST - Publish blog (saves as committed version then copies to blogs table)
export const publishBlog = async (
  blogId: number | string,
  data: { blog_title: string; blog_content: string } & Partial<BlogSettings>
): Promise<void> => {
  await apiClient.post(`/blogs/${blogId}/publish`, data);
};

// POST - Publish a specific committed version
export const publishBlogVersion = async (
  blogId: number | string,
  versionId: number
): Promise<void> => {
  await apiClient.post(`/blogs/${blogId}/publish/${versionId}`, {});
};

// POST - Revert published blog to a committed version
export const revertBlogVersion = async (
  blogId: number | string,
  versionId: number
): Promise<void> => {
  await apiClient.post(`/blogs/${blogId}/revert/${versionId}`, {});
};

// PATCH - Update blog settings only (visibility, comments, etc.)
export const updateBlogSettings = async (
  blogId: number | string,
  settings: Partial<BlogSettings>
): Promise<void> => {
  await apiClient.patch(`/blogs/${blogId}/settings`, settings);
};

// POST - Unpublish a blog (revert to draft status)
export const unpublishBlog = async (blogId: number | string): Promise<void> => {
  await apiClient.post(`/blogs/${blogId}/unpublish`, {});
};
