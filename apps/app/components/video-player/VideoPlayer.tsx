'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { VideoPlayerProps } from './types';

// Module-level dynamic imports — never inside the component
const DynamicVidstackPlayer = dynamic(
  () => import('./VidstackPlayer').then((m) => ({ default: m.VidstackPlayer })),
  {
    ssr: false,
    loading: () => (
      <div style={{ position: 'absolute', inset: 0, background: 'var(--color-accent)' }} />
    ),
  }
);

// ── URL classifiers ──────────────────────────────────────────────────────────

function getYouTubeId(src: string): string | null {
  const m = src.match(
    /(?:youtu\.be|youtube|youtube\.com|youtube-nocookie\.com)(?:\/shorts)?\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|)((?:\w|-){11})/
  );
  return m ? m[1] : null;
}

function getVimeoId(src: string): string | null {
  const m = src.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/);
  return m ? m[1] : null;
}

function isHLSorDASH(src: string): boolean {
  return /\.(m3u8|mpd)(\?.*)?$/i.test(src);
}

function isDirectVideo(src: string): boolean {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(src);
}

function getFilename(src: string): string {
  try {
    const url = new URL(src);
    const parts = url.pathname.split('/');
    return parts[parts.length - 1] || src;
  } catch {
    return src;
  }
}

// ── Static thumbnail components (thumbnailMode) ──────────────────────────────

function YouTubeThumbnail({ ytId, src }: { ytId: string; src: string }) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      title="Open in YouTube"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: 'block', cursor: 'pointer' }}
    >
      <img
        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
        alt="YouTube video thumbnail"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 44,
            background: '#FF0000',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.92,
          }}
        >
          <svg viewBox="0 0 24 24" fill="white" width="26" height="26" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </a>
  );
}

function VideoIconPlaceholder({ label }: { label: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 16px',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        width="32"
        height="32"
        style={{ color: 'var(--color-muted-foreground)', opacity: 0.5 }}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M3 8C3 6.89543 3.89543 6 5 6H13C14.1046 6 15 6.89543 15 8V16C15 17.1046 14.1046 18 13 18H5C3.89543 18 3 17.1046 3 16V8Z"
        />
      </svg>
      <span
        style={{
          fontSize: 11,
          color: 'var(--color-muted-foreground)',
          textAlign: 'center',
          wordBreak: 'break-all',
          maxWidth: '100%',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

// million-ignore
export function VideoPlayer({
  src,
  thumbnailMode,
  controls = true,
  autoPlay,
  onPlay,
  onPause,
  onTimeUpdate,
  onEnded,
}: VideoPlayerProps) {
  const rest = { controls, autoPlay, onPlay, onPause, onTimeUpdate, onEnded };

  if (!src) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <VideoIconPlaceholder label="No video URL set" />
      </div>
    );
  }

  const ytId = getYouTubeId(src);
  const vimeoId = getVimeoId(src);

  // ── thumbnailMode: static preview only, never renders VidstackPlayer ────
  if (thumbnailMode) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {ytId ? (
          <YouTubeThumbnail ytId={ytId} src={src} />
        ) : isDirectVideo(src) ? (
          // Native <video> works inside Lexical contenteditable="false" — no iframe needed
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={src}
            controls
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#000',
            }}
          />
        ) : (
          <VideoIconPlaceholder label={src} />
        )}
      </div>
    );
  }

  // ── Interactive player (public page) ────────────────────────────────────
  if (ytId || vimeoId || isHLSorDASH(src) || isDirectVideo(src)) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <DynamicVidstackPlayer key={src} src={src} {...rest} />
      </div>
    );
  }

  // Unknown URL — render as a link
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 12,
          color: 'var(--color-muted-foreground)',
          wordBreak: 'break-all',
          textAlign: 'center',
        }}
      >
        {src}
      </a>
    </div>
  );
}
