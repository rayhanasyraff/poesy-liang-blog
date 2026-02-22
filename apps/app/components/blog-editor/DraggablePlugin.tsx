'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DraggableBlockPlugin_EXPERIMENTAL as DraggableBlockPlugin } from '@lexical/react/LexicalDraggableBlockPlugin';
import {
  LexicalComposerContext,
  useLexicalComposerContext,
  type LexicalComposerContextWithEditor,
} from '@lexical/react/LexicalComposerContext';
import { useLexicalComposerContext as useLobehubContext } from '@lobehub/editor';
import type { LexicalEditor } from 'lexical';
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import { $insertList } from '@lexical/list';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal interface for the lobehub Kernel class */
interface KernelLike {
  getLexicalEditor(): LexicalEditor | null;
  on(event: string, handler: (editor: LexicalEditor) => void): void;
  off(event: string, handler: (editor: LexicalEditor) => void): void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_CLASS = 'draggable-block-menu';
const PICKER_CLASS = 'block-type-picker';

function isOnMenu(element: HTMLElement): boolean {
  return (
    !!element.closest(`.${MENU_CLASS}`) || !!element.closest(`.${PICKER_CLASS}`)
  );
}

// ─── Block type options ────────────────────────────────────────────────────────

type BlockApply = (editor: LexicalEditor) => void;

const BLOCK_OPTIONS: { label: string; tag: string; apply: BlockApply }[] = [
  {
    label: 'Paragraph',
    tag: 'P',
    apply: (editor) =>
      editor.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createParagraphNode());
      }),
  },
  {
    label: 'Heading 1',
    tag: 'H1',
    apply: (editor) =>
      editor.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode('h1'));
      }),
  },
  {
    label: 'Heading 2',
    tag: 'H2',
    apply: (editor) =>
      editor.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode('h2'));
      }),
  },
  {
    label: 'Heading 3',
    tag: 'H3',
    apply: (editor) =>
      editor.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode('h3'));
      }),
  },
  {
    label: 'Bullet List',
    tag: '•',
    apply: (editor) => editor.update(() => $insertList('bullet')),
  },
  {
    label: 'Numbered List',
    tag: '1.',
    apply: (editor) => editor.update(() => $insertList('number')),
  },
  {
    label: 'Quote',
    tag: '❝',
    apply: (editor) =>
      editor.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createQuoteNode());
      }),
  },
  {
    label: 'Code Block',
    tag: '</>',
    apply: (editor) =>
      editor.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createCodeNode());
      }),
  },
];

// ─── Block type picker popover ─────────────────────────────────────────────────

