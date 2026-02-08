import Container from "@/components/shared/container";
import type { Metadata } from "next";
import { Suspense } from "react";
import InfiniteScrollBlogList from "@/components/infinite-scroll-blog-list";

export const metadata: Metadata = {
  title: "Blog | POESY 小詩",
  description: "Read my thoughts on software development, design, and more.",
};

function BlogListSkeleton() {
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-full"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  );
}

export default async function BlogPage() {
  return (
    <Container size="large">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <Suspense fallback={<BlogListSkeleton />}>
          <InfiniteScrollBlogList />
        </Suspense>
      </div>
    </Container>
  );
}