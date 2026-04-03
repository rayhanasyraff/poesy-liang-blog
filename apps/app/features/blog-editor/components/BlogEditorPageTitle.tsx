'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { useBlogStore } from '@/stores/blogs/useBlogStore';
import { BlogEditorPageTitleMeta } from './BlogEditorPageTitleMeta';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BlogEditorPageTitleHandle {
  focusTitleAtEnd: () => void;
}

interface BlogEditorPageTitleProps {
  onFocusBody: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const BlogEditorPageTitle = forwardRef<BlogEditorPageTitleHandle, BlogEditorPageTitleProps>(
  ({ onFocusBody }, ref) => {
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const blogTitle          = useBlogStore((s) => s.blogTitle);
    const saveStatus         = useBlogStore((s) => s.saveStatus);
    const unsavedChangesAt   = useBlogStore((s) => s.unsavedChangesAt);
    const statusInfo         = useBlogStore((s) => s.getBlogStatusInfo());
    const { setBlogTitle, setUnsavedChangesAt } = useBlogStore();

    useImperativeHandle(ref, () => ({
      focusTitleAtEnd: () => {
        const t = titleRef.current;
        if (!t) return;
        t.focus();
        try { const len = t.value.length; t.setSelectionRange(len, len); } catch {}
      },
    }));

    // Initialize textarea height once on mount
    useEffect(() => {
      const t = titleRef.current;
      if (t) {
        try { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; } catch {}
      }
    }, []);

    // Auto-save draft 800 ms after each title change
    useEffect(() => {
      if (!blogTitle) return;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => { useBlogStore.getState().saveDraft(); }, 800);
      return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blogTitle]);

    // ── Handlers ────────────────────────────────────────────────────────────────

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const title = titleRef.current;
      if (e.key === 'Enter') { e.preventDefault(); onFocusBody(); return; }
      if (e.key === 'ArrowRight') {
        if (!title) return;
        if ((title.selectionStart ?? 0) >= (title.value?.length ?? 0)) { e.preventDefault(); onFocusBody(); }
        return;
      }
      if (e.key === 'ArrowDown') {
        if (!title) return;
        if ((title.selectionStart ?? 0) >= (title.value?.length ?? 0)) { e.preventDefault(); onFocusBody(); }
      }
    }, [onFocusBody]);

    const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      try { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } catch {}
      const rawText = (el.value ?? '').replace(/\u200B/g, '');
      const trimmed = rawText.trim();
      el.parentElement?.setAttribute('data-empty', trimmed === '' ? 'true' : 'false');
      setBlogTitle(rawText);
      setUnsavedChangesAt(new Date());
    }, [setBlogTitle, setUnsavedChangesAt]);

    const handleBlur = useCallback(() => {
      const trimmed = blogTitle.trim();
      if (trimmed !== blogTitle) setBlogTitle(trimmed);
    }, [blogTitle, setBlogTitle]);

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain').replace(/[\r\n]+/g, ' ');
      const ta = titleRef.current;
      if (!ta) return;
      const start  = ta.selectionStart ?? 0;
      const end    = ta.selectionEnd ?? 0;
      const newVal = ta.value.slice(0, start) + text + ta.value.slice(end);
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = start + text.length;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, []);

    return (
      <div style={{ flexShrink: 0 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <textarea
            ref={titleRef}
            className="blog-editor-title"
            placeholder="New Blog"
            data-empty="true"
            rows={1}
            value={blogTitle}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onBlur={handleBlur}
            onPaste={handlePaste}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{ resize: 'none', overflow: 'hidden', flex: 1 }}
          />
        </div>
        <BlogEditorPageTitleMeta
          publishStatus={statusInfo.publishStatus}
          createdAt={statusInfo.createdAt}
          draftVersionNumber={statusInfo.currentVersionNumber}
          publishedVersionNumber={statusInfo.publishedVersionNumber}
          lastDraftSavedAt={statusInfo.lastDraftSavedAt}
          lastPublishedAt={statusInfo.lastPublishedAt}
          unsavedChangesAt={unsavedChangesAt}
          saveStatus={saveStatus}
        />
      </div>
    );
  },
);

BlogEditorPageTitle.displayName = 'BlogEditorPageTitle';
