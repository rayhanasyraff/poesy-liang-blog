import type { Blog, ApiBlog } from '@/types/blog';
import { convertApiBlogToBlog } from './blog-utils';
import { fetchBlogs, fetchBlogById, fetchBlogVersions } from '@/api/api';

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

    // Filter for published blog posts only
    const publishedApiBlogs = apiBlogs.filter(blog =>
      (blog.blog_status === 'publish' || blog.blog_status === 'published') &&
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

// Function to get a specific published blog by slug (user-facing)
export async function getBlogBySlug(slug: string): Promise<Blog | null> {
  try {
    // Check if slug starts with "blog-" and extract ID
    if (slug.startsWith('blog-')) {
      const id = parseInt(slug.replace('blog-', ''));
      if (!isNaN(id)) {
        const apiBlog = await fetchBlogFromApiById(id);
        if (apiBlog) {
          // User side: only show published blogs
          if (!(apiBlog.blog_status === 'publish' || apiBlog.blog_status === 'published')) return null;
          return convertApiBlogToBlog(apiBlog);
        }
      }
    }

    // Normalize slug for comparison (encode to handle special characters)
    const encodedSlug = encodeURIComponent(slug).toLowerCase();
    const decodedSlug = decodeURIComponent(slug).toLowerCase();

    // Try fetching all API blogs to find by blog_name (slug) — published only
    try {
      const apiBlogs = await fetchAllBlogsFromApi();
      const matchingBlog = apiBlogs.find(blog => {
        if (!(blog.blog_status === 'publish' || blog.blog_status === 'published')) return false;
        const blogSlugRaw = (blog.blog_name || '').toString();
        const blogSlug = blogSlugRaw.toLowerCase();
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

    // Fall back to searching all published blogs
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

// Function to get a blog for admin preview — shows latest saved version (draft or published)
export async function getAdminBlogBySlug(slug: string): Promise<Blog | null> {
  try {
    let apiBlog: ApiBlog | null = null;

    // Resolve slug to ApiBlog (no status filter — admins see all)
    if (slug.startsWith('blog-')) {
      const id = parseInt(slug.replace('blog-', ''));
      if (!isNaN(id)) {
        apiBlog = await fetchBlogFromApiById(id);
      }
    }

    if (!apiBlog) {
      const encodedSlug = encodeURIComponent(slug).toLowerCase();
      const decodedSlug = decodeURIComponent(slug).toLowerCase();
      const apiBlogs = await fetchAllBlogsFromApi();
      apiBlog = apiBlogs.find(blog => {
        const blogSlug = (blog.blog_name || '').toString().toLowerCase();
        return blogSlug === slug.toLowerCase() ||
               blogSlug === encodedSlug ||
               blogSlug === decodedSlug ||
               decodeURIComponent(blogSlug) === decodedSlug;
      }) ?? null;
    }

    if (!apiBlog) return null;

    // Fetch all versions and pick the latest by version_number
    try {
      const versions = await fetchBlogVersions(apiBlog.id);
      if (versions && versions.length > 0) {
        const latest = versions.reduce((a, b) =>
          b.version_number > a.version_number ? b : a
        );
        // Overlay the latest version's content/title onto the base blog
        const base = convertApiBlogToBlog(apiBlog);
        return {
          ...base,
          content: latest.blog_content ?? base.content,
          tags: latest.tags ?? base.tags,
          metadata: {
            ...base.metadata,
            title: latest.blog_title || base.metadata.title,
            summary: latest.blog_excerpt
              ? latest.blog_excerpt
              : base.metadata.summary,
          },
        };
      }
    } catch (versionError) {
      console.warn('Could not fetch blog versions, falling back to published content:', versionError);
    }

    // Fall back to published content if no versions found
    return convertApiBlogToBlog(apiBlog);
  } catch (error) {
    console.error('Error fetching admin blog by slug:', error);
    return null;
  }
}
