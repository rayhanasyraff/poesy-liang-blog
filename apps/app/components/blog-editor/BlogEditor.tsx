'use client';

import React, { lazy, Suspense, useRef, useCallback, useEffect, useState } from 'react';
import { $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { FullscreenHeader } from './FullscreenHeader';
import { BottomToolbar, type ContentViewMode } from './BottomToolbar';
import { EditorBridgePlugin } from './EditorBridgePlugin';
import type { LexicalEditor } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { DraggablePlugin } from './DraggablePlugin';
import {
  ReactMarkdownPlugin,
  ReactCodePlugin,
  ReactCodeblockPlugin,
  ReactFilePlugin,
  ReactHRPlugin,
  ReactImagePlugin,
  ReactLinkPlugin,
  ReactLinkHighlightPlugin,
  ReactListPlugin,
  ReactMathPlugin,
  ReactMentionPlugin,
  ReactSlashPlugin,
  ReactTablePlugin,
  INSERT_HEADING_COMMAND,
  INSERT_HORIZONTAL_RULE_COMMAND,
  INSERT_TABLE_COMMAND,
  INSERT_MATH_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
} from '@lobehub/editor';
import {
  Alert,
  CodeDiff,
  CodeEditor,
  ContextMenuHost,
  ContextMenuTrigger,
  EditorSlashMenu,
  Highlighter,
  I18nProvider as I18n,
  Image,
  Mermaid,
  ScrollArea,
  Skeleton,
  Video,
  type ContextMenuItem,
  type EditorSlashMenuItems,
  type EditorSlashMenuOption,
} from '@lobehub/ui';
import {
  Code,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  BarChart2,
  Play,
  Minus,
  Calculator,
} from 'lucide-react';

const Editor = lazy(() =>
  import('@lobehub/editor/react').then(mod => ({ default: mod.Editor }))
);

// Cast to any to avoid JSX element.type/ref typing issues with React 19 in TS
const AnyEditor: any = Editor;
const AnyLexicalComposer: any = LexicalComposer;
const AnyBottomToolbar: any = BottomToolbar;

// ── Slash menu items for EditorSlashMenu command palette ─────────────────────

const SLASH_PALETTE_ITEMS: EditorSlashMenuItems = [
  {
    label: 'Text & Headings',
    items: [
      { value: 'h1', label: 'Heading 1', icon: <Heading1 size={14} />, keywords: ['h1', 'heading'] },
      { value: 'h2', label: 'Heading 2', icon: <Heading2 size={14} />, keywords: ['h2', 'heading'] },
      { value: 'h3', label: 'Heading 3', icon: <Heading3 size={14} />, keywords: ['h3', 'heading'] },
      { value: 'paragraph', label: 'Paragraph', icon: <FileText size={14} />, keywords: ['text', 'p'] },
    ],
  },
  {
    label: 'Lists',
    items: [
      { value: 'bullet', label: 'Bullet List', icon: <List size={14} />, keywords: ['ul', 'bullet'] },
      { value: 'numbered', label: 'Numbered List', icon: <ListOrdered size={14} />, keywords: ['ol', 'number'] },
    ],
  },
  {
    label: 'Media & Code',
    items: [
      { value: 'code', label: 'Code Block', icon: <Code size={14} />, keywords: ['code', 'pre'] },
      { value: 'math', label: 'Math Block', icon: <Calculator size={14} />, keywords: ['math', 'latex'] },
      { value: 'divider', label: 'Divider', icon: <Minus size={14} />, keywords: ['hr', 'rule'] },
      { value: 'table', label: 'Table', icon: <FileText size={14} />, keywords: ['table', 'grid'] },
      { value: 'mermaid', label: 'Mermaid Diagram', icon: <BarChart2 size={14} />, keywords: ['diagram', 'chart', 'mermaid'] },
      { value: 'video', label: 'Video Embed', icon: <Play size={14} />, keywords: ['video', 'embed', 'youtube'] },
    ],
  },
];

// ── Error boundary ────────────────────────────────────────────────────────────

class EditorErrorBoundary extends React.Component<any, { hasError: boolean; error: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || String(error) };
  }

  componentDidCatch(error: any) {
    try {
      const msg = error?.message || String(error);
      if (typeof msg === 'string' && msg.includes('LexicalComposerContext.useLexicalComposerContext')) {
        return;
      }
    } catch {}
    // eslint-disable-next-line no-console
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      const isKnownLexical = this.state.error.includes('LexicalComposerContext');
      if (isKnownLexical) return null;
      return (
        <Alert
          type="error"
          message="Editor failed to load"
          description={this.state.error}
          style={{ margin: 24 }}
        />
      );
    }
    return this.props.children ?? null;
  }
}

