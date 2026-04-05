"use client";

import Link from "next/link";
import type { Blog } from "@/types/blog";
import {
  Eye,
  Lock,
  Globe,
  MessageSquare,
  Bell,
  ThumbsUp,
  FileText,
} from 'lucide-react';

interface AdminBlogCardProps {
  blog: Blog;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  try {
    let s = dateString;
    if (s.includes(' ') && !s.includes('T')) {
      s = s.replace(' ', 'T');
      if (!s.includes('+') && !s.includes('Z')) s += 'Z';
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch (e) {
    return "—";
  }
};

export default function AdminBlogCard({ blog }: AdminBlogCardProps) {
  const api = (blog.apiData || {}) as any;

  const visibility = api.blog_visibility || 'public';
  const status = api.blog_status || 'unknown';

  const createdAt = api.blog_date_created || api.blog_date || blog.metadata.publishedAt;
  const updatedAt = api.blog_date_modified || api.blog_modified || blog.metadata.publishedAt;

  const savedAt = status === 'draft' ? (api.blog_date_modified || api.blog_modified || updatedAt) : (api.blog_date_published || api.blog_date || blog.metadata.publishedAt);

  const commentStatus = api.comment_status || 'unknown';
  const notificationStatus = api.notification_status || 'unknown';
  const likeVisibility = api.like_visibility || 'open';
  const viewVisibility = api.view_visibility || 'open';

  const likes = blog.like_count ?? (api.like_count ?? 0);
  const views = api.view_count ?? 0;

  return (
    <article className="py-3 sm:py-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">
            <Link href={`/admin/blog/${api.id ?? blog.slug}`}>{blog.metadata.title}</Link>
          </h3>
          {blog.metadata.summary && (
            <p className="mt-1 text-sm opacity-80">{blog.metadata.summary}</p>
          )}
        </div>

        {/* Icons-only row: no visible text, details on hover via title */}
        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
          <div title={`Visibility: ${visibility}`} aria-label={`visibility-${visibility}`}>
            {visibility === 'private' ? <Lock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
          </div>

          <div title={`Status: ${status}`} aria-label={`status-${status}`}>
            <FileText className="w-5 h-5" />
          </div>

          <div title={`${likes} likes`} aria-label={`likes-${likes}`}>
            <svg viewBox="0 0 24 24" width="20" height="20" className="text-pink-600" fill="currentColor"><use href="#icon-claps" /></svg>
          </div>

          <div title={`${views} views`} aria-label={`views-${views}`}>
            <Eye className="w-5 h-5" />
          </div>

          <div title={`Comments: ${commentStatus}`} aria-label={`comments-${commentStatus}`}>
            <MessageSquare className="w-5 h-5" />
          </div>

          <div title={`Notifications: ${notificationStatus}`} aria-label={`notifications-${notificationStatus}`}>
            <Bell className="w-5 h-5" />
          </div>

          <div title={`Likes Open: ${likeVisibility}`} aria-label={`likeVisibility-${likeVisibility}`}>
            <ThumbsUp className="w-5 h-5" />
          </div>

          <div title={`Views Open: ${viewVisibility}`} aria-label={`viewVisibility-${viewVisibility}`}>
            <Eye className="w-5 h-5" />
          </div>
        </div>
      </div>
    </article>
  );
}
