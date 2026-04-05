import { apiClient } from '@/api/core/client';

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