"use client";

import React from 'react';
import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from "framer-motion";
import type { Blog } from "@/types/blog";
import { BlogCard } from './blog-card';
import Separator from "./shared/separator";

async function fetchServerPage(
  limit: number,
  offset = 0,
  blogs: Blog[]
): Promise<{ rows: typeof blogs; nextOffset: number | undefined }> {
  const start = offset * limit;
  const end = start + limit;
  const rows = blogs.slice(start, end);

  await new Promise((r) => setTimeout(r, 500));

  const nextOffset = end < blogs.length ? offset + 1 : undefined;

  return { rows, nextOffset };
}

export default function InfiniteScrollBlogList({ blogs }: { blogs: Blog[] }) {
  const {
    status,
    data,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['projects'],
    queryFn: (ctx) => fetchServerPage(5, ctx.pageParam, blogs),
    getNextPageParam: (lastGroup) => lastGroup.nextOffset,
    initialPageParam: 0,
  });

  const allRows = data ? data.pages.flatMap((d) => d.rows) : [];
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 5 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 150,
        damping: 10,
        duration: 0.5,
      },
    },
  };

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
        threshold: 1.0,
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
        <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
    )
  }

  if (status === 'error') {
    return <div className="p-8 text-center text-red-600">Error: {error.message}</div>;
  }

  return (
    <div className="w-full">
      {/* Blog list with animations */}
      <AnimatePresence mode="wait">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
        >
          {allRows.map((blog, index, array) => (
            <motion.div 
              key={blog.slug} 
              variants={item}
            >
              <BlogCard blog={blog} />
              {index !== array.length - 1 && <Separator />}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      
      {/* Load more trigger */}
      {hasNextPage && (
        <div 
          ref={loadMoreRef}
          className="p-8 text-center"
        >
          {isFetchingNextPage ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <></>
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