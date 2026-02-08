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
  blog_date: string;
  blog_date_gmt: string;
  blog_content: string;
  blog_status: 'draft' | 'publish';
  comment_status: 'open' | 'close';
  notification_status: 'all' | 'none';
  blog_modified: string;
  blog_modified_gmt: string;
  tags: string | null;
  blog_visibility: 'public' | 'private';
  like_count: number;
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
