'use client';

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BoldItalicUnderlineToggles,
  StrikeThroughSupSubToggles,
  CodeToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  UndoRedo,
  ListsToggle,
  BlockTypeSelect,
  ButtonWithTooltip,
  Separator,
  DiffSourceToggleWrapper,
  insertMarkdown$,
  usePublisher,
} from '@mdxeditor/editor';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Kept for callers that imported the old type – now unused internally. */
export type ContentViewMode = 'rich-text' | 'source' | 'diff';

// ── BottomToolbarContents ─────────────────────────────────────────────────────
//
// Rendered inside toolbarPlugin's React context so mdxeditor toolbar
// components work correctly (they need the editor realm context).
// Uses createPortal so the DOM output appears at the bottom of the screen,
// not inside the editor's toolbar container.
//
// Visibility is controlled via document.body dataset set by BlogEditor:
//   document.body.dataset.editorFocused = 'true' | 'false'
// Position is controlled via:
//   document.body.dataset.editorLeft / document.body.dataset.editorRight

// ── InsertVideoButton ─────────────────────────────────────────────────────────

function InsertVideoButton({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const insertMd = usePublisher(insertMarkdown$);

  // Clear url whenever the popover closes for any reason
  useEffect(() => {
    if (!open) setUrl('');
    else setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleInsert = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    insertMd(`<Video url="${trimmed}" />\n`);
    onOpenChange(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <ButtonWithTooltip title="Insert video" onClick={() => onOpenChange(!open)}>
        {/* video camera icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M3 8C3 6.89543 3.89543 6 5 6H13C14.1046 6 15 6.89543 15 8V16C15 17.1046 14.1046 18 13 18H5C3.89543 18 3 17.1046 3 16V8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </ButtonWithTooltip>

      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(72px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--background)',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            zIndex: 200,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            minWidth: 320,
          }}
        >
          <input
            ref={inputRef}
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleInsert();
              if (e.key === 'Escape') onOpenChange(false);
            }}
            placeholder="YouTube URL or .mp4/.webm URL"
            style={{
              flex: 1,
              fontSize: 13,
              padding: '5px 8px',
              borderRadius: 6,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              outline: 'none',
            }}
          />
          <button
            onClick={handleInsert}
            disabled={!url.trim()}
            style={{
              fontSize: 12,
              padding: '5px 10px',
              borderRadius: 6,
              border: 'none',
              background: url.trim() ? 'hsl(var(--foreground))' : 'hsl(var(--muted))',
              color: url.trim() ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))',
              cursor: url.trim() ? 'pointer' : 'default',
              flexShrink: 0,
            }}
          >
            Insert
          </button>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              fontSize: 12,
              padding: '5px 8px',
              borderRadius: 6,
              border: '1px solid hsl(var(--border))',
              background: 'transparent',
              color: 'hsl(var(--muted-foreground))',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── ToolbarButtons ────────────────────────────────────────────────────────────
// Memoized separately so isFocused / keyboardOffset changes in the parent
// don't cascade into the 100+ Radix primitive components inside the toolbar.
const ToolbarButtons = memo(function ToolbarButtons() {
  const [videoOpen, setVideoOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Tracks an in-progress mouse drag so we can (a) update scrollLeft and
  // (b) suppress the resulting click event on whichever button was under
  // the pointer when the user releases after scrolling.
  const drag = useRef({ active: false, didMove: false, startX: 0, scrollLeft: 0 });

  // Close the video popover and any open Radix overlay (Select, Dialog, etc.)
  const closeAll = useCallback(() => {
    setVideoOpen(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Mouse wheel over the toolbar → horizontal scroll + close any open overlay.
    // passive:false required so we can call preventDefault() and stop the
    // page from also scrolling vertically.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      closeAll();
      el.scrollLeft += e.deltaX !== 0 ? e.deltaX : e.deltaY;
    };

    const onMouseDown = (e: MouseEvent) => {
      drag.current = { active: true, didMove: false, startX: e.clientX, scrollLeft: el.scrollLeft };
      el.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      if (Math.abs(dx) > 4) {
        if (!drag.current.didMove) closeAll(); // close once on first real movement
        drag.current.didMove = true;
        el.scrollLeft = drag.current.scrollLeft - dx;
      }
    };

    const onMouseUp = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      el.style.cursor = 'grab';
    };

    // If the mouse actually moved during the drag, eat the resulting click so
    // we don't accidentally activate a toolbar button on scroll release.
    const onClickCapture = (e: MouseEvent) => {
      if (drag.current.didMove) {
        drag.current.didMove = false;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('click', onClickCapture, true);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [closeAll]);

  return (
    <div
      ref={scrollRef}
      className="editor-content-toolbar rounded-full border border-border/50 bg-background shadow-xl shadow-black/12"
      style={{
        width: 'min(390px, calc(100vw - 2rem))',
        overflowX: 'scroll',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x',
        flexShrink: 0,
        cursor: 'grab',
      } as React.CSSProperties}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 8px' }}>
        <DiffSourceToggleWrapper>
          <UndoRedo />
          <Separator />
          <BlockTypeSelect />
          <Separator />
          <BoldItalicUnderlineToggles />
          <StrikeThroughSupSubToggles />
          <CodeToggle />
          <Separator />
          <ListsToggle />
          <Separator />
          <CreateLink />
          <InsertImage />
          <InsertVideoButton open={videoOpen} onOpenChange={setVideoOpen} />
          <InsertTable />
          <InsertThematicBreak />
        </DiffSourceToggleWrapper>
      </div>
    </div>
  );
});

export const BottomToolbarContents = memo(function BottomToolbarContents() {
  const [mounted, setMounted] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [editorLeft, setEditorLeft] = useState(0);
  const [editorRight, setEditorRight] = useState(0);

  useEffect(() => setMounted(true), []);

  // Watch body data-editor-focused attribute for show/hide
  useEffect(() => {
    const check = () =>
      setIsFocused(document.body.dataset.editorFocused === 'true');
    const obs = new MutationObserver(check);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-editor-focused'],
    });
    check();
    return () => obs.disconnect();
  }, []);

  // Watch editor left/right bounds so toolbar centers within the editor area
  useEffect(() => {
    const read = () => {
      setEditorLeft(Number(document.body.dataset.editorLeft ?? 0));
      setEditorRight(Number(document.body.dataset.editorRight ?? 0));
    };
    const obs = new MutationObserver(read);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-editor-left', 'data-editor-right'],
    });
    read();
    return () => obs.disconnect();
  }, []);

  // Mobile keyboard offset (keeps toolbar above virtual keyboard)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const vv = (window as any).visualViewport;
      setKeyboardOffset(
        vv && typeof vv.height === 'number'
          ? Math.max(0, window.innerHeight - vv.height)
          : 0,
      );
    };
    update();
    const vv = (window as any).visualViewport;
    vv?.addEventListener?.('resize', update);
    vv?.addEventListener?.('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      vv?.removeEventListener?.('resize', update);
      vv?.removeEventListener?.('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (!mounted) return null;

  // No createPortal — toolbar stays in MDXEditor's React tree so Radix dropdowns
  // work correctly (nested portals cause DismissableLayer to fire immediately).
  // position:fixed on the motion.div escapes the toolbar container's overflow:hidden.
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isFocused ? 1 : 0, y: isFocused ? 0 : 8 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      onPointerDown={() => { document.body.dataset.editorFocused = 'true'; }}
      style={{
        position: 'fixed',
        left: editorLeft,
        right: editorRight,
        zIndex: 99999,
        bottom: `calc(${keyboardOffset}px + env(safe-area-inset-bottom))`,
        pointerEvents: isFocused ? 'auto' : 'none',
        display: 'flex',
        justifyContent: 'center',
        padding: '8px 16px 12px',
        willChange: 'transform',
      }}
    >
      <ToolbarButtons />
    </motion.div>
  );
});
