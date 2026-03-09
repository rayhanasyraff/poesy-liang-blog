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
