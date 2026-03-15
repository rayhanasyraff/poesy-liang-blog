'use client';

import { useEffect, useState } from 'react';
import { Eye, Heart, MessageSquare } from 'lucide-react';

interface Props {
  blogId: number;
  initialLikes: number;
  views: number;
  comments: number;
}

export function AdminBlogStats({ blogId, initialLikes, views, comments }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const storageKey = `liked:${blogId}`;

  useEffect(() => {
    try { if (localStorage.getItem(storageKey) === '1') setLiked(true); } catch {}
    fetch(`/api/proxy/blogs/${blogId}/likes`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.success && typeof json.likes === 'number') setLikes(json.likes); })
      .catch(() => {});
  }, [blogId]);

  const doLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l + 1 : Math.max(0, l - 1));
    try {
      const method = next ? 'POST' : 'DELETE';
      const res = await fetch(`/api/proxy/blogs/${blogId}/likes`, { method });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && typeof json.likes === 'number') {
        setLikes(json.likes);
        next ? localStorage.setItem(storageKey, '1') : localStorage.removeItem(storageKey);
        return;
      }
    } catch {}
    setLiked(!next);
    setLikes(l => next ? Math.max(0, l - 1) : l + 1);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="inline-flex items-center gap-0 rounded-full shadow-lg ring-1 ring-neutral-200 dark:ring-neutral-700 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        {/* Views */}
        <div className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">
          <Eye size={14} strokeWidth={1.8} />
          <span className="font-medium tabular-nums">{views}</span>
        </div>

        <span className="w-px h-4 bg-neutral-300 dark:bg-neutral-600" />

        {/* Likes — interactive */}
        <button
          type="button"
          onClick={doLike}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike' : 'Like'}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
            liked
              ? 'text-rose-500'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-rose-400'
          }`}
        >
          <Heart size={14} strokeWidth={1.8} fill={liked ? 'currentColor' : 'none'} />
          <span className="tabular-nums">{likes}</span>
        </button>

        <span className="w-px h-4 bg-neutral-300 dark:bg-neutral-600" />

        {/* Comments */}
        <div className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">
          <MessageSquare size={14} strokeWidth={1.8} />
          <span className="font-medium tabular-nums">{comments}</span>
        </div>
      </div>
    </div>
  );
}
