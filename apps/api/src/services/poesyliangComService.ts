import type { WpPost, WpPostApiResponse } from "../types/wpPost";
import { config } from "../config/config";

async function fetchFromPoesyliangComApi(endpoint: string): Promise<WpPostApiResponse> {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${config.poesyliangCom.bearerToken}`,
      "Content-Type": "application/json",
    }
  });

  if (!response.ok) {
    throw new Error(`PoesyliangCom API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchAllPoesyliangComWpPosts(): Promise<WpPost[]> {
  try {
    const allWpPosts: WpPost[] = [];
    let offset = 0;
    const limit = config.pagination.fetchLimit;
    let hasMore = true;

    while (hasMore) {
      const endpoint = `${config.poesyliangCom.apiBaseUrl}/wp_posts?limit=${limit}&offset=${offset}`;
      const response = await fetchFromPoesyliangComApi(endpoint);

      if (!response.success) {
        break;
      }

      const wpPosts = Array.isArray(response.data) ? response.data : [response.data];

      if (wpPosts.length === 0) {
        break;
      }

      allWpPosts.push(...wpPosts);

      if (wpPosts.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    return allWpPosts;
  } catch (error) {
    console.error("Error fetching wp_posts from PoesyliangCom API:", error);
    return [];
  }
}

export async function fetchPoesyliangComWpPosts(limit = config.pagination.defaultLimit, offset = 0): Promise<WpPost[]> {
  try {
    const endpoint = `${config.poesyliangCom.apiBaseUrl}/wp_posts?limit=${limit}&offset=${offset}`;
    const response = await fetchFromPoesyliangComApi(endpoint);

    if (!response.success) {
      return [];
    }

    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error) {
    console.error("Error fetching wp_posts from PoesyliangCom API:", error);
    return [];
  }
}
