"use client";

import { BlogEditor } from "@/components/blog-editor/BlogEditor";

export default function NewBlogPage() {
  return (
    <main className="min-h-screen h-screen w-full p-0 m-0 bg-background">
      <div className="h-full w-full">
        <BlogEditor style={{ height: '100vh' }} />
      </div>
    </main>
  );
}
