"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  blogId: string | number;
  initialLikes?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const COOKIE_PREFIX  = "liked_";
const STORAGE_PREFIX = "liked:";
const FP_KEY         = "device_fingerprint";
const QUEUE_KEY      = "pending_likes";
const COOLDOWN_MS    = 1500;

// ── Storage helpers ────────────────────────────────────────────────────────────

function getLikedFromStorage(id: string): boolean {
  try { if (localStorage.getItem(`${STORAGE_PREFIX}${id}`) === "1") return true; } catch {}
  try { return document.cookie.split(";").some(c => c.trim() === `${COOKIE_PREFIX}${id}=1`); } catch {}
  return false;
}

function setLikedInStorage(id: string, liked: boolean) {
  try {
    liked ? localStorage.setItem(`${STORAGE_PREFIX}${id}`, "1") : localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
  } catch {}
  try {
    if (liked) {
      const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${COOKIE_PREFIX}${id}=1; expires=${exp}; path=/; SameSite=Lax`;
    } else {
      document.cookie = `${COOKIE_PREFIX}${id}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  } catch {}
}

// ── Browser fingerprint ────────────────────────────────────────────────────────

function getOrCreateFingerprint(): string {
  try { const s = localStorage.getItem(FP_KEY); if (s) return s; } catch {}
  const raw = [
    navigator.userAgent, navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency ?? ""),
    String(navigator.maxTouchPoints ?? ""),
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) & 0xffffffff;
  const fp = Math.abs(hash).toString(36);
  try { localStorage.setItem(FP_KEY, fp); } catch {}
  return fp;
}

// ── Offline queue ──────────────────────────────────────────────────────────────

type QueueItem = { blogId: string; action: "like" | "unlike" };

function getQueue(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function saveQueue(q: QueueItem[]) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} }
function enqueue(item: QueueItem) { saveQueue([...getQueue().filter(i => i.blogId !== item.blogId), item]); }
function dequeue(blogId: string) { saveQueue(getQueue().filter(i => i.blogId !== blogId)); }

// ── Number formatting ──────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

// ── Animated counter hook ──────────────────────────────────────────────────────

