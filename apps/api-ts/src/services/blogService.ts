import type { BlogPost, BlogPostApiResponse } from "../types/blogPost";
import { config } from "../config/config";

async function fetchFromBlogApi(endpoint: string, method = "GET", body?: BlogPost): Promise<BlogPostApiResponse> {
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${config.poesyliangNet.bearerToken}`,
      "Content-Type": "application/json",
    }
  };

  if (body && method.toUpperCase() !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, options);

  if (!response.ok) {
    throw new Error(`Blog API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<BlogPostApiResponse>;
}

export async function fetchAllBlogs(): Promise<BlogPost[]> {
  try {
    const allBlogs: BlogPost[] = [];
    let offset = 0;
    const limit = config.pagination.fetchLimit;
    let hasMore = true;

    while (hasMore) {
      const endpoint = `${config.poesyliangNet.apiBaseUrl}/blogs?limit=${limit}&offset=${offset}`;
      const response = await fetchFromBlogApi(endpoint);

      if (!response.success) break;

      const blogs = Array.isArray(response.data) ? response.data : response.data ? [response.data] : [];

      if (blogs.length === 0) break;

      allBlogs.push(...blogs);

      if (blogs.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    return allBlogs;
  } catch (error) {
    console.error("Error fetching blogs from Blog API:", error);
    return [];
  }
}

export async function fetchBlogs(limit = config.pagination.defaultLimit, offset = 0, blog_status?: string, blog_visibility?: string): Promise<BlogPost[]> {
  try {
    // If caller requested both status and visibility (e.g., published + public),
    // first fetch all posts, filter to that set, then apply pagination locally.
    if (typeof blog_status === 'string' && typeof blog_visibility === 'string') {
      const all = await fetchAllBlogs();
      const statusLower = blog_status.toLowerCase();
      // Treat "published" and "publish" as equivalent upstream values
      const statusSet = (statusLower === 'publish' || statusLower === 'published')
        ? new Set(['publish', 'published'])
        : new Set([blog_status]);

      const filtered = all.filter(b => {
        const bs = (b.blog_status ?? '').toString();
        const bv = (b.blog_visibility ?? '').toString();
        return statusSet.has(bs) && bv === blog_visibility;
      });

      const start = Math.max(0, offset);
      const end = start + Math.max(0, limit);
      return filtered.slice(start, end);
    }

    // Fallback: let upstream handle filtering/pagination
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    if (blog_status) params.append('blog_status', blog_status);
    if (blog_visibility) params.append('blog_visibility', blog_visibility);

    const endpoint = `${config.poesyliangNet.apiBaseUrl}/blogs?${params.toString()}`;
    const response = await fetchFromBlogApi(endpoint);

    if (!response.success || !response.data) return [];

    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error) {
    console.error("Error fetching blogs from Blog API:", error);
    return [];
  }
}

export async function fetchBlogById(id: string): Promise<BlogPost | null> {
  try {
    const endpoint = `${config.poesyliangNet.apiBaseUrl}/blogs/${id}`;
    const response = await fetchFromBlogApi(endpoint);

    if (!response.success || !response.data) return null;

    return Array.isArray(response.data) ? (response.data[0] || null) : response.data;
  } catch (error) {
    console.error(`Error fetching blog ${id} from Blog API:`, error);
    return null;
  }
}

export async function insertBlog(blog: BlogPost): Promise<{ success: boolean; message?: string; id?: string }> {
  try {
    const endpoint = `${config.poesyliangNet.apiBaseUrl}/blogs`;
    const response = await fetchFromBlogApi(endpoint, "POST", blog);

    return {
      success: response.success,
      message: response.message,
      id: response.id != null ? String(response.id) : (response.data && !Array.isArray(response.data) ? String((response.data as any).id) : undefined)
    };
  } catch (error) {
    console.error("Error inserting blog:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function deleteBlogById(id: string): Promise<any> {
  try {
    const endpoint = `${config.poesyliangNet.apiBaseUrl}/blogs/${id}`;
    // Upstream API expects a DELETE; no body
    const response = await fetchFromBlogApi(endpoint, "DELETE");
    return response;
  } catch (error) {
    console.error(`Error deleting blog ${id}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function checkBlogNameAvailable(slug: string, excludeId?: string | number): Promise<boolean> {
  if (!slug) return false;
  try {
    const endpoint = `${config.poesyliangNet.apiBaseUrl}/blogs?blog_name=${encodeURIComponent(slug)}&limit=5&offset=0`;
    const response = await fetchFromBlogApi(endpoint);
    if (!response.success) return true;
    const blogs = Array.isArray(response.data) ? response.data : response.data ? [response.data] : [];
    if (excludeId != null) {
      return !blogs.some((b: any) => String(b.id) !== String(excludeId) && b.blog_name === slug);
    }
    return blogs.length === 0;
  } catch {
    return true;
  }
}
