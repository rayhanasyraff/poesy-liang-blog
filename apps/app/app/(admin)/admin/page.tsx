import Container from "@/components/shared/container";
import Link from "next/link";
import type Metadata from "next";
import { Suspense } from "react";
import InfiniteScrollBlogList from "@/components/infinite-scroll-blog-list";

export const metadata: Metadata = {
  title: "Admin | POESY 小詩",
  description: "Admin dashboard",
};

export default function AdminHome() {
  return (
    <Container size="large">
      <div className="flex justify-end mt-4 mb-2">
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center rounded-md bg-primary text-white px-3 py-1 text-sm hover:opacity-90"
        >
          Add Blog
        </Link>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <InfiniteScrollBlogList />
      </Suspense>
    </Container>
  );
}
