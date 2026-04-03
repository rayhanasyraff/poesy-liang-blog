'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  TwitterEmbed,
  InstagramEmbed,
  FacebookEmbed,
  TikTokEmbed,
  PinterestEmbed,
} from 'react-social-media-embed';
import { detectPlatform } from './detect';
import { Post as BskyPost } from 'bsky-react-post';
import 'bsky-react-post/theme.css';


// ── Threads embed ─────────────────────────────────────────────────────────────
// Uses xandr.js blockquote approach. The script injects an iframe — we listen
// for its postMessage resize events so the container fits the post exactly.

function ThreadsEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(480);
  const [useIframe, setUseIframe] = useState(false);

  // Strip query params and normalise threads.com → threads.net
  const cleanUrl = (() => {
    try {
      const u = new URL(url);
      u.search = '';
      u.hostname = u.hostname.replace('threads.com', 'threads.net');
      return u.toString().replace(/\/$/, '');
    } catch {
      return url;
    }
  })();

  // Listen for height messages from the Threads iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.data !== 'object' || !e.data) return;
      // Threads sends { type: 'resize', height: N }
      if (e.data.type === 'resize' && typeof e.data.height === 'number') {
        setIframeHeight(e.data.height);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    function ensureScript(): Promise<void> {
      return new Promise((resolve) => {
        const src = 'https://www.threads.net/xandr.js';
        if (!document.querySelector(`script[src="${src}"]`)) {
          const s = document.createElement('script');
          s.src = src;
          s.async = true;
          document.head.appendChild(s);
          s.onload = () => resolve();
          s.onerror = () => resolve();
        } else {
          resolve();
        }
      });
    }

    ensureScript().then(() => {
      const timer = window.setTimeout(() => {
        if (containerRef.current && !containerRef.current.querySelector('iframe')) {
          setUseIframe(true);
        }
      }, 3000);
      return () => window.clearTimeout(timer);
    });
  }, [cleanUrl]);

  if (useIframe) {
    return (
      <iframe
        ref={iframeRef}
        src={`${cleanUrl}/embed`}
        title="Threads post"
        scrolling="no"
        style={{
          width: '100%',
          maxWidth: 540,
          height: iframeHeight,
          border: 0,
          background: 'transparent',
          overflow: 'hidden',
          display: 'block',
          margin: '0 auto',
        }}
        loading="lazy"
      />
    );
  }

  return (
    <div ref={containerRef} style={{ maxWidth: 540, margin: '0 auto' }}>
      <blockquote
        className="text-post-media"
        data-url={cleanUrl}
        data-media-url={cleanUrl}
        style={{ border: 0, margin: 0, padding: 0 }}
      />
    </div>
  );
}

// ── BlueSky embed ──────────────────────────────────────────────────────────────

function BlueSkyEmbed({ url }: { url: string }) {
  let handle: string | null = null;
  let id: string | null = null;
  try {
    const u = new URL(url);
    const match = u.pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)/);
    if (match) { handle = match[1]; id = match[2]; }
  } catch {}

  if (!handle || !id) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 underline break-all">
        {url}
      </a>
    );
  }

  return <BskyPost handle={handle} id={id} />;
}

// ── Main public-page component ─────────────────────────────────────────────────

export default function SocialPost({ url }: { url: string }) {
  if (!url) return null;

  const platform = detectPlatform(url);

  return (
    <div className="not-prose my-6 flex justify-center">
      {platform === 'x' && (
        <TwitterEmbed url={url} width={480} />
      )}
      {platform === 'instagram' && (
        <InstagramEmbed url={url} width={480} />
      )}
      {platform === 'facebook' && (
        <FacebookEmbed url={url} width={480} />
      )}
      {platform === 'tiktok' && (
        <TikTokEmbed url={url} width={480} />
      )}
      {platform === 'pinterest' && (
        <PinterestEmbed url={url} width={480} />
      )}
      {platform === 'threads' && (
        <ThreadsEmbed url={url} />
      )}
      {platform === 'bluesky' && (
        <BlueSkyEmbed url={url} />
      )}
      {platform === 'unknown' && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 underline break-all"
        >
          {url}
        </a>
      )}
    </div>
  );
}
