import { create } from 'zustand';
import { createBlogDataSlice } from './slices/blogDataSlice';
import { createUIListSlice } from './slices/uiListSlice';

export const useBlogStore = create((set: any, get: any) => ({
  ...createBlogDataSlice(set, get),
  ...createUIListSlice(set, get),
  // Combined reset that resets both slices
  resetStore: () => set({
    blogs: [],
    apiBlogs: [],
    currentBlog: null,
    isLoading: false,
    error: null,
    currentPage: 0,
    limit: 50,
    hasMore: true,
    adminScrollY: 0,
    publicScrollY: 0,
    removedIds: [],
  }),
}));

