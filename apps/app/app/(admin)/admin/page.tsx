import Container from "@/components/shared/container";
import type { Metadata } from "next";
import { Suspense } from "react";
import InfiniteScrollBlogList from "@/components/infinite-scroll-blog-list";

export const metadata: Metadata = {
  title: "Admin | POESY 小詩",
  description: "Admin dashboard",
};

export default function AdminHome() {
  return (
    <Container size="large">
      <Suspense fallback={<div>Loading...</div>}>
        <InfiniteScrollBlogList />
      </Suspense>
    </Container>
  );
}
