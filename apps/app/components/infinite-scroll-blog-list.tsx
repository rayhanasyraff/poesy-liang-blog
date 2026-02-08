"use client";

import React from 'react';
import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Blog, ApiBlog } from "@/types/blog";
import { BlogCard } from './blog-card';
import Separator from "./shared/separator";
import { convertApiBlogToBlog } from '@/lib/blog-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Fetch ALL blogs once and cache them
let allBlogsCache: Blog[] | null = null;

async function fetchAllBlogs(): Promise<Blog[]> {
  if (allBlogsCache) {
    return allBlogsCache;
  }

  try {
    const allBlogs: Blog[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    // Keep fetching until we get all blogs
    while (hasMore) {
      const response = await fetch(`${API_BASE_URL}/blogs?limit=${limit}&offset=${offset}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch blogs: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('API returned unsuccessful response');
      }

      const apiBlogs: ApiBlog[] = Array.isArray(data.data) ? data.data : [data.data];

      if (apiBlogs.length === 0) {
        hasMore = false;
        break;
      }

      // Filter and convert
      const publishedApiBlogs = apiBlogs.filter(blog =>
        (blog.blog_status === 'publish' || blog.blog_status === 'draft') &&
        blog.blog_content.trim() !== '' &&
        blog.blog_title.trim() !== '' &&
        blog.blog_title !== 'Auto Draft'
      );

      const blogs = publishedApiBlogs.map(convertApiBlogToBlog);
      allBlogs.push(...blogs);

      // If we got fewer blogs than requested, we've reached the end
      if (apiBlogs.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    allBlogsCache = allBlogs;
    return allBlogs;
  } catch (error) {
    console.error('Error fetching blogs from API:', error);
    return [];
  }
}

async function fetchServerPage(
  limit: number,
  offset: number
): Promise<{ rows: Blog[]; nextOffset: number | undefined }> {
  const allBlogs = await fetchAllBlogs();

  // Add artificial delay to show loading state
  await new Promise(resolve => setTimeout(resolve, 500));

  const start = offset;
  const end = start + limit;
  const rows = allBlogs.slice(start, end);
  const nextOffset = end < allBlogs.length ? end : undefined;

  return { rows, nextOffset };
}

export default function InfiniteScrollBlogList() {
  const {
    status,
    data,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['blog-posts'],
    queryFn: (ctx) => fetchServerPage(5, ctx.pageParam),
    getNextPageParam: (lastGroup) => lastGroup.nextOffset,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const allRows = data ? data.pages.flatMap((d) => d.rows) : [];
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px' // Load more when 100px away from the element
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  if (status === 'pending') {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (status === 'error') {
    return <div className="p-8 text-center text-red-600">Error: {error.message}</div>;
  }

  return (
    <div className="w-full">
      {/* Blog list */}
      <div className="space-y-0">
        {allRows.map((blog, index, array) => (
          <div
            key={blog.apiData ? `api-${blog.apiData.id}` : blog.slug}
            className="animate-fade-in"
            style={{
              animationDelay: `${(index % 5) * 100}ms`,
              animationFillMode: 'backwards'
            }}
          >
            <BlogCard blog={blog} />
            {index !== array.length - 1 && <Separator />}
          </div>
        ))}
      </div>

      {/* Load more trigger */}
      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="p-8 text-center"
        >
          {isFetchingNextPage && (
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          )}
        </div>
      )}

      {/* End of content */}
      {!hasNextPage && allRows.length > 0 && (
        <div className="p-8 text-center text-gray-500">
          That's all! No more blogs to load.
        </div>
      )}

      {/* Background updating indicator */}
      {/* {isFetching && !isFetchingNextPage && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-md text-sm">
          Updating...
        </div>
      )} */}
    </div>
  );
}
