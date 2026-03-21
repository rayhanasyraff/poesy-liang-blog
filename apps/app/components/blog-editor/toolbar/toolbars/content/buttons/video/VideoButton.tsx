'use client';
import { useRef, useState, useEffect } from 'react';

interface VideoButtonProps {
  onInsert: (url: string) => void;
  active?: boolean;
  disabled?: boolean;
}

export function VideoButton({ onInsert, disabled }: VideoButtonProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setUrl('');
    } else {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleInsert = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onInsert(trimmed);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        title="Insert video"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="h-8 w-8 flex items-center justify-center rounded-full flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M3 8C3 6.89543 3.89543 6 5 6H13C14.1046 6 15 6.89543 15 8V16C15 17.1046 14.1046 18 13 18H5C3.89543 18 3 17.1046 3 16V8Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-1.5 rounded-[10px] border border-border bg-background px-3 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] min-w-80">
          <input
            ref={inputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInsert();
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="YouTube URL or .mp4/.webm URL"
            className="flex-1 text-[13px] px-2 py-1 rounded-md border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleInsert}
            disabled={!url.trim()}
            className="flex-shrink-0 text-xs px-2.5 py-1 rounded-md bg-foreground text-background cursor-pointer disabled:bg-muted disabled:text-muted-foreground disabled:cursor-default"
          >
            Insert
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-shrink-0 text-xs px-2 py-1 rounded-md border border-border bg-transparent text-muted-foreground cursor-pointer hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
