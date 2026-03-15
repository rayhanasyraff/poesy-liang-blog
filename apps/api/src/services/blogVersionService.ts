import { config } from '../config/config';
import type { BlogVersion } from '../types/blogPost';

const { apiBaseUrl, bearerToken } = config.poesyliangNet;

async function request<T>(path: string): Promise<T> {
  const opts: RequestInit = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  };
  const res = await fetch(`${apiBaseUrl}${path}`, opts);
  if (!res.ok) {
    throw new Error(`Remote API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function listVersions(
  blogId: string,
  limit = config.pagination.defaultLimit,
  offset = 0,
  status?: string
): Promise<BlogVersion[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (status) params.set('status', status);
  const path = `/blogs/${blogId}/versions?${params.toString()}`;
  const data = await request<{ success: boolean; data: BlogVersion[] }>(path);
  return data.data ?? [];
}

export async function getVersionById(blogId: string, versionId: string): Promise<BlogVersion | null> {
  const data = await request<{ success: boolean; data: BlogVersion }>(
    `/blogs/${blogId}/versions/${versionId}`
  );
  return data.data ?? null;
}
