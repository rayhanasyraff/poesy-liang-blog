'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MDXEditor, type MDXEditorMethods } from '@mdxeditor/editor';
import { FullscreenHeader } from './FullscreenHeader';
import { useBlogStore } from '@/stores/blogs/useBlogStore';
import { useEditorFocusMode } from './hooks/useEditorFocusMode';
import { useEditorAutoSave } from './hooks/useEditorAutoSave';
import { buildMdxPlugins } from './utils/pluginConfig';
import './style.css';
import '@mdxeditor/editor/style.css';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BlogEditorHandle {
  focusBody: () => void;
}

// ── BlogEditor ────────────────────────────────────────────────────────────────
// Responsibilities:
//   • Mount MDXEditor with stable plugin list
//   • Register/unregister markdown accessor on mount/unmount
//   • Focus mode (enterFocusMode / handleDone) via useEditorFocusMode
//   • Body keyboard shortcuts: Backspace/ArrowUp/ArrowLeft → onFocusTitleAtEnd
//   • Schedule auto-save on content change via useEditorAutoSave
//   • Render focus-mode FullscreenHeader (Done button)
//   • Expose .focusBody() via useImperativeHandle

const BlogEditor = forwardRef<BlogEditorHandle, { onFocusTitleAtEnd?: () => void }>(
  ({ onFocusTitleAtEnd }, ref) => {
    const mdxEditorRef   = useRef<MDXEditorMethods | null>(null);
    const bodyWrapperRef = useRef<HTMLDivElement>(null);

    const blogTitle  = useBlogStore((s) => s.blogTitle);
    const saveStatus = useBlogStore((s) => s.saveStatus);
    const statusInfo = useBlogStore((s) => s.getBlogStatusInfo());

    const { registerMarkdownAccessor, resetEditorState, markBodyModified } = useBlogStore();

    const focusMode = useEditorFocusMode(bodyWrapperRef);
    const autoSave  = useEditorAutoSave();

    useImperativeHandle(ref, () => ({ focusBody: focusMode.focusBody }));

    // Register markdown accessor once on mount
    useEffect(() => {
      registerMarkdownAccessor(
        () => mdxEditorRef.current?.getMarkdown() ?? '',
        (md) => { mdxEditorRef.current?.setMarkdown(md); },
      );
    }, [registerMarkdownAccessor]);

    // Cancel pending timers + reset store on unmount
    useEffect(() => () => {
      autoSave.cancel();
      resetEditorState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Body keyboard shortcuts: navigate back to title from editor top
    useEffect(() => {
      const wrapper = bodyWrapperRef.current;
      if (!wrapper) return;

      const handler = (e: KeyboardEvent) => {
        const ce = wrapper.querySelector('[contenteditable]');
        if (!ce) return;

        if (e.key === 'Backspace') {
          const hasText = (ce.textContent ?? '').replaceAll('\u200B', '') !== '';
          if (hasText) return;
          const blocks = Array.from(ce.children);
          const isDefaultEmpty = blocks.length === 1 && blocks[0].tagName === 'P';
          if (!isDefaultEmpty) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          onFocusTitleAtEnd?.();
          return;
        }

        if (e.key === 'ArrowUp') {
          const sel = window.getSelection();
          if (!sel?.isCollapsed || !sel.rangeCount) return;
          const caretRect = sel.getRangeAt(0).getBoundingClientRect();
          const ceRect    = ce.getBoundingClientRect();
          if (!caretRect.height || caretRect.top < ceRect.top) return;
          if (caretRect.top - ceRect.top < caretRect.height) {
            e.preventDefault();
            e.stopImmediatePropagation();
            onFocusTitleAtEnd?.();
          }
          return;
        }

        if (e.key === 'ArrowLeft') {
          const sel = window.getSelection();
          if (!sel?.isCollapsed || !sel.rangeCount) return;
          try {
            const range = document.createRange();
            range.selectNodeContents(ce);
            range.setEnd(sel.anchorNode!, sel.anchorOffset);
            const textBefore = (range.cloneContents().textContent ?? '').replace(/\u200B/g, '');
            if (textBefore !== '') return;
          } catch { return; }
          e.preventDefault();
          e.stopImmediatePropagation();
          onFocusTitleAtEnd?.();
        }
      };

      wrapper.addEventListener('keydown', handler, true);
      return () => wrapper.removeEventListener('keydown', handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const mdxPlugins = useMemo(() => buildMdxPlugins(), []);

    const focused = focusMode.isContentFocused;

    // Single JSX tree — MDXEditor must never unmount between focus/normal mode.
    // Unmounting would trigger resetEditorState() and lose all editor content.
    return (
      <div
        className="blog-editor-root"
        style={focused ? {
          position: 'fixed', inset: 0, zIndex: 40,
          display: 'flex', flexDirection: 'column',
          background: 'var(--background, #fff)', overflow: 'hidden',
        } : {
          minHeight: '60vh',
        }}
      >
        {/* Focus-mode header (conditionally rendered but MDXEditor below never unmounts) */}
        <AnimatePresence initial={false}>
          {focused && (
            <motion.div
              key="focus-header"
              initial={{ y: -48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -48, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}
            >
              <FullscreenHeader
                onDone={focusMode.handleDone}
                title={blogTitle}
                showCenteredTitle
                lastDraftSavedAt={statusInfo.lastDraftSavedAt}
                draftVersionNumber={statusInfo.currentVersionNumber}
                publishedVersionNumber={statusInfo.publishedVersionNumber}
                saveStatus={saveStatus}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer for focus-mode fixed header */}
        {focused && <div style={{ flexShrink: 0, height: 48 }} />}

        {/* Scroll container: only active in focus mode */}
        <div
          ref={bodyWrapperRef}
          tabIndex={0}
          style={focused ? { flex: 1, minHeight: 0, overflowY: 'auto' } : {}}
          onPointerDownCapture={(e) => focusMode.onPointerDown(e)}
          onFocus={focusMode.onFocus}
        >
          {/* Inner column: centered max-width only in focus mode */}
          <div style={focused ? { maxWidth: 720, margin: '0 auto', padding: '24px 24px 88px' } : {}}>
            <MDXEditor
              ref={mdxEditorRef}
              className="blog-mdx-editor"
              markdown=""
              onChange={() => { markBodyModified(); autoSave.schedule(); }}
              plugins={mdxPlugins}
              contentEditableClassName="blog-editor-content prose prose-neutral dark:prose-invert text-justify"
            />
          </div>
        </div>
      </div>
    );
  },
);

BlogEditor.displayName = 'BlogEditor';
export { BlogEditor };
