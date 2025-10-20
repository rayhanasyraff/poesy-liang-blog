import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getBlogBySlug } from "@/lib/api";
import { CustomMDX } from "@/components/mdx";
import TableOfContents from "@/components/table-of-contents";
import { extractHeadings, formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata | undefined> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return;
  }

  const { title } = blog.metadata;

  return {
    title: `${title} | Admin`,
  };
}

export default async function AdminBlogPost({ params }: Props) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  const headings = blog ? extractHeadings(blog.content) : [];

  if (!blog) {
    notFound();
  }

  return (
    <section className="mx-auto px-2 sm:px-6 lg:px-8 w-full sm:max-w-screen-lg bg-background animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="title text-2xl sm:text-4xl font-medium tracking-tighter max-w-[650px] mb-2">
        {blog.metadata.title}
      </h1>
      <div className="flex justify-between items-center mt-2 mb-8 text-sm max-w-[650px]">
        <Suspense fallback={<p className="h-5" />}>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {formatDate(blog.metadata.publishedAt)}
          </p>
        </Suspense>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-8">
        <article className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none">
          <CustomMDX source={blog.content} />
        </article>
        {headings.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <TableOfContents headings={headings} />
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