function BlockTypePicker({
  lexicalEditor,
  anchorElem,
  triggerRect,
  onClose,
}: {
  lexicalEditor: LexicalEditor;
  anchorElem: HTMLElement;
  triggerRect: DOMRect;
  onClose: () => void;
}) {
  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${PICKER_CLASS}`) && !target.closest(`.${MENU_CLASS}`)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Position relative to anchorElem
  const anchorRect = anchorElem.getBoundingClientRect();
  const top = triggerRect.top - anchorRect.top + anchorElem.scrollTop;
  const left = triggerRect.right - anchorRect.left + 6;

  return createPortal(
    <div className={PICKER_CLASS} style={{ top, left }}>
      {BLOCK_OPTIONS.map((opt) => (
        <button
          key={opt.label}
          type="button"
          className="btp-option"
          onMouseDown={(e) => {
            e.preventDefault();
            opt.apply(lexicalEditor);
            onClose();
          }}
        >
          <span className="btp-tag">{opt.tag}</span>
          <span className="btp-label">{opt.label}</span>
        </button>
      ))}
    </div>,
    anchorElem,
  );
}

// ─── Drag-handle icon ─────────────────────────────────────────────────────────

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="11" cy="12" r="1.5" />
    </svg>
  );
}

// ─── Context bridge ───────────────────────────────────────────────────────────
//
// The lobehub editor context holds a `Kernel` wrapper, not a raw LexicalEditor.
// `DraggableBlockPlugin_EXPERIMENTAL` calls useLexicalComposerContext() from
// @lexical/react, which reads a completely different React context object.
//
// This bridge:
//   1. Reads the lobehub context to get the Kernel
//   2. Waits for Kernel.getLexicalEditor() to be non-null (fires after 'initialized')
//   3. Re-provides the raw LexicalEditor via @lexical/react's LexicalComposerContext

function LexicalContextBridge({
  children,
  onReady,
}: {
  children: ReactNode;
  onReady?: (editor: LexicalEditor) => void;
}) {
  const lobehubContext = useLobehubContext();
  const kernel = Array.isArray(lobehubContext) ? (lobehubContext[0] as KernelLike) : null;
  const [lexicalEditor, setLexicalEditor] = useState<LexicalEditor | null>(null);

  useEffect(() => {
    if (!kernel || typeof kernel.getLexicalEditor !== 'function') return;

    const activate = (editor: LexicalEditor) => {
      setLexicalEditor(editor);
      onReady?.(editor);
    };

    // Already initialized (e.g. hot reload)
    const existing = kernel.getLexicalEditor();
    if (existing) {
      activate(existing);
      return;
    }

    // Wait for the editor to mount its root DOM element
    kernel.on('initialized', activate);
    return () => { kernel.off('initialized', activate); };
  }, [kernel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lexicalEditor) return null;

  const contextValue: LexicalComposerContextWithEditor = [
    lexicalEditor,
    { getTheme: () => null },
  ];

  return (
    <LexicalComposerContext.Provider value={contextValue}>
      {children}
    </LexicalComposerContext.Provider>
  );
}

// ─── Inner plugin (inside @lexical/react context provided by bridge) ──────────

function DraggablePluginInner() {
  const [lexicalEditor] = useLexicalComposerContext(); // raw LexicalEditor via bridge

  // Debug: expose lexicalEditor for troubleshooting
  // eslint-disable-next-line no-console
  console.debug('DraggablePluginInner lexicalEditor', lexicalEditor);

  const menuRef = useRef<HTMLButtonElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null);

  // Ref-tracked hovered block (no re-render on hover)
  const hoveredElemRef = useRef<HTMLElement | null>(null);
  const handleElementChanged = useCallback((elem: HTMLElement | null) => {
    hoveredElemRef.current = elem;
  }, []);

  // Resolve anchor element: the contenteditable's parent with position:relative
  useEffect(() => {
    const rootElem = lexicalEditor.getRootElement();
    // eslint-disable-next-line no-console
    console.debug('DraggablePlugin: rootElem =', rootElem);
    const parent = rootElem?.parentElement ?? document.body;
    // eslint-disable-next-line no-console
    console.debug('DraggablePlugin: resolved parent =', parent, 'position=', getComputedStyle(parent).position);
    if (getComputedStyle(parent).position === 'static') {
      // eslint-disable-next-line no-console
      console.debug('DraggablePlugin: setting parent.style.position = "relative" on', parent);
      parent.style.position = 'relative';
    }
    setAnchorElem(parent);
    // eslint-disable-next-line no-console
    console.debug('DraggablePlugin: anchorElem set', parent);
  }, [lexicalEditor]);

  // Click drag handle → select the hovered block + open block-type picker (toggle)
  const handleMenuClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (!anchorElem) return;

      if (pickerRect) {
        setPickerRect(null);
        return;
      }

      // Select the hovered block so block-type transforms apply to it
      const hoveredElem = hoveredElemRef.current;
      if (hoveredElem) {
        lexicalEditor.update(() => {
          const node = $getNearestNodeFromDOMNode(hoveredElem);
          if (node) node.selectStart();
        });
      }

      const btn = menuRef.current;
      if (btn) setPickerRect(btn.getBoundingClientRect());
    },
    [anchorElem, lexicalEditor, pickerRect],
  );

  if (!anchorElem) return null;

  return (
    <>
      <DraggableBlockPlugin
        anchorElem={anchorElem}
        menuRef={menuRef}
        targetLineRef={targetLineRef}
        menuComponent={
          <button
            type="button"
            ref={menuRef}
            className={MENU_CLASS}
            title="Drag to reorder · Click to change block type"
            onClick={handleMenuClick}
          >
            <GripIcon />
          </button>
        }
        targetLineComponent={
          <div ref={targetLineRef} className="draggable-block-target-line" />
        }
        isOnMenu={isOnMenu}
        onElementChanged={handleElementChanged}
      />

      {pickerRect && (
        <BlockTypePicker
          lexicalEditor={lexicalEditor}
          anchorElem={anchorElem}
          triggerRect={pickerRect}
          onClose={() => setPickerRect(null)}
        />
      )}
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function DraggablePlugin() {
  return (
    <LexicalContextBridge>
      <DraggablePluginInner />
    </LexicalContextBridge>
  );
}
