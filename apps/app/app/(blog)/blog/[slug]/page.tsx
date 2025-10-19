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

  const {
    title,
    publishedAt: publishedTime,
    summary: description,
  } = blog.metadata;

  // Keywords might not exist for API blogs
  const keywords = 'keywords' in blog.metadata ? (blog.metadata as any).keywords : undefined;

  const ogImage =
    new URL(
      "/opengraph-image",
      process.env.NEXT_PUBLIC_APP_URL || "https://onurhan.dev"
    ).toString() + `?title=${encodeURIComponent(title)}`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime,
      url: `https://onurhan.dev/blog/${blog.slug}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@onurhan1337",
      creator: "@onurhan1337",
      images: [ogImage],
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  const headings = blog ? extractHeadings(blog.content) : [];

  if (!blog) {
    notFound();
  }

  return (
    <section className="mx-auto px-2 sm:px-6 lg:px-8 w-full sm:max-w-screen-lg bg-background animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: blog.metadata.title,
            datePublished: blog.metadata.publishedAt,
            dateModified: blog.metadata.publishedAt,
            description: blog.metadata.summary,
            image: (blog.metadata as any).image
              ? `https://onurhan.dev${(blog.metadata as any).image}`
              : `https://onurhan.dev/og?title=${blog.metadata.title}`,
            url: `https://onurhan.dev/blog/${blog.slug}`,
            author: {
              "@type": "Person",
              name: "Onurhan Demir",
            },
          }),
        }}
      />
      <div className="animate-in fade-in slide-in-from-left-4 duration-300 delay-100">
        <h1 className="title font-medium text-2xl tracking-tighter max-w-[650px]">
          {blog.metadata.title}
        </h1>
        <div className="flex justify-start items-center mt-2 mb-8 text-sm max-w-[650px]">
          <Suspense fallback={<div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />}>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {formatDate(blog.metadata.publishedAt, true)}
            </p>
            <span className="mx-2 text-neutral-400">—</span>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {blog.readingTime} min read
            </p>
          </Suspense>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-400 delay-200">
        <TableOfContents headings={headings} />
        <article className="prose prose-quoteless prose-neutral dark:prose-invert text-justify w-auto transition-all duration-200">
          <CustomMDX source={blog.content} />
        </article>

        {/* Display tags at the bottom if available */}
        {blog.tags && blog.tags.trim() !== '' && (
          <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">Tags:</span>
              {blog.tags.split(',').map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

    </section>
  );
}
