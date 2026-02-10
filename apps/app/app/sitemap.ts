import { getBlogPosts } from "app/db/blog";

export default async function sitemap() {
  const blogs = getBlogPosts().map((blog) => ({
    url: `https://blog.poesyliang.com/blog/${blog.slug}`,
    lastModified: blog.metadata.publishedAt,
  }));

  const routes = ["", "/blog", "/about"].map((route) => ({
    url: `https://blog.poesyliang.com${route}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  return [...routes, ...blogs];
}
