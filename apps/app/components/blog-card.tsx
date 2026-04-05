"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Blog } from "@/types/blog";
import { Eye, Heart, MessageSquare, Lock, Globe, History } from 'lucide-react';

interface BlogCardProps {
  blog: Blog;
  onHistory?: (blogId: number) => void;
}

const BlogCardComponent = ({ blog, onHistory }: BlogCardProps) => {
  const pathname = usePathname();
  const isAdmin = typeof pathname === 'string' && pathname.startsWith('/admin');

  // Format date properly based on source with better error handling
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) {
        return "No date";
      }

      // Handle various date formats
      let processedDate = dateString;

      // If it's a WordPress/MySQL format (YYYY-MM-DD HH:MM:SS), convert to ISO
      if (processedDate.includes(' ') && !processedDate.includes('T')) {
        processedDate = processedDate.replace(' ', 'T');
        // Add Z if no timezone info
        if (!processedDate.includes('+') && !processedDate.includes('Z')) {
          processedDate += 'Z';
        }
      }

      const date = new Date(processedDate);
      if (isNaN(date.getTime())) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Could not parse date:', dateString, 'processed:', processedDate);
        }
        return "Invalid date";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error formatting date:', dateString, error);
      }
      return "Date error";
    }
  };

  const apiId = (blog.apiData as any)?.id;
  const href = isAdmin
    ? `/admin/blog/${apiId ?? ((blog.apiData as any)?.blog_name ?? blog.slug)}`
    : `/blog/${apiId ? `blog-${apiId}` : blog.slug}`;

  // API-exposed properties (apiData may be undefined for local MDX files)
  const api = (blog.apiData || {}) as any;
  const visibility = api.blog_visibility || 'public';
  const commentOpen = (api.comment_status ?? 'open') === 'open';
  const likeOpen = (api.like_visibility ?? 'open') === 'open';
  const viewOpen = (api.view_visibility ?? 'open') === 'open';
  const likes = blog.like_count ?? api.like_count ?? 0;
  const views = api.view_count ?? 0;
  const comments = blog.comment_count ?? api.comment_count ?? 0;

  // Admin-specific version info
  const draftV: number | undefined = api.latest_draft_version_number;
  const committedV: number | undefined = api.latest_committed_version_number;
  const draftTitle: string | undefined = api.latest_draft_blog_title;
  const committedTitle: string | undefined = api.latest_committed_blog_title;
  const showPublishedSubtitle = isAdmin && committedTitle && draftTitle && committedTitle !== draftTitle;

  // Status for admin: draft-ahead / published / draft-only
  const adminStatus: 'draft-ahead' | 'published' | 'draft-only' = (() => {
    if (!committedV) return 'draft-only';
    if (draftV && draftV > committedV) return 'draft-ahead';
    return 'published';
  })();

  const statusBadge = isAdmin ? {
    'draft-ahead': { label: 'Draft Ahead', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
    'published': { label: 'Published', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    'draft-only': { label: 'Draft Only', cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
  }[adminStatus] : null;

  return (
    <article className="py-4 sm:py-6 dark:border-b-zinc-800 transition-opacity duration-200 hover:opacity-90">
      <header>
        <h3 className="font-semibold underline underline-offset-4 decoration-1 decoration-zinc-300 transition-colors duration-200 hover:decoration-zinc-500">
          <Link href={href}>{blog.metadata.title}</Link>
        </h3>
        {showPublishedSubtitle && (
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
            Published: {committedTitle}
          </p>
        )}
        {!isAdmin && blog.metadata.summary && (
          <p className="mt-1 opacity-70 dark:opacity-60">
            {blog.metadata.summary}
          </p>
        )}
      </header>
      <footer className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm uppercase tracking-wider opacity-50 dark:opacity-40">
        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
          <div title={viewOpen ? `${views} views` : 'Views disabled'} className="flex items-center space-x-1">
            {viewOpen ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-40" />}
            <span className="text-xs">{viewOpen ? views : 'off'}</span>
          </div>
          <div title={likeOpen ? `${likes} likes` : 'Likes disabled'} className="flex items-center space-x-1">
            {likeOpen ? <Heart className="w-4 h-4 text-pink-600" /> : <Heart className="w-4 h-4 opacity-40" />}
            <span className="text-xs">{likeOpen ? likes : 'off'}</span>
          </div>
          <div title={commentOpen ? `${comments} comments` : 'Comments disabled'} className="flex items-center space-x-1">
            {commentOpen ? <MessageSquare className="w-4 h-4" /> : <MessageSquare className="w-4 h-4 opacity-40" />}
            <span className="text-xs">{commentOpen ? comments : 'off'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <time dateTime={blog.metadata.publishedAt} className="text-xs text-neutral-600 dark:text-neutral-400">
            {formatDate(blog.metadata.publishedAt)}
          </time>
          <span>·</span>
          <span className="text-xs">{blog.readingTime} MIN READ</span>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 opacity-100">
            {/* Status badge */}
            {statusBadge && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
            )}
            {/* Version pills */}
            {draftV != null && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                Draft v{draftV}
              </span>
            )}
            {committedV != null && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono">
                Live v{committedV}
              </span>
            )}
            {/* Visibility */}
            <div title={visibility === 'private' ? 'Private' : 'Public'} aria-label={`visibility-${visibility}`}>
              {visibility === 'private' ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
            </div>
            {/* History button */}
            {apiId && onHistory && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHistory(apiId); }}
                title="Version history"
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <History className="w-3 h-3" />
                History
              </button>
            )}
          </div>
        )}
      </footer>
    </article>
  );
};

export const BlogCard = React.memo(BlogCardComponent, (prev, next) => {
  const prevId = (prev.blog.apiData as any)?.id ?? prev.blog.slug;
  const nextId = (next.blog.apiData as any)?.id ?? next.blog.slug;
  return prevId === nextId && prev.onHistory === next.onHistory;
});
