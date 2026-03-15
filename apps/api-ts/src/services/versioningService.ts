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

  console.debug(`[versioningService] apiRequest ${method} ${url}`, {
    body: body ? (typeof body === 'object' ? body : body) : undefined,
  });

  let res: Response;
  let parsed: any;
  try {
    res = await fetch(url, opts);
    const text = await res.text();
    try { parsed = text ? JSON.parse(text) : text; } catch { parsed = text; }
  } catch (err: any) {
    console.error(`[versioningService] apiRequest network error for ${method} ${url}`, { error: err && (err.stack || err.message || err) });
    throw err;
  }

  if (!res.ok) {
    console.error(`[versioningService] Upstream API ${method} ${url} returned ${res.status} ${res.statusText}`, { status: res.status, body: parsed });
    const err = new Error(`API ${method} ${path} failed: ${res.status} ${res.statusText} - ${typeof parsed === 'object' ? JSON.stringify(parsed) : parsed}`);
    (err as any).status = res.status;
    (err as any).body = parsed;
    throw err;
  }

  return parsed as T;
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
 * 2. Mark that draft as 'committed' + set published_at
 * 3. Update blogs row: blog_status='published', current_published_version_id, and copy content fields
 * A new draft is NOT created here — it will be created on the next save after the user makes changes.
 * Returns { published: { id, version_number } }
 */
export async function publishDraft(
  blogId: number | string,
  draftData: DraftData
): Promise<{ published: { id: number; version_number: number } }> {
  const { id: draftId, version_number } = await saveDraft(blogId, draftData);
  const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');

  const maxRetries = 3;
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // 1) Commit the draft version (with retries and verification)
  let committed = false;
  let lastCommitErr: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      try {
        await apiRequest(`/blogs/${blogId}/versions/${draftId}`, 'PUT', {
          status: 'committed',
          published_at: now,
        });
      } catch (err: any) {
        const upstreamMsg = err && (err.body && (err.body.message || err.body.error)) || err && err.message || '';
        if (typeof upstreamMsg === 'string' && upstreamMsg.includes("Unknown column 'published_at'")) {
          console.warn(`[versioningService] Upstream schema missing 'published_at'; retrying version update without it.`, { blogId, draftId, attempt });
          await apiRequest(`/blogs/${blogId}/versions/${draftId}`, 'PUT', { status: 'committed' });
        } else {
          throw err;
        }
      }

      // Verify the version status was updated
      try {
        const verResp = await apiRequest<{ success: boolean; data: any }>(`/blogs/${blogId}/versions/${draftId}`);
        const ver = (verResp as any)?.data ?? verResp;
        if (ver && (ver.status === 'committed' || ver.status === 'published')) {
          committed = true;
          break;
        }
      } catch (err: any) {
        // swallow and retry
      }
    } catch (err: any) {
      lastCommitErr = err;
      console.warn(`[versioningService] commit attempt ${attempt} failed for blog ${blogId} v${draftId}`, { error: err && (err.stack || err.message || err) });
      if (attempt < maxRetries) await sleep(attempt * 200);
    }
  }

  if (!committed) {
    console.error(`[versioningService] Failed to commit version ${draftId} for blog ${blogId} after ${maxRetries} attempts`, { lastError: lastCommitErr });
    throw lastCommitErr || new Error(`Failed to commit version ${draftId} for blog ${blogId}`);
  }

  // 2) Update blog row to point at the committed version (with retries and verification)
  let updated = false;
  let lastBlogErr: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      try {
        await apiRequest(`/blogs/${blogId}`, 'PUT', {
          blog_status: 'published',
          current_published_version_id: draftId,
          blog_title: draftData.blog_title,
          blog_content: draftData.blog_content,
          blog_excerpt: draftData.blog_excerpt ?? '',
          tags: draftData.tags ?? null,
          blog_date_modified: now,
          blog_date_modified_gmt: now,
        });
      } catch (err: any) {
        const upstreamMsg = err && (err.body && (err.body.message || err.body.error)) || err && err.message || '';
        if (typeof upstreamMsg === 'string' && upstreamMsg.includes("Unknown column 'current_published_version_id'")) {
          console.warn(`[versioningService] Upstream schema missing 'current_published_version_id'; retrying blog update without it.`, { blogId, draftId, attempt });
          await apiRequest(`/blogs/${blogId}`, 'PUT', {
            blog_status: 'published',
            blog_title: draftData.blog_title,
            blog_content: draftData.blog_content,
            blog_excerpt: draftData.blog_excerpt ?? '',
            tags: draftData.tags ?? null,
            blog_date_modified: now,
            blog_date_modified_gmt: now,
          });
        } else {
          throw err;
        }
      }

      // Verify blog row matches expected published state and title
      try {
        const blogResp = await apiRequest<{ success: boolean; data: any }>(`/blogs/${blogId}`);
        const blogRow = (blogResp as any)?.data ?? blogResp;
        const statusOk = blogRow && (blogRow.blog_status === 'published' || blogRow.blog_status === 'publish');
        const titleOk = blogRow && String(blogRow.blog_title) === String(draftData.blog_title);
        if (statusOk && titleOk) {
          updated = true;
          break;
        } else {
          console.info(`[versioningService] blog row mismatch after update attempt ${attempt} for blog ${blogId}`, { status: blogRow?.blog_status, title: blogRow?.blog_title });
        }
      } catch (err: any) {
        // swallow and retry
      }
    } catch (err: any) {
      lastBlogErr = err;
      console.warn(`[versioningService] blog update attempt ${attempt} failed for blog ${blogId}`, { error: err && (err.stack || err.message || err) });
      if (attempt < maxRetries) await sleep(attempt * 300);
    }
  }

  if (!updated) {
    console.error(`[versioningService] Failed to verify blog update for blog ${blogId} after ${maxRetries} attempts`, { lastError: lastBlogErr });
    throw lastBlogErr || new Error(`Failed to update blog ${blogId} after publish`);
  }

  return { published: { id: draftId, version_number } };

}

