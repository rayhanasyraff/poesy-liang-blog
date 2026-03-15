"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  blogId: string | number;
  initialLikes?: number;
}

export default function ClapLikeButton({ blogId, initialLikes = 0 }: Props) {
  const [likes, setLikes] = useState<number>(initialLikes ?? 0);
  const [liked, setLiked] = useState<boolean>(false);
  const [burstKey, setBurstKey] = useState<number>(0);
  const apiBase = '/api/proxy';
  const storageKey = `liked:${String(blogId)}`;

  useEffect(() => {
    try { const v = localStorage.getItem(storageKey); if (v === '1') setLiked(true); } catch (e) {}

    (async () => {
      try {
        const res = await fetch(`${apiBase}/blogs/${blogId}/likes`);
        if (!res.ok) return;
        const json = await res.json();
        if (json && json.success && typeof json.likes === 'number') setLikes(json.likes);
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [String(blogId)]);

  const doLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l + 1 : Math.max(0, l - 1));
    if (next) setBurstKey(k => k + 1);

    try {
      if (next) {
        const res = await fetch(`${apiBase}/blogs/${blogId}/likes`, { method: 'POST' });
        const json = await res.json().catch(() => null);
        if (res.ok && json && json.success) { setLikes(json.likes); localStorage.setItem(storageKey, '1'); return; }
      } else {
        const res = await fetch(`${apiBase}/blogs/${blogId}/likes`, { method: 'DELETE' });
        const json = await res.json().catch(() => null);
        if (res.ok && json && json.success) { setLikes(json.likes); localStorage.removeItem(storageKey); return; }
      }
    } catch (e) {}

    setLiked(!next);
    setLikes(l => next ? Math.max(0, l - 1) : l + 1);
  };

  // simple bottom-right fixed button
  const iconVariants = { idle: { scale: 1 }, clap: { scale: [1, 1.18, 1] } };
  const countVariants = { idle: { scale: 1 }, pop: { scale: [1, 1.12, 1] } };
  const particles = [ { x: -14, y: -12, r: 4 }, { x: 2, y: -16, r: 3 }, { x: 16, y: -8, r: 4 } ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={doLike}
        aria-pressed={liked}
        aria-label={liked ? 'Unlike' : 'Clap'}
        title={liked ? 'Unlike' : 'Clap'}
        className={`relative inline-flex items-center gap-3 px-3 py-2 rounded-full shadow-lg focus:outline-none transition-colors duration-200 ring-1 hover:ring-neutral-200 ${liked ? 'bg-rose-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'}`}>

        <motion.span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full"
          variants={iconVariants}
          animate={liked ? 'clap' : 'idle'}
          transition={{ duration: 0.32 }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.25} className={`${liked ? 'text-white' : 'text-neutral-700 dark:text-neutral-200'}`}>
            <path d="M7 8c-1 1-1 3 0 4l3 3 3-3c1-1 1-3 0-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 3v2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 5l1 1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 5l-1 1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>

        <motion.span
          className={`text-sm font-medium leading-none ${liked ? 'text-white' : 'text-neutral-700 dark:text-neutral-200'}`}
          variants={countVariants}
          animate={liked ? 'pop' : 'idle'}
          transition={{ duration: 0.28 }}
        >
          {likes}
        </motion.span>

        {burstKey > 0 && (
          <> {particles.map((p, i) => (
            <motion.span key={`p-${burstKey}-${i}`} initial={{ opacity: 1, scale: 0 }} animate={{ opacity: [1, 0], scale: [0, 1, 0.6], x: p.x, y: p.y }} transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.03 }} style={{ position: 'absolute', left: '50%', top: '18%', pointerEvents: 'none', transform: 'translate(-50%, -50%)' }}>
              <span className="block rounded-full bg-white/80 dark:bg-white/70" style={{ width: p.r, height: p.r }} />
            </motion.span>
          )) } </>
        )}

      </button>
    </div>
  );
}
