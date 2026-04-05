"use client";

import { useEffect } from "react";

export default function ViewTracker({ blogId }: { blogId: number }) {
  useEffect(() => {
    fetch(`/api/proxy/blogs/${blogId}/views`, { method: "POST" }).catch(() => {});
  }, [blogId]);

  return null;
}
