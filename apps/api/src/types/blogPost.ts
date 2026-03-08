// Transformed BlogPost structure matching the blogs table
export interface BlogPost {
  id?: number;
  blog_name: string;
  blog_title: string;
  blog_excerpt: string;
  blog_date_published: string;
  blog_date_published_gmt: string;
  blog_content: string;
  blog_status: 'draft' | 'published';
  comment_status: 'open' | 'close';
  notification_status: 'all' | 'none';
  blog_date_modified: string;
  blog_date_modified_gmt: string;
  blog_date_created: string;
  blog_date_created_gmt: string;
  tags: string;
  blog_visibility: 'public' | 'private';
  like_count: number;
  like_visibility: 'open' | 'close';
  view_count: number;
  view_visibility: 'open' | 'close';
}

// Version record from the blog_versions table
export interface BlogVersion {
  id: number;
  blog_id: number;
  parent_version_id: number | null;
  version_number: number;
  blog_title: string;
  blog_excerpt: string | null;
  blog_content: string;
  tags: string | null;
  commit_message: string | null;
  status: 'draft' | 'committed';
  created_by: number;
  created_at: string;
  blog_visibility: 'public' | 'private';
  comment_status: 'open' | 'close';
  like_visibility: 'open' | 'close';
  view_visibility: 'open' | 'close';
  like_count: number;
  view_count: number;
}

export interface BlogPostApiResponse {
  success: boolean;
  message?: string;
  data?: BlogPost | BlogPost[];
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
}

export interface MigrationSummary {
  success: boolean;
  summary: {
    total_processed: number;
    successful: number;
    failed: number;
    migrated_blogs: Array<{
      id?: string;
      title: string;
      date: string;
      status: "success" | "failed";
      error?: string;
    }>;
  };
}
