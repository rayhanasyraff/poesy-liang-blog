'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  COMMAND_PRIORITY_CRITICAL,
  DROP_COMMAND,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import { $insertList } from '@lexical/list';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KernelLike {
  getLexicalEditor(): LexicalEditor | null;
  on(event: string, handler: (editor: LexicalEditor) => void): void;
  off(event: string, handler: (editor: LexicalEditor) => void): void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_CLASS = 'draggable-block-menu';
const PICKER_CLASS = 'block-type-picker';

// Must match the format used internally by DraggableBlockPlugin_EXPERIMENTAL
const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block';

function isOnMenu(element: HTMLElement): boolean {
  return (
    !!element.closest(`.${MENU_CLASS}`) || !!element.closest(`.${PICKER_CLASS}`)
  );
}

// ─── getBlockElement (mirrors the plugin's internal helper) ──────────────────
// Used by the critical-priority DROP handler to find the drop target block.

function getBlockElement(
  anchorElem: HTMLElement,
  editor: LexicalEditor,
  event: { clientX: number; clientY: number },
  useEdgeAsDefault = false,
): HTMLElement | null {
  const anchorRect = anchorElem.getBoundingClientRect();
  let blockElem: HTMLElement | null = null;

  editor.getEditorState().read(() => {
    const keys = $getRoot().getChildrenKeys();
    if (keys.length === 0) return;

    if (useEdgeAsDefault) {
      const first = editor.getElementByKey(keys[0]);
      const last = editor.getElementByKey(keys[keys.length - 1]);
      if (first && last) {
        if (event.clientY < first.getBoundingClientRect().top) { blockElem = first; return; }
        if (event.clientY > last.getBoundingClientRect().bottom) { blockElem = last; return; }
      }
    }

    for (const key of keys) {
      const elem = editor.getElementByKey(key);
      if (!elem) continue;
      const style = window.getComputedStyle(elem);
      const rect = elem.getBoundingClientRect();
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
      if (
        event.clientY >= rect.top - marginTop &&
        event.clientY <= rect.bottom + marginBottom &&
        event.clientX >= anchorRect.left &&
        event.clientX <= anchorRect.right
      ) {
        blockElem = elem;
        break;
      }
    }
  });

  return blockElem;
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
  mode,
  hoveredElem,
}: {
  lexicalEditor: LexicalEditor;
  anchorElem: HTMLElement;
  triggerRect: DOMRect;
  onClose: () => void;
  mode: 'insert' | 'change' | null;
  hoveredElem: HTMLElement | null;
}) {
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

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
            if (mode === 'change') {
              // Change type of selected block
              opt.apply(lexicalEditor);
              onClose();
              return;
            }

            // Insert mode: create a new node after the hovered element (or at end)
            lexicalEditor.update(() => {
              const target = hoveredElem ? $getNearestNodeFromDOMNode(hoveredElem) : null;
              let newNode: any = null;
              switch (opt.tag) {
                case 'P':
                  newNode = $createParagraphNode();
                  break;
                case 'H1':
                  newNode = $createHeadingNode('h1');
                  break;
                case 'H2':
                  newNode = $createHeadingNode('h2');
                  break;
                case 'H3':
                  newNode = $createHeadingNode('h3');
                  break;
                case '•':
                case '1.':
                  // Insert paragraph then convert to list via $insertList after selecting
                  newNode = $createParagraphNode();
                  break;
                case '❝':
                  newNode = $createQuoteNode();
                  break;
                case '</>':
                  newNode = $createCodeNode();
                  break;
                default:
                  newNode = $createParagraphNode();
              }

              if (target && newNode) {
                target.insertAfter(newNode);
                newNode.selectStart();
                if (opt.tag === '•') $insertList('bullet');
                if (opt.tag === '1.') $insertList('number');
              } else if (newNode) {
                $getRoot().append(newNode);
                newNode.selectStart();
                if (opt.tag === '•') $insertList('bullet');
                if (opt.tag === '1.') $insertList('number');
              }
            });

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
// @lobehub/editor provides its own LexicalComposerContext (holds a Kernel, not
// a raw LexicalEditor). @lexical/react plugins read a *different* context object.
// This bridge reads the Kernel, waits for the real editor to initialise, then
// re-provides it via @lexical/react's LexicalComposerContext.

function LexicalContextBridge({ children }: { children: React.ReactNode }) {
  const lobehubContext = useLobehubContext();
  const kernel = Array.isArray(lobehubContext) ? (lobehubContext[0] as KernelLike) : null;
  const [lexicalEditor, setLexicalEditor] = useState<LexicalEditor | null>(null);

  useEffect(() => {
    if (!kernel || typeof kernel.getLexicalEditor !== 'function') return;
    const activate = (editor: LexicalEditor) => setLexicalEditor(editor);
    const existing = kernel.getLexicalEditor();
    if (existing) { activate(existing); return; }
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

// ─── Inner plugin ─────────────────────────────────────────────────────────────
//
// Uses DraggableBlockPlugin_EXPERIMENTAL for all mouse-tracking, handle
// positioning, DRAGOVER visual feedback (target line), and drag state management.
//
// The only addition: a COMMAND_PRIORITY_CRITICAL DROP_COMMAND handler.
// LobeHub's upload plugin registers DROP_COMMAND at COMMAND_PRIORITY_HIGH and
// unconditionally returns `true`, which blocks the Lexical plugin's own HIGH-
// priority drop handler from ever running. We intercept at CRITICAL (one level
// above) so the node reorder fires before LobeHub's handler can swallow the event.

function DraggablePluginInner() {
  const [lexicalEditor] = useLexicalComposerContext();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const plusRef = useRef<HTMLButtonElement | null>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null);
  const [pickerMode, setPickerMode] = useState<'insert' | 'change' | null>(null);

  const hoveredElemRef = useRef<HTMLElement | null>(null);

  // Set up anchorElem and add left padding to the contenteditable so text
  // doesn't overlap the drag handle (handle is ~24 px wide at 4 px from left).
  useEffect(() => {
    const rootElem = lexicalEditor.getRootElement();
    const parent = rootElem?.parentElement ?? document.body;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    // Ensure editor content doesn't sit under the handle group: add left padding.
    // Store existing padding to restore on cleanup.
    let prevPaddingLeft: string | null = null;
    if (rootElem) {
      prevPaddingLeft = rootElem.style.paddingLeft || '';
      // 32px gives room for the plus + grip; adjust if needed.
      rootElem.style.paddingLeft = '24px';
    }

    setAnchorElem(parent);
    return () => {
      if (rootElem && prevPaddingLeft !== null) rootElem.style.paddingLeft = prevPaddingLeft;
    };
  }, [lexicalEditor]);

  // CRITICAL-priority DROP_COMMAND handler.
  // Runs before LobeHub's HIGH-priority upload handler so our block reorder
  // is not silently swallowed when no files are in the transfer.
  //
  // We identify block drags via dataTransfer.types (always readable, even in
  // protected mode) rather than a dragstart-tracked ref, because Chromium
  // restricts getData() during the dragstart event on some versions.
  useEffect(() => {
    if (!anchorElem) return;

    return lexicalEditor.registerCommand<DragEvent>(
      DROP_COMMAND,
      (event) => {
        // Only handle block drags — check types list (readable during drop).
        const isBlockDrag = event.dataTransfer?.types.includes(DRAG_DATA_FORMAT) ?? false;
        if (!isBlockDrag) return false;

        const nodeKey = event.dataTransfer?.getData(DRAG_DATA_FORMAT) ?? '';
        if (!nodeKey) return false;
        if ((event.dataTransfer?.files.length ?? 0) > 0) return false;

        const targetBlock = getBlockElement(anchorElem, lexicalEditor, event, true);
        if (!targetBlock) return false;

        event.preventDefault();

        // Command handlers run inside updateEditorSync — no editor.update() needed.
        const draggedNode = $getNodeByKey(nodeKey);
        const targetNode = $getNearestNodeFromDOMNode(targetBlock);
        if (!draggedNode || !targetNode || targetNode === draggedNode) return true;

        const targetTop = targetBlock.getBoundingClientRect().top;
        if (event.clientY >= targetTop) {
          targetNode.insertAfter(draggedNode);
        } else {
          targetNode.insertBefore(draggedNode);
        }

        const droppedKey = nodeKey;
        requestAnimationFrame(() => {
          lexicalEditor.update(
            () => {
              const node = $getNodeByKey(droppedKey);
              if (node) node.selectEnd();
            },
            {
              discrete: true,
              onUpdate: () => {
                // Focus via the DOM element directly, AFTER the selection has
                // been committed to the DOM by the discrete update above.
                // Calling lexicalEditor.focus() instead would schedule its own
                // internal async Lexical update, which can race with (and
                // overwrite) the selection we just set, causing the caret to
                // disappear. Going through getRootElement().focus() bypasses
                // that internal update cycle entirely.
                lexicalEditor.getRootElement()?.focus({ preventScroll: true });
              },
            },
          );
        });

        // The plugin's own HIGH-priority DROP handler (which we are blocking)
        // normally hides the handle and target line after a successful drop.
        // Replicate that cleanup here so the handle doesn't linger at its old
        // position until the user moves the mouse again.
        const menu = menuRef.current;
        const line = targetLineRef.current;
        if (menu) {
          menu.style.opacity = '0';
          menu.style.transform = 'translate(-10000px, -10000px)';
        }
        if (line) {
          line.style.opacity = '0';
          line.style.transform = 'translate(-10000px, -10000px)';
        }

        return true; // prevent LobeHub's HIGH handler from running
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [anchorElem, lexicalEditor]);

  // Plus click: select hovered block and open the block-type picker.
  const handlePlusClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (!anchorElem) return;

      if (pickerRect) {
        setPickerRect(null);
        setPickerMode(null);
        return;
      }

      const hoveredElem = hoveredElemRef.current;
      if (hoveredElem) {
        lexicalEditor.update(() => {
          const node = $getNearestNodeFromDOMNode(hoveredElem);
          if (node) node.selectStart();
        });
      }

      const btn = plusRef.current ?? menuRef.current;
      if (btn) {
        setPickerMode('insert');
        setPickerRect(btn.getBoundingClientRect());
      }
    },
    [anchorElem, lexicalEditor, pickerRect],
  );

  // Grip click: open picker to change block type
  const handleGripClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!anchorElem) return;

      if (pickerRect) {
        setPickerRect(null);
        setPickerMode(null);
        return;
      }

      const hoveredElem = hoveredElemRef.current;
      if (hoveredElem) {
        lexicalEditor.update(() => {
          const node = $getNearestNodeFromDOMNode(hoveredElem);
          if (node) node.selectStart();
        });
      }

      const btn = menuRef.current;
      if (btn) {
        setPickerMode('change');
        setPickerRect(btn.getBoundingClientRect());
      }
    },
    [anchorElem, lexicalEditor, pickerRect],
  );

  if (!anchorElem) return null;

  // Grouped handle + plus component to avoid DOM conflicts with editor content.
  function HandleGroup() {
    return (
      <div
        ref={menuRef}
        className={MENU_CLASS}
        title="Drag to reorder"
        style={{ display: 'flex', alignItems: 'center', gap: 2 }}
        aria-hidden={false}
      >
        {/* Plus button: opens the block-type picker. */}
        <button
          type="button"
          ref={plusRef}
          className="draggable-block-plus"
          title="Insert / Change block type"
          onMouseDown={handlePlusClick}
          style={{
            width: 18,
            height: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Grip icon: only used for dragging; clicking it does nothing. */}
        <button
          type="button"
          aria-hidden="true"
          className="grip-button"
          title="Drag to reorder"
          onClick={handleGripClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            padding: 2,
            cursor: 'grab',
          }}
        >
          <GripIcon />
        </button>
      </div>
    );
  }

  return (
    <>
      <DraggableBlockPlugin
        anchorElem={anchorElem}
        menuRef={menuRef}
        targetLineRef={targetLineRef}
        menuComponent={<HandleGroup />}
        targetLineComponent={
          <div ref={targetLineRef} className="draggable-block-target-line" />
        }
        isOnMenu={isOnMenu}
        onElementChanged={(elem) => { hoveredElemRef.current = elem; }}
      />

      {pickerRect && (
        <BlockTypePicker
          lexicalEditor={lexicalEditor}
          anchorElem={anchorElem}
          triggerRect={pickerRect}
          onClose={() => { setPickerRect(null); setPickerMode(null); }}
          mode={pickerMode}
          hoveredElem={hoveredElemRef.current}
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
