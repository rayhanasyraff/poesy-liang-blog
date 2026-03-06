'use client';

import React, { type RefObject, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Type,
  ImagePlus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Undo2,
  Redo2,
  AtSign,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Copy,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code2,
  Quote,
  Lightbulb,
  Calculator,
  Camera,
  Video,
  FolderOpen,
  Images,
  ChevronRight,
  // Text formatting
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Highlighter,
  Link2,
  Palette,
  PaintBucket,
  Eraser,
  // View mode
  PenLine,
  Eye,
  Braces,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LexicalEditor } from 'lexical';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  UNDO_COMMAND,
  REDO_COMMAND,
  FORMAT_TEXT_COMMAND,
} from 'lexical';
import {
  $setBlocksType,
  $patchStyleText,
  $getSelectionStyleValueForProperty,
} from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import { TOGGLE_LINK_COMMAND, $isLinkNode } from '@lexical/link';
import {
  INSERT_HEADING_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_MATH_COMMAND,
} from '@lobehub/editor';

// ── Types ────────────────────────────────────────────────────────────────────

export type ContentViewMode = 'edit' | 'markdown' | 'json';

// ── Markdown logo icon ────────────────────────────────────────────────────────

function MarkdownIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 2 / 3)}
      viewBox="0 0 18 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="0.7" y="0.7" width="16.6" height="10.6" rx="2" />
      {/* M shape */}
      <polyline points="2.5,8.5 2.5,3.5 5,6 7.5,3.5 7.5,8.5" />
      {/* Down arrow */}
      <line x1="12.5" y1="3.5" x2="12.5" y2="7" />
      <polyline points="10.5,5.5 12.5,8 14.5,5.5" />
    </svg>
  );
}

export interface BottomToolbarProps {
  lexicalEditorRef: RefObject<LexicalEditor>;
  contentViewMode: ContentViewMode;
  onViewModeChange: (mode: ContentViewMode) => void;
}

interface BlockTypeOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  onInsert: (editor: LexicalEditor) => void;
  onChange: (editor: LexicalEditor) => void;
}

type ToolbarView = 'main' | 'text' | 'mode';

// ── Block type definitions ────────────────────────────────────────────────────

const BLOCK_TYPES: BlockTypeOption[] = [
  {
    key: 'paragraph',
    label: 'Normal text',
    icon: <FileText size={14} />,
    onInsert: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) sel.insertParagraph();
      }),
    onChange: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createParagraphNode());
      }),
  },
  {
    key: 'h1',
    label: 'Heading 1',
    icon: <Heading1 size={14} />,
    onInsert: (e) => e.dispatchCommand(INSERT_HEADING_COMMAND, { tag: 'h1' }),
    onChange: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode('h1'));
      }),
  },
  {
    key: 'h2',
    label: 'Heading 2',
    icon: <Heading2 size={14} />,
    onInsert: (e) => e.dispatchCommand(INSERT_HEADING_COMMAND, { tag: 'h2' }),
    onChange: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode('h2'));
      }),
  },
  {
    key: 'h3',
    label: 'Heading 3',
    icon: <Heading3 size={14} />,
    onInsert: (e) => e.dispatchCommand(INSERT_HEADING_COMMAND, { tag: 'h3' }),
    onChange: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode('h3'));
      }),
  },
  {
    key: 'bullet',
    label: 'Bulleted list',
    icon: <List size={14} />,
    onInsert: (e) => e.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    onChange: (e) => e.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
  },
  {
    key: 'numbered',
    label: 'Numbered list',
    icon: <ListOrdered size={14} />,
    onInsert: (e) => e.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
    onChange: (e) => e.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
  },
  {
    key: 'todo',
    label: 'To-do list',
    icon: <CheckSquare size={14} />,
    onInsert: (e) => e.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
    onChange: (e) => e.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
  },
  {
    key: 'toggle',
    label: 'Toggle list',
    icon: <ChevronRight size={14} />,
    onInsert: (e) => e.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    onChange: (e) => e.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
  },
  {
    key: 'code',
    label: 'Code block',
    icon: <Code2 size={14} />,
    onInsert: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createCodeNode());
      }),
    onChange: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createCodeNode());
      }),
  },
  {
    key: 'quote',
    label: 'Quote block',
    icon: <Quote size={14} />,
    onInsert: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createQuoteNode());
      }),
    onChange: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createQuoteNode());
      }),
  },
  {
    key: 'callout',
    label: 'Callout block',
    icon: <Lightbulb size={14} />,
    onInsert: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createQuoteNode());
      }),
    onChange: (e) =>
      e.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createQuoteNode());
      }),
  },
  {
    key: 'math',
    label: 'Block equation',
    icon: <Calculator size={14} />,
    onInsert: (e) => e.dispatchCommand(INSERT_MATH_COMMAND, { code: '' }),
    onChange: (e) => e.dispatchCommand(INSERT_MATH_COMMAND, { code: '' }),
  },
];

