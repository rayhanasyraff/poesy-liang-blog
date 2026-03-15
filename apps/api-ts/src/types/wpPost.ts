// Source WpPost structure from both archive and poesy APIs
export interface WpPost {
  ID: string;
  post_author: string;
  post_date: string;
  post_date_gmt: string;
  post_content: string;
  post_title: string;
  post_excerpt: string;
  post_status: string;
  comment_status: string;
  ping_status: string;
  post_password: string;
  post_name: string;
  to_ping: string;
  pinged: string;
  post_modified: string;
  post_modified_gmt: string;
  post_content_filtered: string;
  post_parent: string;
  guid: string;
  menu_order: string;
  post_type: string;
  post_mime_type: string;
  comment_count: string;
  term_id: string;
  term_name: string;
  term_slug: string;
  term_group: string;
  term_taxonomy_id: string;
  taxonomy: string;
  taxonomy_description: string;
  taxonomy_parent: string;
  taxonomy_count: string;
  object_id: string;
  term_order: string;
  content_length: string;
  entry_type: string;
}

export interface WpPostApiResponse {
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
  data: WpPost[] | WpPost;
}
