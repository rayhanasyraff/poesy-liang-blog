import { LRUCache } from 'lru-cache';
import Bottleneck from 'bottleneck';
import { listVersions } from './blogVersionService';
import type { BlogVersion } from '../types/blogPost';

// Cache latest version per blogId; TTL 60 s, max 500 entries
// undefined = confirmed missing, absence of key = not yet fetched
const versionCache = new LRUCache<string, BlogVersion>({
  max: 500,
  ttl: 60_000,
});
const missingCache = new LRUCache<string, true>({ max: 500, ttl: 5_000 });

// Limit concurrent upstream version requests to 5
const limiter = new Bottleneck({ maxConcurrent: 5 });

async function fetchLatestVersionForBlog(blogId: number, status?: string): Promise<BlogVersion | null> {
  const key = status ? `${blogId}:${status}` : String(blogId);
  if (versionCache.has(key)) return versionCache.get(key) ?? null;
  if (missingCache.has(key)) return null;

  try {
    let latest: BlogVersion | null = null;

    // 'committed' is the current live status, but older blogs may use legacy 'published'.
    // Fetch both and pick the one with the higher version number.
    if (status === 'committed') {
      // Also check legacy 'published' status; pick highest version_number across both
      const [committed, published] = await Promise.all([
        listVersions(String(blogId), 50, 0, 'committed'),
        listVersions(String(blogId), 50, 0, 'published'),
      ]);
      const all = [...committed, ...published];
      latest = all.length
        ? all.reduce((a, b) => (b.version_number > a.version_number ? b : a))
        : null;
    } else {
      // Fetch enough to find the highest version_number regardless of API sort order
      const versions = await listVersions(String(blogId), 50, 0, status);
      latest = versions.length
        ? versions.reduce((a, b) => (b.version_number > a.version_number ? b : a))
        : null;
    }

    if (latest) versionCache.set(key, latest);
    else missingCache.set(key, true);
    return latest;
  } catch {
    missingCache.set(key, true);
    return null;
  }
}

export async function fetchLatestVersionsForBlogIds(
  ids: number[],
  status?: string
): Promise<Map<number, BlogVersion | null>> {
  const entries = await Promise.all(
    ids.map(id =>
      limiter.schedule(() => fetchLatestVersionForBlog(id, status)).then(v => [id, v] as const)
    )
  );
  return new Map(entries);
}
