import Container from "@/components/shared/container";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import InfiniteScrollBlogList from "@/components/infinite-scroll-blog-list";
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: "Admin | POESY 小詩",
  description: "Admin dashboard",
};

export default function AdminHome() {
  return (
    <Container size="large">
      <div className="flex justify-end mt-4 mb-2">
        <Button asChild size="sm"><Link href="/admin/blog/new">Add Blog</Link></Button>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <InfiniteScrollBlogList />
      </Suspense>
    </Container>
  );
}
