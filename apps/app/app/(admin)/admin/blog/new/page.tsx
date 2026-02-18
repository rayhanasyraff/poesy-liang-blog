"use client"

import { useState } from "react";
import Container from "@/components/shared/container";
import { createBlog } from "@/api/api";

export default function NewBlogPage() {
  const [form, setForm] = useState({
    blog_title: "",
    blog_name: "",
    blog_excerpt: "",
    blog_content: "",
    tags: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createBlog(form);
      if (res && res.success) {
        // If API returns an id or data, could navigate to edit; for now go back to admin blog list
        window.location.href = "/admin/blog";
      } else {
        alert(res?.message || "Failed to create blog");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to create blog");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="large">
      <h1 className="text-2xl font-bold mb-6">Create New Blog</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            name="blog_title"
            value={form.blog_title}
            onChange={handleChange}
            required
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Slug (blog_name)</label>
          <input
            name="blog_name"
            value={form.blog_name}
            onChange={handleChange}
            required
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Excerpt</label>
          <textarea
            name="blog_excerpt"
            value={form.blog_excerpt}
            onChange={handleChange}
            rows={3}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Content</label>
          <textarea
            name="blog_content"
            value={form.blog_content}
            onChange={handleChange}
            rows={10}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
          <input
            name="tags"
            value={form.tags}
            onChange={handleChange}
            className="w-full rounded border p-2"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-md bg-primary text-white px-3 py-1 text-sm hover:opacity-90"
          >
            {saving ? "Saving..." : "Create Blog"}
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = "/admin/blog")}
            className="inline-flex items-center rounded-md border px-3 py-1 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </Container>
  );
}
