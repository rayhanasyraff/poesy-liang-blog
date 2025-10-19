import { fetchBlogsCompatible } from "@/lib/api";

export default async function sitemap() {
  const blogs = (await fetchBlogsCompatible()).map((blog) => ({
    url: `https://onurhan.dev/blog/${blog.slug}`,
    lastModified: blog.metadata.publishedAt,
  }));

  const routes = ["", "/blog"].map((route) => ({
    url: `https://onurhan.dev${route}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  return [...routes, ...blogs];
}
