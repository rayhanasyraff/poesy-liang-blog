export interface Blog {
  slug: string;
  metadata: {
    title: string;
    publishedAt: string;
    summary: string;
  };
  content: string;
  readingTime: number;
  like_count: number;
  comment_count: number;
  tags: string;
  apiData?: ApiBlog; // Optional API data for blogs from API
}

export interface ApiBlog {
  id: number;
  blog_name: string;
  blog_title: string;
  blog_excerpt: string;
  blog_date_published: string;
  blog_date_published_gmt: string;
  blog_content: string;
  blog_status: 'draft' | 'publish' | 'published';
  comment_status: 'open' | 'close';
  notification_status: 'all' | 'none';
  blog_date_modified: string;
  blog_date_modified_gmt: string;
  blog_date_created: string;
  blog_date_created_gmt: string;
  tags: string | null;
  blog_visibility: 'public' | 'private';
  like_visibility?: 'open' | 'close';
  view_visibility?: 'open' | 'close';
  like_count: number;
  view_count?: number;
  blog_version?: number;
}

export interface BlogVersionSummary {
  id: number;
  blog_id: number;
  version_number: number;
  status: 'draft' | 'published' | 'committed'; // 'committed' kept for legacy data
  blog_title: string;
  blog_excerpt: string;
  blog_content: string;
  tags: string | null;
  created_at: string;
  draft_saved_at: string | null;
  published_at: string | null;
}

export interface BlogSettings {
  blog_visibility: 'public' | 'private';
  comment_status: 'open' | 'close';
  notification_status: 'all' | 'none';
  like_visibility: 'open' | 'close';
  view_visibility: 'open' | 'close';
}

// Blog row returned when ?include_versions=true — same as ApiBlog plus latest version overlay
export interface ApiBlogWithVersion extends ApiBlog {
  // Legacy single-version overlay (still present for backward compat)
  latest_version_id: number | null;
  latest_version_number: number | null;
  latest_version_status: 'draft' | 'committed' | 'published' | null;
  latest_blog_title: string | null;
  latest_blog_excerpt: string | null;
  latest_blog_content: string | null;
  latest_tags: string | null;
  latest_draft_saved_at: string | null;
  latest_published_at: string | null;
  // Separate draft + committed fields (admin path — no version_status filter)
  latest_draft_version_id: number | null;
  latest_draft_version_number: number | null;
  latest_draft_blog_title: string | null;
  latest_committed_version_id: number | null;
  latest_committed_version_number: number | null;
  latest_committed_blog_title: string | null;
  latest_committed_published_at: string | null;
}

export interface ApiResponse {
  success: boolean;
  pagination?: {
    total_rows: number;
    returned_rows: number;
    limit: number;
    offset: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
    next_offset: number | null;
    previous_offset: number | null;
  };
  data: ApiBlog[] | ApiBlog;
}
