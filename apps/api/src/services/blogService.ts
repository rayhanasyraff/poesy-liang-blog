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

  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, options);

  if (!response.ok) {
    throw new Error(`Blog API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
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

      if (!response.success) {
        break;
      }

      const blogs = Array.isArray(response.data) ? response.data : response.data ? [response.data] : [];

      if (blogs.length === 0) {
        break;
      }

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

export async function fetchBlogs(limit = config.pagination.defaultLimit, offset = 0): Promise<BlogPost[]> {
  try {
    const endpoint = `${config.poesyliangNet.apiBaseUrl}/blogs?limit=${limit}&offset=${offset}`;
    const response = await fetchFromBlogApi(endpoint);

    if (!response.success || !response.data) {
      return [];
    }

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

    if (!response.success || !response.data) {
      return null;
    }

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
      id: response.data && !Array.isArray(response.data) ? (response.data as any).id : undefined
    };
  } catch (error) {
    console.error("Error inserting blog:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