const FONT_SIZES = [
  '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px',
  '20px', '22px', '24px', '28px', '32px', '36px', '48px', '60px', '72px',
];

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: 'Default',          value: '' },
  { label: 'Arial',            value: 'Arial, sans-serif' },
  { label: 'Georgia',          value: 'Georgia, serif' },
  { label: 'Verdana',          value: 'Verdana, sans-serif' },
  { label: 'Courier New',      value: '"Courier New", monospace' },
  { label: 'Times New Roman',  value: '"Times New Roman", serif' },
  { label: 'Trebuchet MS',     value: '"Trebuchet MS", sans-serif' },
];

// ── Block-level helpers ───────────────────────────────────────────────────────

function moveBlock(editor: LexicalEditor, direction: 'up' | 'down') {
  editor.update(() => {
    const sel = $getSelection();
    if (!$isRangeSelection(sel)) return;
    const root = $getRoot();
    let node: any = sel.anchor.getNode();
    while (node && node.getParent() !== root) node = node.getParent();
    if (!node) return;
    if (direction === 'up') {
      const prev = node.getPreviousSibling();
      if (prev) prev.insertBefore(node);
    } else {
      const next = node.getNextSibling();
      if (next) next.insertAfter(node);
    }
  });
}

function deleteBlock(editor: LexicalEditor) {
  editor.update(() => {
    const sel = $getSelection();
    if (!$isRangeSelection(sel)) return;
    const root = $getRoot();
    let node: any = sel.anchor.getNode();
    while (node && node.getParent() !== root) node = node.getParent();
    if (node && root.getChildrenSize() > 1) node.remove();
  });
}

function duplicateBlock(editor: LexicalEditor) {
  // eslint-disable-next-line no-console
  console.info('[BottomToolbar] duplicateBlock: stub — not yet implemented');
}

function insertMention(editor: LexicalEditor) {
  editor.update(() => {
    const sel = $getSelection();
    if ($isRangeSelection(sel)) sel.insertText('@');
  });
}

// ── Text formatting helpers ───────────────────────────────────────────────────

function applyFontSize(editor: LexicalEditor, size: string) {
  editor.update(() => {
    const sel = $getSelection();
    if ($isRangeSelection(sel)) $patchStyleText(sel, { 'font-size': size });
  });
}

function applyFontFamily(editor: LexicalEditor, family: string) {
  editor.update(() => {
    const sel = $getSelection();
    if ($isRangeSelection(sel)) $patchStyleText(sel, { 'font-family': family });
  });
}

function applyTextColor(editor: LexicalEditor, color: string) {
  editor.update(() => {
    const sel = $getSelection();
    if ($isRangeSelection(sel)) $patchStyleText(sel, { color });
  });
}

function applyBgColor(editor: LexicalEditor, color: string) {
  editor.update(() => {
    const sel = $getSelection();
    if ($isRangeSelection(sel)) $patchStyleText(sel, { 'background-color': color });
  });
}

function applyCase(editor: LexicalEditor, transform: 'lower' | 'upper' | 'capitalize') {
  editor.update(() => {
    const sel = $getSelection();
    if (!$isRangeSelection(sel)) return;
    const text = sel.getTextContent();
    const newText =
      transform === 'lower' ? text.toLowerCase()
      : transform === 'upper' ? text.toUpperCase()
      : text.replace(/\b\w/g, (c) => c.toUpperCase());
    sel.insertText(newText);
  });
}

