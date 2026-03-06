"use client"

import { useState } from "react";
import dynamic from "next/dynamic";
import Container from "@/components/shared/container";
import { createBlog } from "@/api/api";

const BlogEditor = dynamic(() => import("@/components/blog-editor/BlogEditor").then((mod) => mod.BlogEditor), { ssr: false });

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
    <main className="min-h-screen h-screen w-full p-0 m-0 bg-background">
      <div className="h-full w-full">
        <BlogEditor style={{ height: '100vh' }} />
      </div>
    </main>
  );
}

