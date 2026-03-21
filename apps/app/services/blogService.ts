import { cache } from 'react';
import { getBlogs, getBlogById, getBlogVersions } from '@/api/resources/blogApi';
import { convertApiBlogToBlog } from '@/lib/blog-utils';
import type { ApiBlog, Blog } from '@/types/blog';

// Module-level cache + in-flight dedup for fetchAllBlogs.
// The in-flight promise prevents concurrent requests from each firing
// their own paging loop before the first one resolves.
let allApiBlogsCache: ApiBlog[] | null = null;
let allApiBlogsInflight: Promise<ApiBlog[]> | null = null;

export const PAGE_SIZE = 20;

// Admin/public page helpers moved from apps/app/api/blog.ts
export async function fetchAdminPage(offset: number): Promise<{ rows: any[]; nextOffset: number | undefined }> {
  const rows = await getBlogs(PAGE_SIZE, offset, true);
  const nextOffset = rows.length === PAGE_SIZE ? offset + PAGE_SIZE : undefined;
  const blogs = rows.map((row: any) => {
    const base = convertApiBlogToBlog(row as unknown as ApiBlog);
    const draftV = row.latest_draft_version_number ?? null;
    const committedV = row.latest_committed_version_number ?? null;
    const isDraftAhead = draftV != null && (committedV == null || draftV > committedV);
    return {
      ...base,
      content: row.latest_blog_content ?? base.content,
      tags: row.latest_tags ?? base.tags,
      metadata: {
        ...base.metadata,
        title: isDraftAhead
          ? (row.latest_draft_blog_title ?? base.metadata.title)
          : (row.latest_committed_blog_title ?? base.metadata.title),
        summary: row.latest_blog_excerpt || base.metadata.summary,
      },
      apiData: base.apiData
        ? {
            ...base.apiData,
            blog_version: row.latest_version_number ?? undefined,
            latest_draft_version_number: row.latest_draft_version_number ?? undefined,
            latest_draft_blog_title: row.latest_draft_blog_title ?? undefined,
            latest_draft_saved_at: row.latest_draft_saved_at ?? undefined,
            latest_committed_version_number: row.latest_committed_version_number ?? undefined,
            latest_committed_blog_title: row.latest_committed_blog_title ?? undefined,
            latest_committed_published_at: row.latest_committed_published_at ?? undefined,
          }
        : base.apiData,
    };
  });
  return { rows: blogs, nextOffset };
}

// Public homepage: published + public blogs only
export async function fetchPublicPage(offset: number): Promise<{ rows: any[]; nextOffset: number | undefined }> {
  
  const blogs = await getBlogs(PAGE_SIZE, offset, true, 'published', 'public', 'committed');  
  const apiRows: ApiBlog[] = Array.isArray(blogs) ? blogs : [blogs];
  const rows = apiRows.map((row: any) => {
    const base = convertApiBlogToBlog(row as unknown as ApiBlog);
    return {
      ...base,
      content: (row as any).latest_blog_content ?? base.content,
      tags: (row as any).latest_tags ?? base.tags,
      metadata: {
        ...base.metadata,
        title: (row as any).latest_blog_title || base.metadata.title,
        summary: (row as any).latest_blog_excerpt || base.metadata.summary,
      },
      apiData: base.apiData
        ? { ...base.apiData, blog_version: (row as any).latest_version_number ?? undefined }
        : base.apiData,
    };
  });
  const nextOffset = apiRows.length === PAGE_SIZE ? offset + PAGE_SIZE : undefined;
  return { rows, nextOffset };
}

// Fetch ALL blogs from API with caching + in-flight dedup
export function fetchAllBlogs(): Promise<ApiBlog[]> {
  if (allApiBlogsCache) return Promise.resolve(allApiBlogsCache);
  if (allApiBlogsInflight) return allApiBlogsInflight;

  allApiBlogsInflight = (async () => {
    try {
      const allBlogs: ApiBlog[] = [];
      let offset = 0;
      const limit = 50;

      while (true) {
        const blogs = await getBlogs(limit, offset);
        if (!blogs.length) break;
        allBlogs.push(...blogs);
        if (blogs.length < limit) break;
        offset += limit;
      }

      allApiBlogsCache = allBlogs;
      return allBlogs;
    } catch (error) {
      console.error('Error fetching all blogs from API:', error);
      return [];
    } finally {
      allApiBlogsInflight = null;
    }
  })();

  return allApiBlogsInflight;
}