function clearFormatting(editor: LexicalEditor) {
  editor.update(() => {
    const sel = $getSelection();
    if (!$isRangeSelection(sel)) return;
    $patchStyleText(sel, {
      'font-family': '',
      'font-size': '',
      color: '',
      'background-color': '',
    });
    sel.getNodes().forEach((node: any) => {
      if (typeof node.setFormat === 'function') node.setFormat(0);
      if (typeof node.setStyle === 'function') node.setStyle('');
    });
  });
}

function toggleLink(editor: LexicalEditor, isActive: boolean) {
  if (isActive) {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
  } else {
    const url = window.prompt('Enter URL:');
    if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolbarButton({
  icon,
  title,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={
        active
          ? 'h-8 w-8 flex items-center justify-center rounded-full bg-accent text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none flex-shrink-0'
          : 'h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none flex-shrink-0'
      }
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border/60 mx-0.5 flex-shrink-0" />;
}

/** Compact text button for items that don't have an icon (font size, case transforms). */
function ToolbarTextButton({
  label,
  title,
  onClick,
  active,
  mono,
  wide,
}: {
  label: string;
  title: string;
  onClick?: () => void;
  active?: boolean;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        'h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0',
        wide ? 'px-2 min-w-[2.75rem]' : 'w-8',
        mono ? 'font-mono' : '',
        'text-xs',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

/**
 * Native `<input type="color">` hidden behind a visible icon button via `<label>`.
 */
function ColorButton({
  title,
  value,
  onChange,
  icon,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <label
      title={title}
      className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer flex-shrink-0"
    >
      {icon}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </label>
  );
}

function BlockTypeMenuContent({
  label,
  onSelect,
}: {
  label: string;
  onSelect: (type: BlockTypeOption) => void;
}) {
  return (
    <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-44">
      <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {BLOCK_TYPES.map((type) => (
        <DropdownMenuItem
          key={type.key}
          onSelect={() => onSelect(type)}
          className="gap-2 text-sm"
        >
          <span className="text-muted-foreground w-4 flex items-center justify-center">
            {type.icon}
          </span>
          {type.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BottomToolbar({ lexicalEditorRef, contentViewMode, onViewModeChange }: BottomToolbarProps) {
  const ed = () => lexicalEditorRef.current;

  // ── Toolbar view ──────────────────────────────────────────────────────────

  const [toolbarView, setToolbarView] = useState<ToolbarView>('main');

  // ── Horizontal scroll on mouse-wheel hover ───────────────────────────────
  // Browsers send vertical deltaY even when the user wheels over a horizontal-
  // only container. We intercept with a non-passive listener and map it to
  // scrollLeft so hovering + wheel works naturally on desktop.

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const thumbRef = React.useRef<HTMLDivElement>(null);
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // ── Custom indicator: show on scroll, fade out after 1.5 s idle ──────────
    const showIndicator = () => {
      const thumb = thumbRef.current;
      if (!thumb) return;
      const trackW = el.clientWidth;
      const contentW = el.scrollWidth;
      if (contentW <= trackW) return;
      const thumbW = Math.max((trackW / contentW) * trackW, 24);
      const maxOffset = trackW - thumbW;
      const offset = (el.scrollLeft / (contentW - trackW)) * maxOffset;
      thumb.style.width = `${thumbW}px`;
      thumb.style.transform = `translateX(${offset}px)`;
      thumb.style.opacity = '1';
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (thumbRef.current) thumbRef.current.style.opacity = '0';
      }, 1500);
    };

    el.addEventListener('scroll', showIndicator, { passive: true });

    // ── Mouse wheel → horizontal scroll ──────────────────────────────────────
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
      showIndicator();
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    // ── Click-and-drag → horizontal scroll ───────────────────────────────────
    let dragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      dragging = true;
      hasMoved = false;
      startX = e.clientX;
      scrollLeft = el.scrollLeft;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) {
        hasMoved = true;
        el.scrollLeft = scrollLeft - dx;
        el.style.cursor = 'grabbing';
        showIndicator();
      }
    };

    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = 'grab';
      if (hasMoved) {
        el.addEventListener(
          'click',
          (ev) => { ev.stopPropagation(); ev.preventDefault(); },
          { capture: true, once: true },
        );
      }
      hasMoved = false;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('scroll', showIndicator);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // ── Text formatting state (updated via registerUpdateListener) ────────────

  const [isTextBlock, setIsTextBlock] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false, italic: false, underline: false, strikethrough: false,
    subscript: false, superscript: false, highlight: false,
  });
  const [currentFontSize, setCurrentFontSize] = useState('');
  const [currentFontFamily, setCurrentFontFamily] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isLink, setIsLink] = useState(false);

  // Reset to main toolbar when leaving a text block
  useEffect(() => {
    if (!isTextBlock) setToolbarView('main');
  }, [isTextBlock]);

  useEffect(() => {
    let unregister: (() => void) | null = null;

    const register = (): boolean => {
      const editor = lexicalEditorRef.current;
      if (!editor) return false;

      unregister = editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const sel = $getSelection();
          if (!$isRangeSelection(sel)) {
            setIsTextBlock(false);
            return;
          }

          const root = $getRoot();
          let top: any = sel.anchor.getNode();
          while (top && top.getParent() !== root) top = top.getParent();

          const isCode = top?.getType?.() === 'code';
          setIsTextBlock(!isCode);
          if (isCode) return;

          setActiveFormats({
            bold:          sel.hasFormat('bold'),
            italic:        sel.hasFormat('italic'),
            underline:     sel.hasFormat('underline'),
            strikethrough: sel.hasFormat('strikethrough'),
            subscript:     sel.hasFormat('subscript'),
            superscript:   sel.hasFormat('superscript'),
            highlight:     sel.hasFormat('highlight'),
          });

          setCurrentFontSize($getSelectionStyleValueForProperty(sel, 'font-size', ''));
          setCurrentFontFamily($getSelectionStyleValueForProperty(sel, 'font-family', ''));
          const color = $getSelectionStyleValueForProperty(sel, 'color', '');
          const bg    = $getSelectionStyleValueForProperty(sel, 'background-color', '');
          if (color) setTextColor(color);
          if (bg)    setBgColor(bg);

          const nodes = sel.getNodes();
          setIsLink(
            nodes.some((n: any) => $isLinkNode(n) || (n.getParent && $isLinkNode(n.getParent())))
          );
        });
      });
      return true;
    };

    if (!register()) {
      const interval = setInterval(() => {
        if (register()) clearInterval(interval);
      }, 100);
      return () => { clearInterval(interval); unregister?.(); };
    }
    return () => unregister?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── View content ──────────────────────────────────────────────────────────

  const mainView = (
    <motion.div
      key="main"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="flex items-center gap-0.5 px-2 py-[5px] w-max"
    >
      {/* ── Add Block ───────────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarButton icon={<Plus size={18} />} title="Add block" />
        </DropdownMenuTrigger>
        <BlockTypeMenuContent
          label="Insert block"
          onSelect={(type) => { const e = ed(); if (e) type.onInsert(e); }}
        />
      </DropdownMenu>

      {/* ── Change Block Type ────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarButton icon={<Type size={18} />} title="Change block type" />
        </DropdownMenuTrigger>
        <BlockTypeMenuContent
          label="Convert block"
          onSelect={(type) => { const e = ed(); if (e) type.onChange(e); }}
        />
      </DropdownMenu>

      {/* ── View Mode ───────────────────────────────────── */}
      <ToolbarButton
        icon={<Eye size={18} />}
        title="View mode"
        active={contentViewMode !== 'edit'}
        onClick={() => setToolbarView('mode')}
      />

      {/* ── Add Media ───────────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarButton icon={<ImagePlus size={18} />} title="Add media" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Media</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-sm" onSelect={() => {}}>
            <Images size={14} className="text-muted-foreground" /> Choose from photo library
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-sm" onSelect={() => {}}>
            <Camera size={14} className="text-muted-foreground" /> Take photo
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-sm" onSelect={() => {}}>
            <Video size={14} className="text-muted-foreground" /> Take video
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-sm" onSelect={() => {}}>
            <FolderOpen size={14} className="text-muted-foreground" /> Choose file from storage
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarDivider />

      {/* ── Move Block ──────────────────────────────────── */}
      <ToolbarButton
        icon={<ChevronUp size={18} />}
        title="Move block up"
        onClick={() => { const e = ed(); if (e) moveBlock(e, 'up'); }}
      />
      <ToolbarButton
        icon={<ChevronDown size={18} />}
        title="Move block down"
        onClick={() => { const e = ed(); if (e) moveBlock(e, 'down'); }}
      />

      <ToolbarDivider />

      {/* ── Undo / Redo ─────────────────────────────────── */}
      <ToolbarButton
        icon={<Undo2 size={18} />}
        title="Undo"
        onClick={() => ed()?.dispatchCommand(UNDO_COMMAND, undefined)}
      />
      <ToolbarButton
        icon={<Redo2 size={18} />}
        title="Redo"
        onClick={() => ed()?.dispatchCommand(REDO_COMMAND, undefined)}
      />

      {/* ── Text Formatting entry point ──────────────────── */}
      {isTextBlock && (
        <>
          <ToolbarDivider />
          <ToolbarButton
            icon={<Bold size={18} />}
            title="Text formatting"
            onClick={() => setToolbarView('text')}
          />
        </>
      )}

      <ToolbarDivider />

      {/* ── Mention ─────────────────────────────────────── */}
      <ToolbarButton
        icon={<AtSign size={18} />}
        title="Insert mention"
        onClick={() => { const e = ed(); if (e) insertMention(e); }}
      />

      {/* ── Comment ─────────────────────────────────────── */}
      <ToolbarButton
        icon={<MessageSquare size={18} />}
        title="Add comment"
        onClick={() => { /* Stub */ }}
      />

      <ToolbarDivider />

      {/* ── More Options ────────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarButton icon={<MoreHorizontal size={18} />} title="More options" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-44">
          <DropdownMenuItem
            className="gap-2 text-sm"
            onSelect={() => { const e = ed(); if (e) duplicateBlock(e); }}
          >
            <Copy size={14} className="text-muted-foreground" />
            Duplicate block
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-sm text-destructive focus:text-destructive"
            onSelect={() => { const e = ed(); if (e) deleteBlock(e); }}
          >
            <Trash2 size={14} />
            Delete block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );

  const textView = (
    <motion.div
      key="text"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="flex items-center gap-0.5 px-2 py-[5px] w-max"
    >
      {/* ── Back button ─────────────────────────────────── */}
      <ToolbarButton
        icon={<ChevronLeft size={18} />}
        title="Back to main toolbar"
        onClick={() => setToolbarView('main')}
      />

      <ToolbarDivider />

      {/* Font Family */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarTextButton
            wide
            title="Font family"
            label={FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label ?? 'Font'}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Font family</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {FONT_FAMILIES.map((f) => (
            <DropdownMenuItem
              key={f.label}
              onSelect={() => { const e = ed(); if (e) applyFontFamily(e, f.value); }}
              className="text-sm"
              style={{ fontFamily: f.value || 'inherit' }}
            >
              {f.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font Size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarTextButton
            wide
            title="Font size"
            label={currentFontSize || 'Size'}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-28">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Font size</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {FONT_SIZES.map((s) => (
            <DropdownMenuItem
              key={s}
              onSelect={() => { const e = ed(); if (e) applyFontSize(e, s); }}
              className="text-sm justify-between"
            >
              {s}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarDivider />

      {/* Bold / Italic / Underline / Strikethrough */}
      <ToolbarButton
        icon={<Bold size={18} />} title="Bold" active={activeFormats.bold}
        onClick={() => ed()?.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
      />
      <ToolbarButton
        icon={<Italic size={18} />} title="Italic" active={activeFormats.italic}
        onClick={() => ed()?.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
      />
      <ToolbarButton
        icon={<Underline size={18} />} title="Underline" active={activeFormats.underline}
        onClick={() => ed()?.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
      />
      <ToolbarButton
        icon={<Strikethrough size={18} />} title="Strikethrough" active={activeFormats.strikethrough}
        onClick={() => ed()?.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
      />

      <ToolbarDivider />

      {/* Subscript / Superscript / Highlight */}
      <ToolbarButton
        icon={<Subscript size={18} />} title="Subscript" active={activeFormats.subscript}
        onClick={() => ed()?.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')}
      />
      <ToolbarButton
        icon={<Superscript size={18} />} title="Superscript" active={activeFormats.superscript}
        onClick={() => ed()?.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')}
      />
      <ToolbarButton
        icon={<Highlighter size={18} />} title="Highlight" active={activeFormats.highlight}
        onClick={() => ed()?.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight')}
      />

      <ToolbarDivider />

      {/* Link */}
      <ToolbarButton
        icon={<Link2 size={18} />} title={isLink ? 'Remove link' : 'Add link'} active={isLink}
        onClick={() => { const e = ed(); if (e) toggleLink(e, isLink); }}
      />

      <ToolbarDivider />

      {/* Text Color */}
      <ColorButton
        title="Text color" value={textColor}
        onChange={(c) => { setTextColor(c); const e = ed(); if (e) applyTextColor(e, c); }}
        icon={<Palette size={18} />}
      />

      {/* Background Color */}
      <ColorButton
        title="Text background color" value={bgColor}
        onChange={(c) => { setBgColor(c); const e = ed(); if (e) applyBgColor(e, c); }}
        icon={<PaintBucket size={18} />}
      />

      <ToolbarDivider />

      {/* Case transforms */}
      <ToolbarTextButton mono title="Lowercase"  label="aa" onClick={() => { const e = ed(); if (e) applyCase(e, 'lower'); }} />
      <ToolbarTextButton mono title="Uppercase"  label="AA" onClick={() => { const e = ed(); if (e) applyCase(e, 'upper'); }} />
      <ToolbarTextButton mono title="Capitalize" label="Aa" onClick={() => { const e = ed(); if (e) applyCase(e, 'capitalize'); }} />

      <ToolbarDivider />

      {/* Clear Formatting */}
      <ToolbarButton
        icon={<Eraser size={18} />} title="Clear formatting"
        onClick={() => { const e = ed(); if (e) clearFormatting(e); }}
      />
    </motion.div>
  );

  const modeView = (
    <motion.div
      key="mode"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="flex items-center gap-0.5 px-2 py-[5px] w-max"
    >
      {/* ── Back button ─────────────────────────────────── */}
      <ToolbarButton
        icon={<ChevronLeft size={18} />}
        title="Back to main toolbar"
        onClick={() => setToolbarView('main')}
      />

      <ToolbarDivider />

      {/* ── Edit (normal) ───────────────────────────────── */}
      <ToolbarButton
        icon={<PenLine size={18} />}
        title="Edit"
        active={contentViewMode === 'edit'}
        onClick={() => onViewModeChange('edit')}
      />

      {/* ── Markdown ────────────────────────────────────── */}
      <ToolbarButton
        icon={<MarkdownIcon size={18} />}
        title="Markdown"
        active={contentViewMode === 'markdown'}
        onClick={() => onViewModeChange('markdown')}
      />

      {/* ── JSON ────────────────────────────────────────── */}
      <ToolbarButton
        icon={<Braces size={18} />}
        title="JSON view"
        active={contentViewMode === 'json'}
        onClick={() => onViewModeChange('json')}
      />
    </motion.div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}
      className="flex justify-center px-4 pb-4 pt-2"
    >
      <style>{`.toolbar-scroll::-webkit-scrollbar { display: none; }`}</style>
      {/* Pill container — fits tools exactly, caps at iPhone width */}
      <div
        className="rounded-full border border-border/50 bg-background/95 backdrop-blur-md shadow-xl shadow-black/12 overflow-hidden relative"
        style={{ width: 'max-content', maxWidth: 'min(390px, calc(100vw - 2rem))' }}
      >
        {/* Scroll container — native scrollbar hidden; custom indicator used instead */}
        <div
          ref={scrollRef}
          className="toolbar-scroll overflow-x-auto"
          style={{ scrollbarWidth: 'none', cursor: 'grab', touchAction: 'pan-x' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {toolbarView === 'main' ? mainView : toolbarView === 'text' ? textView : modeView}
          </AnimatePresence>
        </div>

        {/* Custom 2 px indicator — hidden until scroll/drag, fades out after idle */}
        <div style={{ position: 'absolute', bottom: 2, left: 8, right: 8, height: 2, pointerEvents: 'none' }}>
          <div
            ref={thumbRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              background: 'rgba(128,128,128,0.45)',
              borderRadius: 999,
              opacity: 0,
              transition: 'opacity 0.3s ease',
              willChange: 'transform, opacity',
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