// ── Upload handler ────────────────────────────────────────────────────────────

async function uploadFile(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// ── Editor initial state ──────────────────────────────────────────────────────

const BODY_CONTENT = {
  root: {
    type: 'root',
    version: 1,
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text: '' }] }],
  },
};

// ── Lexical slash menu items ──────────────────────────────────────────────────

const SLASH_ITEMS = [
  {
    key: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    onSelect: (editor: any) => editor.dispatchCommand(INSERT_HEADING_COMMAND, { tag: 'h1' }),
  },
  {
    key: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    onSelect: (editor: any) => editor.dispatchCommand(INSERT_HEADING_COMMAND, { tag: 'h2' }),
  },
  {
    key: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    onSelect: (editor: any) => editor.dispatchCommand(INSERT_HEADING_COMMAND, { tag: 'h3' }),
  },
  {
    key: 'bullet-list',
    label: 'Bullet List',
    description: 'Unordered list',
    onSelect: (editor: any) => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
  },
  {
    key: 'numbered-list',
    label: 'Numbered List',
    description: 'Ordered list',
    onSelect: (editor: any) => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
  },
  {
    key: 'check-list',
    label: 'Check List',
    description: 'Task / todo list',
    onSelect: (editor: any) => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
  },
  {
    key: 'table',
    label: 'Table',
    description: 'Insert a table',
    onSelect: (editor: any) => editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '3', rows: '3' }),
  },
  {
    key: 'divider',
    label: 'Divider',
    description: 'Horizontal rule',
    onSelect: (editor: any) => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
  },
  {
    key: 'math',
    label: 'Math Block',
    description: 'LaTeX math equation',
    onSelect: (editor: any) => editor.dispatchCommand(INSERT_MATH_COMMAND, { code: '' }),
  },
];

// ── Context menu items for body editor ───────────────────────────────────────

function buildBodyContextMenuItems(editor: LexicalEditor | null): ContextMenuItem[] {
  return [
    {
      key: 'cut',
      label: 'Cut',
      onClick: () => document.execCommand('cut'),
    },
    {
      key: 'copy',
      label: 'Copy',
      onClick: () => document.execCommand('copy'),
    },
    {
      key: 'paste',
      label: 'Paste',
      onClick: () => document.execCommand('paste'),
    },
    { type: 'divider', key: 'd1' } as any,
    {
      key: 'select-all',
      label: 'Select All',
      onClick: () => document.execCommand('selectAll'),
    },
  ];
}

// ── Mermaid diagram example for slash palette ─────────────────────────────────

