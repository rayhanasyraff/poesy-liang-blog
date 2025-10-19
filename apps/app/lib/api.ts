import type { Blog, ApiBlog } from '@/types/blog';
import { convertApiBlogToBlog } from './blog-utils';
import { fetchBlogs, fetchBlogById } from '@/api/api';

// Cache for all API blogs
let allApiBlogsCache: ApiBlog[] | null = null;

// Fetch ALL blogs from API with caching
export async function fetchAllBlogsFromApi(): Promise<ApiBlog[]> {
  if (allApiBlogsCache) {
    return allApiBlogsCache;
  }

  try {
    const allBlogs: ApiBlog[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    // Keep fetching until we get all blogs
    while (hasMore) {
      const blogs = await fetchBlogs(limit, offset);

      if (blogs.length === 0) {
        hasMore = false;
        break;
      }

      allBlogs.push(...blogs);

      // If we got fewer blogs than requested, we've reached the end
      if (blogs.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    allApiBlogsCache = allBlogs;
    return allBlogs;
  } catch (error) {
    console.error('Error fetching all blogs from API:', error);
    return [];
  }
}

export async function fetchBlogsFromApi(limit = 50, offset = 0) {
  try {
    return await fetchBlogs(limit, offset);
  } catch (error) {
    console.error('Error fetching blogs from API:', error);
    return []; // Return empty array instead of throwing to allow MDX blogs to still work
  }
}

export async function fetchBlogFromApiById(id: number) {
  try {
    return await fetchBlogById(id);
  } catch (error) {
    console.error('Error fetching blog from API:', error);
    return null;
  }
}

// Function to fetch all blogs from API
export async function fetchBlogsCompatible(): Promise<Blog[]> {
  try {
    // Fetch API blogs
    let apiBlogs: ApiBlog[] = [];
    try {
      apiBlogs = await fetchBlogsFromApi(50);
    } catch (apiError) {
      console.warn('API blogs failed to load:', apiError);
      return [];
    }

    // Filter for published blog posts only (include drafts for testing)
    const publishedApiBlogs = apiBlogs.filter(blog =>
      (blog.blog_status === 'publish' || blog.blog_status === 'draft') &&
      blog.blog_content.trim() !== '' &&
      blog.blog_title.trim() !== '' &&
      blog.blog_title !== 'Auto Draft'
    );

    // Convert API blogs to compatible format
    const convertedApiBlogs = publishedApiBlogs.map(convertApiBlogToBlog);

    // Sort by publishedAt date (newest first)
    convertedApiBlogs.sort((a, b) => {
      const dateA = new Date(a.metadata.publishedAt).getTime();
      const dateB = new Date(b.metadata.publishedAt).getTime();
      return dateB - dateA;
    });

    return convertedApiBlogs;
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return [];
  }
}

// Function to get a specific blog by slug
export async function getBlogBySlug(slug: string): Promise<Blog | null> {
  try {
    // Check if slug starts with "blog-" and extract ID
    if (slug.startsWith('blog-')) {
      const id = parseInt(slug.replace('blog-', ''));
      if (!isNaN(id)) {
        const apiBlog = await fetchBlogFromApiById(id);
        if (apiBlog) {
          return convertApiBlogToBlog(apiBlog);
        }
      }
    }

    // Normalize slug for comparison (encode to handle special characters)
    const encodedSlug = encodeURIComponent(slug).toLowerCase();
    const decodedSlug = decodeURIComponent(slug).toLowerCase();

    // Try fetching all API blogs to find by blog_name (slug)
    try {
      const apiBlogs = await fetchAllBlogsFromApi(); // Fetch ALL blogs with caching
      const matchingBlog = apiBlogs.find(blog => {
        const blogSlug = blog.blog_name.toLowerCase();
        // Try exact match, decoded match, or encoded match
        return blogSlug === slug.toLowerCase() ||
               blogSlug === encodedSlug ||
               blogSlug === decodedSlug ||
               decodeURIComponent(blogSlug) === decodedSlug;
      });
      if (matchingBlog) {
        return convertApiBlogToBlog(matchingBlog);
      }
    } catch (apiError) {
      console.warn('Could not search API blogs by slug:', apiError);
    }

    // Fall back to searching all blogs (MDX + API)
    const allBlogs = await fetchBlogsCompatible();
    return allBlogs.find(blog => {
      const blogSlug = blog.slug.toLowerCase();
      return blogSlug === slug.toLowerCase() ||
             blogSlug === encodedSlug ||
             blogSlug === decodedSlug ||
             decodeURIComponent(blogSlug) === decodedSlug;
    }) || null;
  } catch (error) {
    console.error('Error fetching blog by slug:', error);
    return null;
  }
}
