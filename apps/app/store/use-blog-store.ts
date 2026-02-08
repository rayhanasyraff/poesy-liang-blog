import { create } from 'zustand';
import type { ApiBlog, Blog } from '@/types/blog';
import { fetchBlogs, fetchBlogById } from '@/api/api';
import { convertApiBlogToBlog } from '@/lib/blog-utils';

interface BlogStore {
  // State
  blogs: Blog[];
  apiBlogs: ApiBlog[];
  currentBlog: Blog | null;
  isLoading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  limit: number;
  hasMore: boolean;

  // Actions
  setBlogs: (blogs: Blog[]) => void;
  setCurrentBlog: (blog: Blog | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API Actions
  fetchAndSetBlogs: (limit?: number, offset?: number) => Promise<void>;
  fetchAndSetBlogById: (id: number | string) => Promise<void>;
  loadMoreBlogs: () => Promise<void>;
  resetStore: () => void;
}

export const useBlogStore = create<BlogStore>((set, get) => ({
  // Initial state
  blogs: [],
  apiBlogs: [],
  currentBlog: null,
  isLoading: false,
  error: null,
  currentPage: 0,
  limit: 50,
  hasMore: true,

  // Setters
  setBlogs: (blogs) => set({ blogs }),
  setCurrentBlog: (blog) => set({ currentBlog: blog }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Fetch and set blogs from API
  fetchAndSetBlogs: async (limit = 50, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const apiBlogs = await fetchBlogs(limit, offset);

      // Filter for published blogs
      const publishedApiBlogs = apiBlogs.filter(blog =>
        (blog.blog_status === 'publish' || blog.blog_status === 'draft') &&
        blog.blog_content.trim() !== '' &&
        blog.blog_title.trim() !== '' &&
        blog.blog_title !== 'Auto Draft'
      );

      // Convert to Blog format
      const convertedBlogs = publishedApiBlogs.map(convertApiBlogToBlog);

      // Sort by publishedAt date (newest first)
      convertedBlogs.sort((a, b) => {
        const dateA = new Date(a.metadata.publishedAt).getTime();
        const dateB = new Date(b.metadata.publishedAt).getTime();
        return dateB - dateA;
      });

      set({
        apiBlogs,
        blogs: convertedBlogs,
        isLoading: false,
        hasMore: apiBlogs.length === limit
      });
    } catch (error) {
      console.error('Error fetching blogs:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch blogs',
        isLoading: false
      });
    }
  },

  // Fetch and set a single blog by ID
  fetchAndSetBlogById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const apiBlog = await fetchBlogById(id);
      if (apiBlog) {
        const blog = convertApiBlogToBlog(apiBlog);
        set({ currentBlog: blog, isLoading: false });
      } else {
        set({
          currentBlog: null,
          error: 'Blog not found',
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch blog',
        currentBlog: null,
        isLoading: false
      });
    }
  },

  // Load more blogs (pagination)
  loadMoreBlogs: async () => {
    const { currentPage, limit, hasMore, blogs: currentBlogs } = get();

    if (!hasMore || get().isLoading) return;

    set({ isLoading: true });
    const nextOffset = (currentPage + 1) * limit;

    try {
      const apiBlogs = await fetchBlogs(limit, nextOffset);

      const publishedApiBlogs = apiBlogs.filter(blog =>
        (blog.blog_status === 'publish' || blog.blog_status === 'draft') &&
        blog.blog_content.trim() !== '' &&
        blog.blog_title.trim() !== '' &&
        blog.blog_title !== 'Auto Draft'
      );

      const convertedBlogs = publishedApiBlogs.map(convertApiBlogToBlog);

      set({
        blogs: [...currentBlogs, ...convertedBlogs],
        currentPage: currentPage + 1,
        hasMore: apiBlogs.length === limit,
        isLoading: false
      });
    } catch (error) {
      console.error('Error loading more blogs:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load more blogs',
        isLoading: false
      });
    }
  },

  // Reset store to initial state
  resetStore: () => set({
    blogs: [],
    apiBlogs: [],
    currentBlog: null,
    isLoading: false,
    error: null,
    currentPage: 0,
    hasMore: true
  })
}));