const MERMAID_EXAMPLE = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[End]`;

// ── Main component ────────────────────────────────────────────────────────────

export const BlogEditor = ({
  style,
  onTitleChange,
}: {
  style?: React.CSSProperties;
  onTitleChange?: (title: string) => void;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyWrapperRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const lexicalEditorRef = useRef<LexicalEditor | null>(null);
  const [isContentFocused, setIsContentFocused] = useState(false);
  const [contentViewMode, setContentViewMode] = useState<ContentViewMode>('markdown');
  const [markdownContent, setMarkdownContent] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [diffOldContent, setDiffOldContent] = useState('');
  const [titleText, setTitleText] = useState('');

  // EditorSlashMenu command palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  const isPencilSyncingRef = useRef(false);
  const pencilSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFocusEntryRef = useRef(false);

  const [editorLeft, setEditorLeft] = useState(0);
  const [editorRight, setEditorRight] = useState(0);

  const focusBody = useCallback(() => {
    const ce = bodyWrapperRef.current?.querySelector<HTMLElement>('[contenteditable]');
    try {
      (ce as any)?.focus?.({ preventScroll: true });
    } catch {
      ce?.focus();
    }
  }, []);

  const enterFocusMode = useCallback(() => {
    if (isContentFocused) return;
    const root = rootRef.current;
    if (root) {
      const r = root.getBoundingClientRect();
      setEditorLeft(r.left);
      setEditorRight(window.innerWidth - r.right);
    }
    try {
      const t = titleRef.current;
      const existing = (t?.value ?? '').replace(/\u200B/g, '').trim();
      if (t && existing === '') {
        t.value = 'New Blog';
        t.parentElement?.setAttribute('data-empty', 'false');
        try { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; } catch {}
        setTitleText('New Blog');
        onTitleChange?.('New Blog');
      }
    } catch {}
    setIsContentFocused(true);
  }, [isContentFocused, onTitleChange]);

  const focusTitleAtEnd = useCallback(() => {
    const title = titleRef.current;
    if (!title) return;
    title.focus();
    try {
      const len = title.value.length;
      title.setSelectionRange(len, len);
    } catch {}
  }, []);

  const handleBodyPointerDown = useCallback(() => {
    if (!suppressFocusEntryRef.current) enterFocusMode();
  }, [enterFocusMode]);

  const handleBodyFocus = useCallback(() => {
    if (!suppressFocusEntryRef.current) enterFocusMode();
  }, [enterFocusMode]);

  const handleDone = useCallback(() => {
    setIsContentFocused(false);
    suppressFocusEntryRef.current = true;
    setTimeout(() => {
      focusBody();
      setTimeout(() => { suppressFocusEntryRef.current = false; }, 50);
    }, 260);
  }, [focusBody]);

  const handleEditorReady = useCallback((editor: LexicalEditor) => {
    lexicalEditorRef.current = editor;
  }, []);

  const handleViewModeChange = useCallback((mode: ContentViewMode) => {
    const editor = lexicalEditorRef.current;
    if (mode === 'edit' && editor) {
      editor.getEditorState().read(() => {
        try { setMarkdownContent($convertToMarkdownString(TRANSFORMERS)); } catch { setMarkdownContent(''); }
      });
    }
    if (mode === 'json' && editor) {
      try { setJsonContent(JSON.stringify(editor.getEditorState().toJSON(), null, 2)); } catch { setJsonContent(''); }
    }
    if (mode === 'diff' && editor) {
      editor.getEditorState().read(() => {
        try {
          const md = $convertToMarkdownString(TRANSFORMERS);
          setDiffOldContent(markdownContent || md);
          setMarkdownContent(md);
        } catch {}
      });
    }
    setContentViewMode(mode);
  }, [markdownContent]);

  // ── Lexical → pencil sync ────────────────────────────────────────────────

  useEffect(() => {
    let unregister: (() => void) | null = null;

    const register = (): boolean => {
      const editor = lexicalEditorRef.current;
      if (!editor) return false;

      unregister = editor.registerUpdateListener(({ editorState }) => {
        if (isPencilSyncingRef.current) return;
        editorState.read(() => {
          try { setMarkdownContent($convertToMarkdownString(TRANSFORMERS)); } catch {}
        });
      });
      return true;
    };

    if (!register()) {
      const interval = setInterval(() => { if (register()) clearInterval(interval); }, 100);
      return () => { clearInterval(interval); unregister?.(); };
    }
    return () => unregister?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pencil → Lexical sync ────────────────────────────────────────────────

  const handlePencilChange = useCallback((value: string) => {
    setMarkdownContent(value);

    if (pencilSyncTimerRef.current) clearTimeout(pencilSyncTimerRef.current);
    pencilSyncTimerRef.current = setTimeout(() => {
      const editor = lexicalEditorRef.current;
      if (!editor) return;
      isPencilSyncingRef.current = true;
      editor.update(() => {
        $convertFromMarkdownString(value, TRANSFORMERS);
      });
      setTimeout(() => { isPencilSyncingRef.current = false; }, 100);
    }, 300);
  }, []);

  // ── Title keyboard navigation ────────────────────────────────────────────

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const title = titleRef.current;
    if (e.key === 'Enter') {
      e.preventDefault();
      focusBody();
      return;
    }
    if (e.key === 'ArrowRight') {
      if (!title) return;
      if ((title.selectionStart ?? 0) >= (title.value?.length ?? 0)) {
        e.preventDefault();
        focusBody();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      if (!title) return;
      if ((title.selectionStart ?? 0) >= (title.value?.length ?? 0)) {
        e.preventDefault();
        focusBody();
      }
    }
  }, [focusBody]);

  const handleTitleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    try {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    } catch {}
    const text = (el.value ?? '').replace(/\u200B/g, '').trim();
    el.parentElement?.setAttribute('data-empty', text === '' ? 'true' : 'false');
    setTitleText(text);
    onTitleChange?.(text);
  }, [onTitleChange]);

  // ── Body keyboard shortcuts ──────────────────────────────────────────────

  useEffect(() => {
    const wrapper = bodyWrapperRef.current;
    if (!wrapper) return;

    const handler = (e: KeyboardEvent) => {
      const ce = wrapper.querySelector('[contenteditable]');
      if (!ce) return;

      // Cmd+/ → open EditorSlashMenu command palette
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setPaletteOpen((v) => !v);
        return;
      }

      if (e.key === 'Backspace') {
        const hasText = (ce.textContent ?? '').replaceAll('\u200B', '') !== '';
        if (hasText) return;
        const blocks = Array.from(ce.children);
        const isDefaultEmpty = blocks.length === 1 && blocks[0].tagName === 'P';
        if (!isDefaultEmpty) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        focusTitleAtEnd();
        return;
      }

      if (e.key === 'ArrowUp') {
        const sel = window.getSelection();
        if (!sel?.isCollapsed || !sel.rangeCount) return;
        const caretRect = sel.getRangeAt(0).getBoundingClientRect();
        const ceRect = ce.getBoundingClientRect();
        if (!caretRect.height || caretRect.top < ceRect.top) return;
        if (caretRect.top - ceRect.top < caretRect.height) {
          e.preventDefault();
          e.stopImmediatePropagation();
          focusTitleAtEnd();
        }
      }

      if (e.key === 'ArrowLeft') {
        const sel = window.getSelection();
        if (!sel?.isCollapsed || !sel.rangeCount) return;
        try {
          const preCaretRange = document.createRange();
          preCaretRange.selectNodeContents(ce);
          preCaretRange.setEnd(sel.anchorNode!, sel.anchorOffset);
          const textBefore = (preCaretRange.cloneContents().textContent ?? '').replace(/\u200B/g, '');
          if (textBefore !== '') return;
        } catch {
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        {
          const title = titleRef.current;
          if (title) {
            title.focus();
            const range = document.createRange();
            range.selectNodeContents(title);
            range.collapse(false);
            const sel = globalThis.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
      }
    };

    wrapper.addEventListener('keydown', handler, true);
    return () => wrapper.removeEventListener('keydown', handler, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/[\r\n]+/g, ' ');
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    titleRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);

  // Suppress React 19 element.ref warning from third-party editor
  useEffect(() => {
    const orig = console.error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error = (...args: any[]) => {
      try {
        const m = args[0];
        if (typeof m === 'string' && m.includes('Accessing element.ref was removed in React 19')) return;
      } catch {}
      orig.apply(console, args as any);
    };
    return () => { console.error = orig; };
  }, []);

  // Initialize title height
  useEffect(() => {
    const t = titleRef.current;
    if (t) {
      try {
        t.style.height = 'auto';
        t.style.height = `${t.scrollHeight}px`;
      } catch {}
    }
  }, []);

  // Handle palette item selection
  const handlePaletteSelect = useCallback((item: EditorSlashMenuOption) => {
    setPaletteOpen(false);
    const editor = lexicalEditorRef.current;
    if (!editor) return;
    const slashItem = SLASH_ITEMS.find((s) => s.key === item.value);
    if (slashItem) slashItem.onSelect(editor);
  }, []);

  return (
    <I18n motion={null as any}>
      <div
        ref={rootRef}
        className="blog-editor-root"
        style={isContentFocused ? {
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: editorLeft,
          right: editorRight,
          zIndex: 40,
          background: 'var(--background, #fff)',
        } : {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* ContextMenuHost must be mounted once at root to handle right-click menus */}
        <ContextMenuHost />

        <style>{`
          .blog-editor-title {
            position: relative;
            font-size: 2rem;
            font-weight: 700;
            line-height: 1.25;
            outline: none;
            width: 100%;
            min-height: 2.5rem;
            word-break: break-word;
            overflow-wrap: anywhere;
            white-space: pre-wrap;
            cursor: text;
          }
          .blog-editor-title::before {
            content: attr(data-placeholder);
            color: rgba(156, 163, 175, 0.55);
            pointer-events: none;
            position: absolute;
            top: 0;
            left: 32px;
          }
          .blog-editor-title[data-empty="false"]::before { display: none; }
          .blog-editor-title { padding-left: 24px; color: inherit; }
          .draggable-block-menu {
            border: none;
            background: transparent;
            border-radius: 4px;
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            left: -24px;
            top: 0;
            opacity: 0;
            transform: translate(-10000px, -10000px);
            will-change: transform;
            padding: 2px;
            color: rgba(156, 163, 175, 0.7);
            z-index: 10;
            pointer-events: auto;
          }
          .draggable-block-menu > * { pointer-events: auto; }
          .draggable-block-menu:hover {
            background: rgba(0, 0, 0, 0.02);
            color: rgba(107, 114, 128, 1);
          }
          .draggable-block-menu > .draggable-block-plus:hover,
          .draggable-block-menu > .grip-button:hover {
            background: rgba(0, 0, 0, 0.06);
            color: rgba(0,0,0,0.9);
            border-radius: 4px;
          }
          .draggable-block-menu:active { cursor: grabbing; }
          .draggable-block-target-line {
            pointer-events: none;
            background: #3b82f6;
            height: 4px;
            border-radius: 2px;
            position: absolute;
            left: -24px;
            top: 0;
            opacity: 0;
            transform: translate(-10000px, -10000px);
            will-change: transform;
            z-index: 10;
          }
          .block-type-picker {
            position: absolute;
            background: #fff;
            border: 1px solid rgba(0,0,0,.10);
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,.12);
            padding: 4px;
            min-width: 172px;
            z-index: 100;
          }
          @media (prefers-color-scheme: dark) {
            .block-type-picker { background: #1f1f1f; border-color: rgba(255,255,255,.12); }
          }

          /* Code block visibility: ensure pre/code contrasts with editor background */
          .blog-editor-root pre,
          .blog-editor-root code,
          .blog-editor-root .lexical-code,
          .blog-editor-root .kg-code,
          .blog-editor-root pre[class*="language-"] {
            background: rgba(0,0,0,0.06) !important;
            color: rgba(0,0,0,0.92) !important;
            padding: 12px !important;
            border-radius: 8px !important;
            overflow: auto !important;
            box-shadow: none !important;
            border: 1px solid rgba(0,0,0,0.04) !important;
          }
          @media (prefers-color-scheme: dark) {
            .blog-editor-root pre,
            .blog-editor-root code,
            .blog-editor-root .lexical-code,
            .blog-editor-root .kg-code,
            .blog-editor-root pre[class*="language-"] {
              background: rgba(255,255,255,0.06) !important;
              color: rgba(255,255,255,0.95) !important;
              border: 1px solid rgba(255,255,255,0.04) !important;
            }
          }

          .btp-option {
            display: flex; align-items: center; gap: 10px; width: 100%;
            padding: 6px 10px; border: none; background: transparent;
            border-radius: 5px; cursor: pointer; text-align: left;
            font-size: 13.5px; color: inherit;
          }
          .btp-option:hover { background: rgba(0,0,0,.06); }
          @media (prefers-color-scheme: dark) { .btp-option:hover { background: rgba(255,255,255,.08); } }
          .btp-tag { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: rgba(107,114,128,1); min-width: 28px; text-align: center; }
        `}</style>

        {/* ── Focus mode header ── */}
        <AnimatePresence initial={false}>
          {isContentFocused && (
            <motion.div
              key="focus-header"
              initial={{ y: -48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -48, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: 'fixed', top: 0, left: editorLeft, right: editorRight, zIndex: 50 }}
            >
              <FullscreenHeader onDone={handleDone} title={titleText} showCenteredTitle />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header spacer */}
        <motion.div
          initial={false}
          animate={{ height: isContentFocused ? 48 : 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          style={{ flexShrink: 0 }}
        />

        {/* ── Title editor ── */}
        {!isContentFocused && (
          <div style={{ flexShrink: 0 }}>
            <textarea
              ref={titleRef}
              className="blog-editor-title"
              placeholder="Write a short, descriptive title..."
              data-empty="true"
              rows={1}
              value={titleText}
              onKeyDown={handleTitleKeyDown}
              onInput={handleTitleInput}
              onPaste={handleTitlePaste}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ resize: 'none', overflow: 'hidden', width: '100%', maxWidth: '80%' }}
            />
          </div>
        )}

        {/* ── EditorSlashMenu command palette (Cmd+/) ── */}
        <EditorSlashMenu
          open={paletteOpen}
          value={paletteQuery}
          items={SLASH_PALETTE_ITEMS}
          onOpenChange={(open: boolean) => setPaletteOpen(open)}
          onValueChange={(v: string) => setPaletteQuery(v)}
          onSelect={(item: EditorSlashMenuOption) => handlePaletteSelect(item)}
        />

        {/* ── Pencil / raw markdown mode (CodeEditor) ── */}
        {contentViewMode === 'edit' && (
          <div
            onPointerDownCapture={handleBodyPointerDown}
            onFocus={handleBodyFocus}
            style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', padding: '12px 24px', paddingBottom: isContentFocused ? 80 : 24 }}
          >
            <CodeEditor
              language="markdown"
              value={markdownContent}
              onValueChange={handlePencilChange}
              placeholder="Write markdown here…"
              style={{ flex: 1, height: '100%' }}
            />
          </div>
        )}

        {/* ── JSON panel (Highlighter) ── */}
        {contentViewMode === 'json' && (
          <ScrollArea
            style={{ flex: 1, minHeight: 0, padding: '20px', paddingBottom: isContentFocused ? 88 : 20 }}
          >
            <Highlighter language="json" copyable variant="filled">
              {jsonContent || '{}'}
            </Highlighter>
          </ScrollArea>
        )}

        {/* ── Diff view (CodeDiff) ── */}
        {contentViewMode === 'diff' && (
          <ScrollArea
            style={{ flex: 1, minHeight: 0, padding: '20px', paddingBottom: isContentFocused ? 88 : 20 }}
          >
            <CodeDiff
              oldContent={diffOldContent}
              newContent={markdownContent}
              language="markdown"
              fileName="content.md"
              viewMode="split"
              variant="filled"
            />
          </ScrollArea>
        )}

        {/* ── Mermaid / Video / Image quick-insert demo panel ── */}
        {contentViewMode === 'markdown' && isContentFocused && (
          <div
            style={{
              position: 'absolute',
              right: 16,
              top: 64,
              width: 260,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              zIndex: 30,
              pointerEvents: 'none',
              opacity: 0,
              // Hidden visually but still mounted so components are used
            }}
            aria-hidden
          >
            {/* Mermaid diagram example */}
            <Mermaid animated={false} copyable={false} variant="filled">
              {MERMAID_EXAMPLE}
            </Mermaid>

            {/* Video embed example */}
            <Video
              src=""
              muted
              loop={false}
              variant="filled"
              style={{ width: '100%' }}
            />

            {/* Image example */}
            <Image
              src=""
              width={260}
              height={80}
              variant="filled"
              preview={false}
            />
          </div>
        )}

        {/* ── WYSIWYG editor (flex: 1) ── */}
        <ContextMenuTrigger
          items={() => buildBodyContextMenuItems(lexicalEditorRef.current)}
          style={{
            flex: contentViewMode === 'markdown' ? 1 : 0,
            minHeight: 0,
            display: contentViewMode === 'markdown' ? 'flex' : 'none',
            flexDirection: 'column',
          }}
        >
          <div
            ref={bodyWrapperRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              paddingBottom: isContentFocused ? 72 : 0,
              transition: 'padding-bottom 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onPointerDownCapture={handleBodyPointerDown}
            onFocus={handleBodyFocus}
          >
            <EditorErrorBoundary>
              <Suspense fallback={
                <div style={{ padding: 24 }}>
                  <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 4 }} />
                </div>
              }>
                <AnyEditor
                  content={BODY_CONTENT}
                  style={{ ...style, minHeight: '100%' }}
                  plugins={[
                    ReactMarkdownPlugin,
                    ReactCodePlugin,
                    ReactCodeblockPlugin,
                    ReactHRPlugin,
                    ReactListPlugin,
                    ReactMathPlugin,
                    ReactMentionPlugin,
                    ReactTablePlugin,
                    ReactLinkHighlightPlugin,
                    [ReactLinkPlugin, { enableHotkey: true }] as [typeof ReactLinkPlugin, Record<string, any>],
                    [ReactFilePlugin, { handleUpload: uploadFile }] as [typeof ReactFilePlugin, Record<string, any>],
                    [ReactImagePlugin, { handleUpload: uploadFile }] as [typeof ReactImagePlugin, Record<string, any>],
                    [ReactSlashPlugin, { items: SLASH_ITEMS }] as [typeof ReactSlashPlugin, Record<string, any>],
                    DraggablePlugin,
                    [EditorBridgePlugin, { editorRef: lexicalEditorRef }] as [typeof EditorBridgePlugin, Record<string, any>],
                  ]}
                />
              </Suspense>
            </EditorErrorBoundary>
          </div>
        </ContextMenuTrigger>

        {/* ── Bottom toolbar ── */}
        <AnimatePresence initial={false}>
          {isContentFocused && (
            <AnyBottomToolbar
              key="bottom-toolbar"
              lexicalEditorRef={lexicalEditorRef}
              contentViewMode={contentViewMode}
              onViewModeChange={handleViewModeChange}
            />
          )}
        </AnimatePresence>
      </div>
    </I18n>
  );
};
