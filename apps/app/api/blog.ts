import type { ApiBlog } from '@/types/blog';
import { convertApiBlogToBlog } from '@/lib/blog-utils';
import { fetchBlogsWithVersions as _fetchBlogsWithVersions, fetchBlogs as _fetchBlogs, fetchBlogById as _fetchBlogById } from './api';

export const API_BASE_URL = typeof window !== 'undefined' ? '/api/proxy' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
export const PAGE_SIZE = 20;

export const fetchBlogs = _fetchBlogs;
export const fetchBlogById = _fetchBlogById;
export const fetchBlogsWithVersions = _fetchBlogsWithVersions;

// Return admin page rows already converted to internal Blog type shape
export async function fetchAdminPage(offset: number): Promise<{ rows: any[]; nextOffset: number | undefined }> {
  const { rows, nextOffset } = await fetchBlogsWithVersions(PAGE_SIZE, offset);
  const blogs = rows.map((row: ApiBlog & any) => {
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
        // Show draft title only when draft is actually ahead of published version
        title: isDraftAhead
          ? (row.latest_draft_blog_title ?? base.metadata.title)
          : (row.latest_committed_blog_title ?? base.metadata.title),
        summary: row.latest_blog_excerpt || base.metadata.summary,
      },
      apiData: base.apiData
        ? {
            ...base.apiData,
            blog_version: row.latest_version_number ?? undefined,
            // Pass through both draft and committed version info for admin card
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
  return { rows: blogs, nextOffset: nextOffset ?? undefined };
}

// Public homepage: published + public blogs only
export async function fetchPublicPage(offset: number): Promise<{ rows: any[]; nextOffset: number | undefined }> {
  const res = await fetch(
    `${API_BASE_URL}/blogs?limit=${PAGE_SIZE}&offset=${offset}&blog_status=published&blog_visibility=public&include_versions=true&version_status=committed`,
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (!res.ok) throw new Error(`Failed to fetch blogs: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error('API returned unsuccessful response');
  const apiRows: ApiBlog[] = Array.isArray(data.data) ? data.data : [data.data];
  const rows = apiRows.map((row: ApiBlog & any) => {
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
