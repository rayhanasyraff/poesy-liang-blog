import { config } from '../config/config';
import type { BlogVersion, BlogPost } from '../types/blogPost';

const { apiBaseUrl, bearerToken } = config.poesyliangNet;

async function apiRequest<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  try {
    console.debug(`[versioningService] apiRequest ${method} ${url}`, {
      body: body ? (typeof body === 'object' ? body : body) : undefined,
    });
    const res = await fetch(url, opts);
    const text = await res.text();
    let parsed: any = text;
    try { parsed = text ? JSON.parse(text) : text; } catch {}
    if (!res.ok) {
      console.error(`[versioningService] Upstream API ${method} ${url} returned ${res.status} ${res.statusText}`, { status: res.status, body: parsed });
      const err = new Error(`API ${method} ${path} failed: ${res.status} ${res.statusText} - ${typeof parsed === 'object' ? JSON.stringify(parsed) : parsed}`);
      (err as any).status = res.status;
      (err as any).body = parsed;
      throw err;
    }
    return parsed as T;
  } catch (err: any) {
    console.error(`[versioningService] apiRequest error for ${method} ${url}`, { error: err && (err.stack || err.message || err) });
    throw err;
  }
}

type VersionResp = { success: boolean; data: BlogVersion | BlogVersion[]; returned_rows?: number };
type BlogResp = { success: boolean; data: BlogPost };

/** Returns the latest version (highest version_number) for a blog, or null if none. */
export async function getLatestVersion(blogId: number | string): Promise<BlogVersion | null> {
  try {
    const data = await apiRequest<VersionResp>(`/blogs/${blogId}/versions?limit=100&offset=0`);
    const versions = Array.isArray(data.data) ? data.data : data.data ? [data.data] : [];
    if (!versions.length) return null;
    return versions.reduce((a, b) => (b.version_number > a.version_number ? b : a));
  } catch (err) {
    console.error(`[versioningService] getLatestVersion failed for blog ${blogId}`, { error: err && (err.stack || err.message || err) });
    return null;
  }
}

export interface DraftData {
  blog_title: string;
  blog_content: string;
  blog_excerpt?: string;
  tags?: string | null;
  blog_visibility?: string;
  comment_status?: string;
  like_visibility?: string;
  view_visibility?: string;
}

/**
 * Save Draft logic:
 * - If current latest version is 'draft': UPDATE it (content + draft_saved_at)
 * - If current latest version is published/committed or none: INSERT new draft version
 * Returns { id, version_number }
 */
export async function saveDraft(
  blogId: number | string,
  draftData: DraftData
): Promise<{ id: number; version_number: number }> {
  try {
    const latest = await getLatestVersion(blogId);
    const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');

    if (latest && latest.status === 'draft') {
      // UPDATE existing draft
      const payload = {
        blog_title: draftData.blog_title,
        blog_content: draftData.blog_content,
        blog_excerpt: draftData.blog_excerpt ?? '',
        tags: draftData.tags ?? null,
        blog_visibility: draftData.blog_visibility,
        comment_status: draftData.comment_status,
        like_visibility: draftData.like_visibility,
        view_visibility: draftData.view_visibility,
        draft_saved_at: now,
      };
      console.info(`[versioningService] Updating draft for blog ${blogId}, version ${latest.version_number}`, { payload });
      try {
        await apiRequest(`/blogs/${blogId}/versions/${latest.id}`, 'PUT', payload);
      } catch (err: any) {
        const upstreamMsg = err && (err.body && (err.body.message || err.body.error)) || err && err.message || '';
        if (typeof upstreamMsg === 'string' && upstreamMsg.includes("Unknown column 'draft_saved_at'")) {
          const retryPayload = { ...payload };
          delete (retryPayload as any).draft_saved_at;
          console.warn(`[versioningService] Upstream schema missing 'draft_saved_at'; retrying update without it.`, { retryPayload, originalError: err });
          await apiRequest(`/blogs/${blogId}/versions/${latest.id}`, 'PUT', retryPayload);
        } else {
          throw err;
        }
      }
      return { id: latest.id, version_number: latest.version_number };
    }

    // INSERT new draft version
    const payload = {
      blog_title: draftData.blog_title,
      blog_content: draftData.blog_content,
      blog_excerpt: draftData.blog_excerpt ?? '',
      tags: draftData.tags ?? null,
      status: 'draft',
      draft_saved_at: now,
      blog_visibility: draftData.blog_visibility ?? 'public',
      comment_status: draftData.comment_status ?? 'open',
      like_visibility: draftData.like_visibility ?? 'open',
      view_visibility: draftData.view_visibility ?? 'open',
      created_at: now,
    };
    console.info(`[versioningService] Creating new draft for blog ${blogId}`, { payload });
    try {
      const resp = await apiRequest<{ success: boolean; id: number; version_number: number }>(
        `/blogs/${blogId}/versions`,
        'POST',
        payload
      );
      console.info(`[versioningService] Created draft id=${resp.id} version=${resp.version_number} for blog ${blogId}`);
      return { id: resp.id, version_number: resp.version_number };
    } catch (err: any) {
      const upstreamMsg = err && (err.body && (err.body.message || err.body.error)) || err && err.message || '';
      if (typeof upstreamMsg === 'string' && upstreamMsg.includes("Unknown column 'draft_saved_at'")) {
        const retryPayload = { ...payload };
        delete (retryPayload as any).draft_saved_at;
        console.warn(`[versioningService] Upstream schema missing 'draft_saved_at'; retrying create without it.`, { retryPayload, originalError: err });
        const resp2 = await apiRequest<{ success: boolean; id: number; version_number: number }>(
          `/blogs/${blogId}/versions`,
          'POST',
          retryPayload
        );
        console.info(`[versioningService] Created draft id=${resp2.id} version=${resp2.version_number} for blog ${blogId} (without draft_saved_at)`);
        return { id: resp2.id, version_number: resp2.version_number };
      }
      throw err;
    }
  } catch (err: any) {
    console.error(`[versioningService] saveDraft failed for blog ${blogId}`, { error: err && (err.stack || err.message || err) });
    throw new Error(`Failed to save draft for blog ${blogId}: ${err && (err.message || JSON.stringify(err))}`);
  }
}

