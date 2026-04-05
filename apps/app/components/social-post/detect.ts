export type SocialPlatform =
  | 'x'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'pinterest'
  | 'threads'
  | 'bluesky'
  | 'unknown';

export function detectPlatform(url: string): SocialPlatform {
  try {
    const { hostname } = new URL(url);
    const h = hostname.replace(/^www\./, '');
    if (/^(twitter\.com|x\.com)$/.test(h)) return 'x';
    if (/^instagram\.com$/.test(h)) return 'instagram';
    if (/^(facebook\.com|fb\.com|fb\.watch)$/.test(h)) return 'facebook';
    if (/^tiktok\.com$/.test(h)) return 'tiktok';
    if (/^(pinterest\.[a-z]+|pin\.it)$/.test(h)) return 'pinterest';
    if (/^threads\.(net|com)$/.test(h)) return 'threads';
    if (/^bsky\.app$/.test(h)) return 'bluesky';
  } catch {
    // invalid URL
  }
  return 'unknown';
}

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  x: 'X (Twitter)',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
  threads: 'Threads',
  bluesky: 'BlueSky',
  unknown: 'Social Post',
};

/** Brand colors for editor preview card */
export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  x: '#000000',
  instagram: '#E1306C',
  facebook: '#1877F2',
  tiktok: '#010101',
  pinterest: '#E60023',
  threads: '#101010',
  bluesky: '#0085FF',
  unknown: '#6B7280',
};
