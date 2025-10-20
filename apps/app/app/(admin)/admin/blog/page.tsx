import Container from "@/components/shared/container";
import type { Metadata } from "next";
import { Suspense } from "react";
import InfiniteScrollBlogList from "@/components/infinite-scroll-blog-list";

export const metadata: Metadata = {
  title: "Blog | Admin | POESY 小詩",
  description: "Admin blog view",
};

export default function AdminBlog() {
  return (
    <Container size="large">
      <h1 className="text-2xl font-bold mb-6">Blog Posts</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <InfiniteScrollBlogList />
      </Suspense>
    </Container>
  );
}
