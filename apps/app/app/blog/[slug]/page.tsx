import type { Metadata } from "next";
import { notFound } from "next/navigation";


import { getBlogPosts } from "@/app/db/blog";

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
  const blog = getBlogPosts().find((blog) => blog.slug === slug);

  if (!blog) {
    return;
  }

  const {
    title,
    publishedAt: publishedTime,
    summary: description,
    keywords,
  } = blog.metadata;

  const generatedOgImage =
    new URL(
      "/opengraph-image",
      process.env.NEXT_PUBLIC_APP_URL || "https://blog.poesyliang.com"
    ).toString() + `?title=${encodeURIComponent(title)}`;

  const finalOgImage = blog.metadata.image
    ? blog.metadata.image.startsWith("http")
      ? blog.metadata.image
      : `${process.env.NEXT_PUBLIC_APP_URL || "https://blog.poesyliang.com"}${blog.metadata.image}`
    : generatedOgImage;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      siteName: "POESY 小詩",
      type: "article",
      publishedTime,
      url: `https://blog.poesyliang.com/blog/${blog.slug}`,
      images: [
        {
          url: finalOgImage,
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
      site: "@poesyliang",
      creator: "@poesyliang",
      images: [finalOgImage],
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const blog = getBlogPosts().find((blog) => blog.slug === slug);
  const headings = blog ? extractHeadings(blog.content) : [];

  if (!blog) {
    notFound();
  }

  return (
    <section className="mx-auto px-2 sm:px-6 lg:px-8 w-full sm:max-w-screen-lg bg-background">
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
            image: blog.metadata.image
              ? (blog.metadata.image.startsWith("http") ? blog.metadata.image : `https://blog.poesyliang.com${blog.metadata.image}`)
              : `https://blog.poesyliang.com/og?title=${blog.metadata.title}`,
            url: `https://blog.poesyliang.com/blog/${blog.slug}`,
            author: {
              "@type": "Person",
              name: "POESY 小詩",
            },
          }),
        }}
      />
      <h1 className="title font-medium text-2xl tracking-tighter max-w-[650px]">
        {blog.metadata.title}
      </h1>
      <div className="flex justify-start items-center mt-2 mb-8 text-sm max-w-[650px]">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {formatDate(blog.metadata.publishedAt)}
          </p>
          <span className="mx-2 text-neutral-400">—</span>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {blog.readingTime} min read
          </p>
      </div>
      <TableOfContents headings={headings} />
      <article className="prose prose-quoteless prose-neutral dark:prose-invert text-justify w-auto">
        <CustomMDX source={blog.content} />
      </article>


    </section>
  );
}