export async function fetchBlogFromApiById(id: number) {
  try {
    return await getBlogById(id);
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
      apiBlogs = await getBlogs();
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

// Overlay the latest committed/published version onto a blog for public display.
// This ensures draft edits never leak through even if the upstream API writes
// draft content back to the blogs table row.
async function overlayCommittedVersion(apiBlog: ApiBlog): Promise<Blog> {
  try {
    const versions = await getBlogVersions(apiBlog.id);
    if (versions && versions.length > 0) {
      const committed = versions.filter(v => v.status === 'committed' || v.status === 'published');
      if (committed.length > 0) {
        const latest = committed.reduce((a, b) => b.version_number > a.version_number ? b : a);
        const base = convertApiBlogToBlog(apiBlog);
        return {
          ...base,
          content: latest.blog_content ?? base.content,
          tags: latest.tags ?? base.tags,
          metadata: {
            ...base.metadata,
            title: latest.blog_title || base.metadata.title,
            summary: latest.blog_excerpt || base.metadata.summary,
          },
        };
      }
    }
  } catch {
    // Fall back to blog row content if version fetch fails
  }
  return convertApiBlogToBlog(apiBlog);
}

// Function to get a specific published blog by slug (user-facing).
// Wrapped with React.cache() so concurrent calls within the same render pass
// (e.g. generateMetadata + the page component) share a single fetch.
export const getBlogBySlug = cache(async (slug: string): Promise<Blog | null> => {
  try {
    // Check if slug starts with "blog-" and extract ID
    if (slug.startsWith('blog-')) {
      const id = Number.parseInt(slug.replace('blog-', ''));
      if (!Number.isNaN(id)) {
        const apiBlog = await fetchBlogFromApiById(id);
        if (apiBlog) {
          // User side: only show published blogs
          if (!(apiBlog.blog_status === 'publish' || apiBlog.blog_status === 'published')) return null;
          return overlayCommittedVersion(apiBlog);
        }
      }
    }

    // Normalize slug for comparison (encode to handle special characters)
    const encodedSlug = encodeURIComponent(slug).toLowerCase();
    const decodedSlug = decodeURIComponent(slug).toLowerCase();

    // Fetch all API blogs and find by blog_name (slug) — published only
    const apiBlogs = await fetchAllBlogs();
    const matchingBlog = apiBlogs.find(blog => {
      if (!(blog.blog_status === 'publish' || blog.blog_status === 'published')) return false;
      const blogSlug = (blog.blog_name || '').toString().toLowerCase();
      return blogSlug === slug.toLowerCase() ||
             blogSlug === encodedSlug ||
             blogSlug === decodedSlug ||
             decodeURIComponent(blogSlug) === decodedSlug;
    });
    if (matchingBlog) {
      return overlayCommittedVersion(matchingBlog);
    }

    return null;
  } catch (error) {
    console.error('Error fetching blog by slug:', error);
    return null;
  }
});

// Function to get a blog for admin preview — shows latest saved version (draft or published)
export async function getAdminBlogBySlug(slug: string): Promise<Blog | null> {
  try {
    let apiBlog: ApiBlog | null = null;

    // Resolve slug to ApiBlog (no status filter — admins see all)
    // Handle plain numeric id (e.g. "123")
    const numericId = Number(slug);
    if (!Number.isNaN(numericId) && slug.trim() !== '') {
      apiBlog = await getBlogById(numericId);
    } else if (slug.startsWith('blog-')) {
      const id = Number.parseInt(slug.replace('blog-', ''));
      if (!Number.isNaN(id)) {
        apiBlog = await fetchBlogFromApiById(id);
      }
    }

    if (!apiBlog) {
      const encodedSlug = encodeURIComponent(slug).toLowerCase();
      const decodedSlug = decodeURIComponent(slug).toLowerCase();
      const apiBlogs = await fetchAllBlogs();
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
      const versions = await getBlogVersions(apiBlog.id);
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
