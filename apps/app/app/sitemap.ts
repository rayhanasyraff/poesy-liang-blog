import { fetchBlogsCompatible } from "@/lib/api";

export default async function sitemap() {
  const allBlogs = await fetchBlogsCompatible();
  const blogs = allBlogs.map((blog) => ({
    url: `https://blog.poesyliang.com/blog/${blog.slug}`,
    lastModified: blog.metadata.publishedAt,
  }));

  const routes = ["", "/blog", "/about"].map((route) => ({
    url: `https://blog.poesyliang.com${route}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  return [...routes, ...blogs];
}
