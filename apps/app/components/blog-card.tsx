import Link from "next/link";
import type { Blog } from "@/types/blog";

interface BlogCardProps {
  blog: Blog;
}

export const BlogCard = ({ blog }: BlogCardProps) => {
  // Format date properly based on source with better error handling
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) {
        return "No date";
      }

      // Handle various date formats
      let processedDate = dateString;

      // If it's a WordPress/MySQL format (YYYY-MM-DD HH:MM:SS), convert to ISO
      if (processedDate.includes(' ') && !processedDate.includes('T')) {
        processedDate = processedDate.replace(' ', 'T');
        // Add Z if no timezone info
        if (!processedDate.includes('+') && !processedDate.includes('Z')) {
          processedDate += 'Z';
        }
      }

      const date = new Date(processedDate);
      if (isNaN(date.getTime())) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Could not parse date:', dateString, 'processed:', processedDate);
        }
        return "Invalid date";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error formatting date:', dateString, error);
      }
      return "Date error";
    }
  };

  return (
    <article className="py-4 sm:py-8 dark:border-b-zinc-800 transition-opacity duration-200 hover:opacity-90">
      <header>
        <h3 className="font-semibold underline underline-offset-4 decoration-1 decoration-zinc-300 transition-colors duration-200 hover:decoration-zinc-500">
          <Link href={`/blog/${blog.slug}`}>{blog.metadata.title}</Link>
        </h3>
        {blog.metadata.summary && (
          <p className="mt-1 opacity-70 dark:opacity-60">
            {blog.metadata.summary}
          </p>
        )}
      </header>
      <footer className="mt-1 flex items-center space-x-2 font-mono text-sm uppercase tracking-wider opacity-50 dark:opacity-40">
        <time dateTime={blog.metadata.publishedAt}>
          {formatDate(blog.metadata.publishedAt)}
        </time>
        <span>·</span>
        <span>{blog.readingTime} MIN READ</span>
      </footer>
    </article>
  );
};