function useAnimatedCount(target: number): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    if (prevRef.current === target) return;
    const diff  = target - prevRef.current;
    const steps = Math.min(Math.abs(diff), 12);
    const step  = diff / steps;
    let current = prevRef.current;
    let i       = 0;
    prevRef.current = target;

    const id = setInterval(() => {
      i++;
      current += step;
      setDisplay(i >= steps ? target : Math.round(current));
      if (i >= steps) clearInterval(id);
    }, 25);

    return () => clearInterval(id);
  }, [target]);

  return display;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ClapLikeButton({ blogId, initialLikes = 0 }: Props) {
  const id = String(blogId);

  const [likes, setLikes]                 = useState<number>(initialLikes ?? 0);
  const [liked, setLiked]                 = useState<boolean>(false);
  const [isLoading, setIsLoading]         = useState<boolean>(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [tooltip, setTooltip]             = useState<string>("");
  const [errorMsg, setErrorMsg]           = useState<string>("");
  const [floats, setFloats]               = useState<number[]>([]);
  const [hidden, setHidden]               = useState<boolean>(false);

  const displayCount = useAnimatedCount(likes);
  const queryClient  = useQueryClient();
  const fpRef        = useRef<string>("");

  const showTooltip = (msg: string) => { setTooltip(msg); setTimeout(() => setTooltip(""), 3000); };
  const showError   = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 3000); };

  // Fingerprint on mount
  useEffect(() => { fpRef.current = getOrCreateFingerprint(); }, []);

  // Sync from server on mount
  useEffect(() => {
    const localLiked = getLikedFromStorage(id);
    setLiked(localLiked);

    (async () => {
      try {
        const res = await fetch(`/api/proxy/blogs/${id}/likes`, {
          headers: fpRef.current ? { "x-device-fingerprint": fpRef.current } : {},
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!json?.success) return;
        if (typeof json.likes === "number") setLikes(json.likes);
        if (typeof json.has_liked === "boolean") {
          setLiked(json.has_liked);
          setLikedInStorage(id, json.has_liked);
          if (json.has_liked && !localLiked) showTooltip("Already liked from another device");
        }
      } catch {}
    })();
  }, [id]);

  // Flush offline queue when coming back online
  useEffect(() => {
    const flush = async () => {
      for (const item of getQueue()) {
        try {
          const res = await fetch(`/api/proxy/blogs/${item.blogId}/likes`, {
            method: item.action === "like" ? "POST" : "DELETE",
            headers: fpRef.current ? { "x-device-fingerprint": fpRef.current } : {},
          });
          if (res.ok) dequeue(item.blogId);
        } catch {}
      }
    };
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);

  // Hide when footer is visible
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  // Keyboard shortcut: press L to like
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "l" || e.key === "L") doLike();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [liked, isLoading, cooldownUntil]);

  const sendLike = useCallback(async (next: boolean) => {
    const res = await fetch(`/api/proxy/blogs/${id}/likes`, {
      method: next ? "POST" : "DELETE",
      headers: fpRef.current ? { "x-device-fingerprint": fpRef.current } : {},
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success) return json;
    return null;
  }, [id]);

  const doLike = useCallback(async () => {
    if (isLoading || Date.now() < cooldownUntil) return;

    const next = !liked;
    setIsLoading(true);
    setLiked(next);
    setLikes(l => next ? l + 1 : Math.max(0, l - 1));

    if (next) {
      setBurstKey(k => k + 1);
      setFloats(f => [...f, Date.now()]);
      try { navigator.vibrate?.(50); } catch {}
    }

    if (!navigator.onLine) {
      enqueue({ blogId: id, action: next ? "like" : "unlike" });
      setLikedInStorage(id, next);
      setIsLoading(false);
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      showTooltip("Saved — will sync when online");
      return;
    }

    try {
      const result = await sendLike(next);
      if (result) {
        if (typeof result.likes === "number") {
          setLikes(result.likes);
          queryClient.setQueryData(["blog-posts"], (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                rows: page.rows.map((row: any) =>
                  String((row.apiData as any)?.id) === id
                    ? { ...row, like_count: result.likes }
                    : row
                ),
              })),
            };
          });
        }
        if (typeof result.has_liked === "boolean") setLiked(result.has_liked);
        setLikedInStorage(id, next);
        setCooldownUntil(Date.now() + COOLDOWN_MS);
        setIsLoading(false);
        return;
      }
    } catch {}

    // Roll back
    setLiked(!next);
    setLikes(l => next ? Math.max(0, l - 1) : l + 1);
    setIsLoading(false);
    showError("Failed to like — try again");
  }, [id, liked, isLoading, cooldownUntil, sendLike, queryClient]);

  const [burstKey, setBurstKey] = useState(0);
  const particles = [{ x: -14, y: -12, r: 4 }, { x: 2, y: -16, r: 3 }, { x: 16, y: -8, r: 4 }];

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Screen reader announcement */}
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {likes} {likes === 1 ? "like" : "likes"}
          </span>

          {/* Tooltip (device sync / offline) */}
          <AnimatePresence>
            {tooltip && (
              <motion.div
                key="tooltip"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="text-xs bg-neutral-800 text-white px-3 py-1.5 rounded-full shadow-md whitespace-nowrap"
              >
                {tooltip}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-full shadow-md whitespace-nowrap"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* +1 floats */}
          <AnimatePresence>
            {floats.map(key => (
              <motion.span
                key={key}
                className="absolute bottom-full right-3 text-sm font-semibold text-rose-500 pointer-events-none select-none"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                onAnimationComplete={() => setFloats(f => f.filter(k => k !== key))}
              >
                +1
              </motion.span>
            ))}
          </AnimatePresence>

          {/* Button */}
          <button
            onClick={doLike}
            disabled={isLoading || Date.now() < cooldownUntil}
            aria-pressed={liked}
            aria-label={`${liked ? "Unlike" : "Like"} — ${likes} ${likes === 1 ? "like" : "likes"} — keyboard shortcut: L`}
            title={`${liked ? "Unlike" : "Like"} (press L)`}
            className={`relative inline-flex items-center gap-3 px-3 py-2 rounded-full shadow-lg focus:outline-none transition-colors duration-200 ring-1 hover:ring-neutral-200 disabled:opacity-60 disabled:cursor-not-allowed ${liked ? "bg-rose-500 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"}`}
          >
            <motion.span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full"
              animate={liked ? { scale: [1, 1.18, 1] } : { scale: 1 }}
              transition={{ duration: 0.32 }}
            >
              {isLoading ? (
                <span className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" className={liked ? "text-white" : "text-neutral-700 dark:text-neutral-200"}>
                  <use href={liked ? "#icon-claps-fill" : "#icon-claps"} />
                </svg>
              )}
            </motion.span>

            <motion.span
              className={`text-sm font-medium leading-none tabular-nums ${liked ? "text-white" : "text-neutral-700 dark:text-neutral-200"}`}
              animate={liked ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ duration: 0.28 }}
            >
              {formatCount(displayCount)}
            </motion.span>

            {/* Burst particles */}
            {burstKey > 0 && particles.map((p, i) => (
              <motion.span
                key={`p-${burstKey}-${i}`}
                initial={{ opacity: 1, scale: 0 }}
                animate={{ opacity: [1, 0], scale: [0, 1, 0.6], x: p.x, y: p.y }}
                transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.03 }}
                style={{ position: "absolute", left: "50%", top: "18%", pointerEvents: "none", transform: "translate(-50%, -50%)" }}
              >
                <span className="block rounded-full bg-white/80 dark:bg-white/70" style={{ width: p.r, height: p.r }} />
              </motion.span>
            ))}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
