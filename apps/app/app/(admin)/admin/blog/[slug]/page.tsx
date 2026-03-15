import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Pencil } from "lucide-react";

import { getAdminBlogBySlug } from "@/lib/api";
import { CustomMDX } from "@/components/mdx";
import TableOfContents from "@/components/table-of-contents";
import { extractHeadings, formatDate } from "@/lib/utils";
import { AdminBlogStats } from "@/components/admin/AdminBlogStats";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata | undefined> {
  const { slug } = await params;
  const blog = await getAdminBlogBySlug(slug);
  if (!blog) return;

  const { title, publishedAt: publishedTime, summary: description } = blog.metadata;
  const keywords = 'keywords' in blog.metadata ? (blog.metadata as any).keywords : undefined;
  const ogImage =
    new URL("/opengraph-image", process.env.NEXT_PUBLIC_APP_URL || "https://onurhan.dev").toString() +
    `?title=${encodeURIComponent(title)}`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title, description, type: "article", publishedTime,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://onurhan.dev'}/blog/${blog.slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image", title, description,
      site: "@onurhan1337", creator: "@onurhan1337", images: [ogImage],
    },
  };
}

function fmt(iso: string | null | undefined) {
  if (!iso || iso === '0000-00-00 00:00:00') return '—';
  try {
    let d = iso;
    if (d.includes(' ') && !d.includes('T')) d = d.replace(' ', 'T') + 'Z';
    return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default async function AdminBlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const blog = await getAdminBlogBySlug(slug);
  const headings = blog ? extractHeadings(blog.content) : [];

  if (!blog) notFound();

  const api = (blog.apiData as any) ?? {};
  const blogId: number | undefined = api.id;
  const isPublished = api.blog_status === 'publish' || api.blog_status === 'published';
  const isPublic = api.blog_visibility === 'public';
  const notificationsOn = api.notification_status === 'all';
  const commentsOpen = api.comment_status === 'open';

  // Version info
  const draftVersionNumber: number | null = api.latest_draft_version_number ?? null;
  const draftTitle: string | null = api.latest_draft_blog_title ?? null;
  const publishedVersionNumber: number | null = api.latest_committed_version_number ?? null;
  const publishedTitle: string | null = api.latest_committed_blog_title ?? null;
  const publishedAt: string | null = api.latest_committed_published_at ?? null;
  const draftSavedAt: string | null = api.latest_draft_saved_at ?? null;

  // Stats
  const views: number = api.view_count ?? 0;
  const likes: number = blog.like_count ?? api.like_count ?? 0;
  const comments: number = blog.comment_count ?? 0;
  const createdAt: string | null = api.blog_date_created ?? null;

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
              ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://onurhan.dev'}${(blog.metadata as any).image}`
              : `${process.env.NEXT_PUBLIC_APP_URL || 'https://onurhan.dev'}/og?title=${blog.metadata.title}`,
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://onurhan.dev'}/blog/${blog.slug}`,
            author: { "@type": "Person", name: "Onurhan Demir" },
          }),
        }}
      />

      {/* ── Article ─────────────────────────────────────────────────── */}
      <div className="animate-in fade-in slide-in-from-left-4 duration-300 delay-100">
        {/* Title + edit pencil */}
        <div className="flex items-start gap-2 max-w-[650px]">
          <h1 className="title font-medium text-2xl tracking-tighter flex-1">
            {blog.metadata.title}
          </h1>
          {blogId && (
            <Link
              href={`/admin/blog/${blogId}/edit`}
              className="mt-1 shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Edit blog"
            >
              <Pencil size={16} />
            </Link>
          )}
        </div>

        {/* Subtitle */}
        <div className="flex justify-start items-center mt-2 text-sm max-w-[650px]">
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

        {/* ── Admin info strip ── */}
        {blogId && (
          <div className="mt-4 mb-8 space-y-3 max-w-[650px]">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                isPublished
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-green-500' : 'bg-yellow-500'}`} />
                {isPublished ? 'Published' : 'Draft'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                isPublic
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                  : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400'
              }`}>
                {isPublic ? '🌐 Public' : '🔒 Private'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                commentsOpen
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
              }`}>
                💬 Comments {commentsOpen ? 'on' : 'off'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                notificationsOn
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
              }`}>
                🔔 Notifications {notificationsOn ? 'on' : 'off'}
              </span>
            </div>

            {/* Version info */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground/70">Latest draft: </span>
                {draftVersionNumber != null
                  ? <><span className="font-medium text-foreground">v{draftVersionNumber}{draftTitle ? ` — ${draftTitle}` : ''}</span>{draftSavedAt ? ` · ${fmt(draftSavedAt)}` : ''}</>
                  : <span>No draft saved</span>
                }
              </div>
              <div>
                <span className="font-medium text-foreground/70">Published version: </span>
                {publishedVersionNumber != null
                  ? <><span className="font-medium text-foreground">v{publishedVersionNumber}{publishedTitle ? ` — ${publishedTitle}` : ''}</span>{publishedAt ? ` · ${fmt(publishedAt)}` : ''}</>
                  : <span>Not published</span>
                }
              </div>
            </div>

            {/* Created */}
            {createdAt && (
              <div className="text-xs text-muted-foreground">
                Created {fmt(createdAt)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-400 delay-200">
        <TableOfContents headings={headings} />
        <article className="prose prose-quoteless prose-neutral dark:prose-invert text-justify w-auto transition-all duration-200">
          <CustomMDX source={blog.content} />
        </article>

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

      {blogId && (
        <AdminBlogStats blogId={blogId} initialLikes={likes} views={views} comments={comments} />
      )}
    </section>
  );
}
