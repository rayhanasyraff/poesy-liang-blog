import { apiClient } from './client';
import type { ApiResponse, ApiBlog } from '@/types/blog';

// GET - Fetch all blogs with pagination
export const fetchBlogs = async (limit = 50, offset = 0): Promise<ApiBlog[]> => {
  const res = await apiClient.get<ApiResponse>(`/blogs`, {
    params: { limit, offset },
  });

  if (!res.data.success) {
    throw new Error('API returned unsuccessful response');
  }

  return Array.isArray(res.data.data) ? res.data.data : [res.data.data];
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
