"use client";

import { useParams } from "next/navigation";
import { BlogEditor } from "@/components/blog-editor/BlogEditor";

export default function EditBlogPage() {
  const params = useParams();
  const slug = (params as any)?.slug ?? '';

  return (
    <main className="min-h-screen h-screen w-full p-0 m-0 bg-background">
      <div className="h-full w-full">
        {/* Render client-side editor and let it resolve slug -> blog id */}
        {/* @ts-ignore */}
        <BlogEditor blogId={slug} style={{ height: '100vh' }} />
      </div>
    </main>
  );
}