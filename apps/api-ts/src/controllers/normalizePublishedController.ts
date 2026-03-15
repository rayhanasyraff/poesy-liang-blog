import type { Request, Response } from 'express';
import { config } from '../config/config';

const { apiBaseUrl, bearerToken } = config.poesyliangNet;

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function apiPut(path: string, body: object): Promise<void> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PUT ${path} → ${res.status} ${res.statusText}: ${text}`);
  }
}

async function apiPost<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`POST ${path} → ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * POST /migrate/normalize-published-versions
 *
 * Two-pass normalization for all published blogs:
 *
 * Pass 1 — Normalize status: any version with status='published' → status='committed'
 *
 * Pass 2 — Backfill missing versions: published blogs (blog_status='published'/'publish')
 *   that have zero committed/published versions get a new committed v1 created from the
 *   blog row's content, followed by a draft v2 for future editing.
 *
 * Dry run (default): POST /migrate/normalize-published-versions
 * Apply:            POST /migrate/normalize-published-versions?dry=false
 */
export async function normalizePublishedVersions(req: Request, res: Response): Promise<void> {
  const dry = req.query.dry !== 'false';

  const summary = {
    dry,
    blogsScanned: 0,
    // Pass 1
    legacyVersionsNormalized: 0,   // status='published' → 'committed'
    // Pass 2
    committedVersionsCreated: 0,   // new committed v1 created for version-less published blogs
    draftVersionsCreated: 0,       // new draft v2 created after committed v1
    errors: [] as { blogId: number; step: string; error: string }[],
  };

  function pushError(blogId: number, step: string, err: any) {
    const msg = err?.message ?? String(err);
    summary.errors.push({ blogId, step, error: msg });
    console.error(`[normalize] blog ${blogId} ${step}: ${msg}`);
  }

  try {
    const pageSize = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const blogsResp = await apiGet<{ success: boolean; data: any[] }>(
        `/blogs?limit=${pageSize}&offset=${offset}`
      );
      const blogs: any[] = blogsResp.data ?? [];
      if (!blogs.length) break;

      summary.blogsScanned += blogs.length;
      hasMore = blogs.length === pageSize;
      offset += pageSize;

      await Promise.all(blogs.map(async (blog) => {
        const blogId: number = blog.id;
        if (!blogId) return;

        // Fetch all versions for this blog (no status filter — get everything)
        let allVersions: any[] = [];
        try {
          const versResp = await apiGet<{ success: boolean; data: any[] }>(
            `/blogs/${blogId}/versions?limit=200&offset=0`
          );
          allVersions = versResp.data ?? [];
        } catch (err) {
          pushError(blogId, 'fetch-versions', err);
          return;
        }

        // ── Pass 1: normalize 'published' → 'committed' ──────────────────────
        for (const v of allVersions) {
          if (v.status !== 'published') continue;
          console.info(`[normalize] ${dry ? 'DRY ' : ''}blog ${blogId} v${v.version_number} (id=${v.id}): 'published' → 'committed'`);
          if (!dry) {
            try {
              await apiPut(`/blogs/${blogId}/versions/${v.id}`, { status: 'committed' });
              // Update local copy so Pass 2 sees the correct status
              v.status = 'committed';
              summary.legacyVersionsNormalized++;
            } catch (err) {
              pushError(blogId, `normalize-version-${v.id}`, err);
            }
          } else {
            summary.legacyVersionsNormalized++;
          }
        }

        // ── Pass 2: backfill published blogs with no committed version ────────
        const blogStatus: string = blog.blog_status ?? '';
        const isPublished = blogStatus === 'published' || blogStatus === 'publish';
        if (!isPublished) return;

        const hasCommitted = allVersions.some(
          (v) => v.status === 'committed' || v.status === 'published'
        );
        if (hasCommitted) return;

        // This published blog has no version at all (or only drafts).
        // Mirror the publishDraft flow: POST a draft, then PUT status='committed'.
        const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
        const publishedAt = blog.blog_date_published ?? blog.blog_date ?? now;

        console.info(`[normalize] ${dry ? 'DRY ' : ''}blog ${blogId} "${blog.blog_title}": creating committed v1`);

        if (dry) {
          summary.committedVersionsCreated++;
          summary.draftVersionsCreated++;
          return;
        }

        // Step 1 — Create a draft version (api.php ignores status on POST)
        let v1Id: number | null = null;
        try {
          const resp = await apiPost<{ success: boolean; id: number; version_number: number }>(
            `/blogs/${blogId}/versions`,
            {
              blog_title: blog.blog_title ?? 'Untitled',
              blog_content: blog.blog_content ?? '',
              blog_excerpt: blog.blog_excerpt ?? '',
              tags: blog.tags ?? null,
              blog_visibility: blog.blog_visibility ?? 'public',
              comment_status: blog.comment_status ?? 'open',
              like_visibility: blog.like_visibility ?? 'open',
              view_visibility: blog.view_visibility ?? 'open',
              created_at: publishedAt,
            }
          );
          v1Id = resp.id;
        } catch (err) {
          pushError(blogId, 'create-v1-draft', err);
          return;
        }

        // Step 2 — Mark it committed (same as publishDraft)
        try {
          await apiPut(`/blogs/${blogId}/versions/${v1Id}`, {
            status: 'committed',
            published_at: publishedAt,
          });
          summary.committedVersionsCreated++;
          console.info(`[normalize] blog ${blogId} v1 committed (id=${v1Id})`);
        } catch (err) {
          pushError(blogId, `commit-v1-${v1Id}`, err);
          return;
        }

        // Step 3 — Point the blog row at this committed version
        try {
          await apiPut(`/blogs/${blogId}`, { current_published_version_id: v1Id });
        } catch {
          // Non-fatal: older schema may not have this column
        }

        // Step 4 — Create draft v2 for future editing
        try {
          const resp2 = await apiPost<{ success: boolean; id: number; version_number: number }>(
            `/blogs/${blogId}/versions`,
            {
              blog_title: blog.blog_title ?? 'Untitled',
              blog_content: blog.blog_content ?? '',
              blog_excerpt: blog.blog_excerpt ?? '',
              tags: blog.tags ?? null,
              status: 'draft',
              draft_saved_at: now,
              blog_visibility: blog.blog_visibility ?? 'public',
              comment_status: blog.comment_status ?? 'open',
              like_visibility: blog.like_visibility ?? 'open',
              view_visibility: blog.view_visibility ?? 'open',
              created_at: now,
            }
          );
          summary.draftVersionsCreated++;
          console.info(`[normalize] blog ${blogId} draft v2 created (id=${resp2.id})`);
        } catch (err) {
          pushError(blogId, 'create-draft-v2', err);
        }
      }));
    }

    res.json({ success: true, summary });
  } catch (err: any) {
    console.error('[normalize] Fatal error:', err);
    res.status(500).json({ success: false, error: err?.message ?? String(err), summary });
  }
}
