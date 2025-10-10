// Transformed BlogPost structure for target API
export interface BlogPost {
  blog_name: string;
  blog_title: string;
  blog_excerpt: string;
  blog_date: string;
  blog_date_gmt: string;
  blog_content: string;
  blog_status: string;
  comment_status: string;
  notification_status: string;
  blog_modified: string;
  blog_modified_gmt: string;
  tags: string;
  blog_visibility: string;
  like_count: number;
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