/**
 * Publish a specific version by ID (from version history).
 * A new draft is NOT created here — it will be created on the next save after the user makes changes.
 */
export async function publishSpecificVersion(
  blogId: number | string,
  versionId: number
): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');

  // Fetch the version's content so we can copy it to the blog row and new draft
  const versionResp = await apiRequest<{ success: boolean; data: BlogVersion }>(
    `/blogs/${blogId}/versions/${versionId}`
  );
  const ver = versionResp.data;

  try {
    await apiRequest(`/blogs/${blogId}/versions/${versionId}`, 'PUT', {
      status: 'committed',
      published_at: now,
    });
  } catch (err: any) {
    const upstreamMsg = err && (err.body && (err.body.message || err.body.error)) || err && err.message || '';
    if (typeof upstreamMsg === 'string' && upstreamMsg.includes("Unknown column 'published_at'")) {
      console.warn(`[versioningService] Upstream schema missing 'published_at'; retrying version update without it.`, { blogId, versionId });
      await apiRequest(`/blogs/${blogId}/versions/${versionId}`, 'PUT', { status: 'committed' });
    } else {
      throw err;
    }
  }

  try {
    await apiRequest(`/blogs/${blogId}`, 'PUT', {
      blog_status: 'published',
      current_published_version_id: versionId,
      blog_title: ver.blog_title,
      blog_content: ver.blog_content,
      blog_excerpt: ver.blog_excerpt ?? '',
      tags: ver.tags ?? null,
      blog_date_modified: now,
      blog_date_modified_gmt: now,
    });
  } catch (err: any) {
    const upstreamMsg = err && (err.body && (err.body.message || err.body.error)) || err && err.message || '';
    if (typeof upstreamMsg === 'string' && upstreamMsg.includes("Unknown column 'current_published_version_id'")) {
      console.warn(`[versioningService] Upstream schema missing 'current_published_version_id'; retrying blog update without it.`, { blogId, versionId });
      await apiRequest(`/blogs/${blogId}`, 'PUT', {
        blog_status: 'published',
        blog_title: ver.blog_title,
        blog_content: ver.blog_content,
        blog_excerpt: ver.blog_excerpt ?? '',
        tags: ver.tags ?? null,
        blog_date_modified: now,
        blog_date_modified_gmt: now,
      });
    } else {
      throw err;
    }
  }

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
  try {
    await apiRequest(`/blogs/${blogId}`, 'PUT', {
      blog_status: 'draft',
      current_published_version_id: null,
      blog_date_modified: now,
      blog_date_modified_gmt: now,
    });
  } catch (err: any) {
    const upstreamMsg = err && (err.body && (err.body.message || err.body.error)) || err && err.message || '';
    if (typeof upstreamMsg === 'string' && upstreamMsg.includes("Unknown column 'current_published_version_id'")) {
      console.warn(`[versioningService] Upstream schema missing 'current_published_version_id'; retrying unpublish without it.`, { blogId });
      await apiRequest(`/blogs/${blogId}`, 'PUT', {
        blog_status: 'draft',
        blog_date_modified: now,
        blog_date_modified_gmt: now,
      });
    } else {
      throw err;
    }
  }
}
