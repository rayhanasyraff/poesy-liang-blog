import Container from "@/components/shared/container";
import type { Metadata } from "next";
import { Suspense } from "react";
import InfiniteScrollBlogList from "@/components/infinite-scroll-blog-list";

export const metadata: Metadata = {
  title: "Blog | POESY 小詩",
  description: "Read my thoughts on software development, design, and more.",
};

export default function Home() {
  return (
    <Container size="large">
      <Suspense fallback={<div>Loading...</div>}>
        <InfiniteScrollBlogList />
      </Suspense>
    </Container>
  );
}