/**
 * Publish Draft:
 * 1. saveDraft to ensure latest draft has current content + draft_saved_at
 * 2. Mark that draft as 'published' + set published_at
 * 3. Update blogs.current_published_version_id + blog_status='publish'
 */
export async function publishDraft(
  blogId: number | string,
  draftData: DraftData
): Promise<{ id: number; version_number: number }> {
  const { id: draftId, version_number } = await saveDraft(blogId, draftData);
  const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');

  // Attempt to mark the version as published, retrying without published_at for older upstream schemas
  try {
    await apiRequest(`/blogs/${blogId}/versions/${draftId}`, 'PUT', {
      status: 'published',
      published_at: now,
    });
  } catch (err: any) {
    const upstreamMsg = err && (err.body && (err.body.message || err.body.error)) || err && err.message || '';
    if (typeof upstreamMsg === 'string' && upstreamMsg.includes("Unknown column 'published_at'")) {
      console.warn(`[versioningService] Upstream schema missing 'published_at'; retrying version update without it.`, { blogId, draftId });
      await apiRequest(`/blogs/${blogId}/versions/${draftId}`, 'PUT', { status: 'published' });
    } else {
      throw err;
    }
  }

  // Update blog-level published pointer; retry without current_published_version_id if upstream schema lacks it
  try {
    await apiRequest(`/blogs/${blogId}`, 'PUT', {
      blog_status: 'publish',
      current_published_version_id: draftId,
      blog_date_modified: now,
      blog_date_modified_gmt: now,
    });
  } catch (err: any) {
    const upstreamMsg = err && (err.body && (err.body.message || err.body.error)) || err && err.message || '';
    if (typeof upstreamMsg === 'string' && upstreamMsg.includes("Unknown column 'current_published_version_id'")) {
      console.warn(`[versioningService] Upstream schema missing 'current_published_version_id'; retrying blog update without it.`, { blogId, draftId });
      await apiRequest(`/blogs/${blogId}`, 'PUT', {
        blog_status: 'publish',
        blog_date_modified: now,
        blog_date_modified_gmt: now,
      });
    } else {
      throw err;
    }
  }

  return { id: draftId, version_number };
}

/**
 * Publish a specific version by ID (from version history).
 */
export async function publishSpecificVersion(
  blogId: number | string,
  versionId: number
): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');

  await apiRequest(`/blogs/${blogId}/versions/${versionId}`, 'PUT', {
    status: 'published',
    published_at: now,
  });

  await apiRequest(`/blogs/${blogId}`, 'PUT', {
    blog_status: 'publish',
    current_published_version_id: versionId,
    blog_date_modified: now,
    blog_date_modified_gmt: now,
  });
}

/**
 * Restore a past version: creates a new draft version copied from the old one.
 * Returns { id, version_number } of the new draft.
 */
export async function revertToVersion(
  blogId: number | string,
  versionId: number
): Promise<{ id: number; version_number: number }> {
  const resp = await apiRequest<{ success: boolean; data: BlogVersion }>(
    `/blogs/${blogId}/versions/${versionId}`
  );
  const old = resp.data;
  const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');

  const newResp = await apiRequest<{ success: boolean; id: number; version_number: number }>(
    `/blogs/${blogId}/versions`,
    'POST',
    {
      blog_title: old.blog_title,
      blog_content: old.blog_content,
      blog_excerpt: old.blog_excerpt ?? '',
      tags: old.tags ?? null,
      status: 'draft',
      draft_saved_at: now,
      blog_visibility: old.blog_visibility ?? 'public',
      comment_status: old.comment_status ?? 'open',
      like_visibility: old.like_visibility ?? 'open',
      view_visibility: old.view_visibility ?? 'open',
      created_at: now,
    }
  );
  return { id: newResp.id, version_number: newResp.version_number };
}

/**
 * Update blog-level settings only (visibility, comments, notifications, etc.)
 */
export async function updateSettings(
  blogId: number | string,
  settings: Record<string, string>
): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
  await apiRequest(`/blogs/${blogId}`, 'PUT', {
    ...settings,
    blog_date_modified: now,
    blog_date_modified_gmt: now,
  });
}

/**
 * Unpublish: removes current_published_version_id and sets blog_status back to draft.
 * Versions themselves remain immutable.
 */
export async function unpublishBlog(blogId: number | string): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
  await apiRequest(`/blogs/${blogId}`, 'PUT', {
    blog_status: 'draft',
    current_published_version_id: null,
    blog_date_modified: now,
    blog_date_modified_gmt: now,
  });
}
