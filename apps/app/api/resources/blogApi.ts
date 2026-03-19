import { apiClient } from '@/api/core/client';
import type { ApiResponse, ApiBlog, BlogSettings, BlogVersionSummary } from '@/types/blog';

// GET - Fetch blogs with pagination
export const getBlogs = async (
  limit = 50, 
  offset = 0,
  include_versions = false,
  blog_status?: string,
  blog_visibility?: string,
  version_status?: string
) => {
  const res = await apiClient.get(`/blogs`, { params: { limit, offset, include_versions, blog_status, blog_visibility, version_status } });
  return Array.isArray(res.data.data) ? res.data.data : [res.data.data];
};

// GET - Fetch a single blog by ID
export const getBlogById = async (id: number | string) => {
  
  const res = await apiClient.get<ApiResponse>(`/blogs/${id}`);

  if (!res.data.success || !res.data.data) {
    return null;
  }

  return Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
};


export const deleteBlogById = async (id: number | string) => {
  const res = await apiClient.delete(`/blogs/${id}`);
  return res.data;
}

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

// ── Blog versioning ───────────────────────────────────────────────────────────

// GET - Fetch all versions for a blog
export const getBlogVersions = async (blogId: number | string): Promise<BlogVersionSummary[]> => {
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
  const res = await apiClient.post(`/blogs/${blogId}/versions/draft`, data);
  return res.data.data;
};

// POST - Publish blog (saves as committed version then copies to blogs table)
export const publishBlog = async (
  blogId: number | string,
  data: { blog_title: string; blog_content: string } & Partial<BlogSettings>
): Promise<void> => {
  await apiClient.post(`/blogs/${blogId}/versions/publish`, data);
};

// POST - Publish a specific committed version
export const publishBlogVersion = async (
  blogId: number | string,
  versionId: number
): Promise<void> => {
  await apiClient.post(`/blogs/${blogId}/versions/${versionId}/publish`, {});
};

// POST - Revert published blog to a committed version
export const revertBlogVersion = async (
  blogId: number | string,
  versionId: number
): Promise<void> => {
  await apiClient.post(`/blogs/${blogId}/versions/${versionId}/revert`, {});
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
