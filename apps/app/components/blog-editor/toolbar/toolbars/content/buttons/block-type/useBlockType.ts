'use client';
import { useCellValues, usePublisher, currentBlockType$, activeEditor$, convertSelectionToNode$ } from '@mdxeditor/editor';
import { $createParagraphNode } from 'lexical';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import type { BlockType } from './BlockTypeSelectAdapter';

/**
 * Primitive hook for reading and changing the editor's current block type.
 * Must be called inside a component rendered within MDXEditor's toolbarPlugin tree.
 *
 * Calls `editor.focus()` before converting so that the Lexical selection is
 * restored even if the dropdown stole focus when it opened.
 *
 * @example
 * function MyBlockTypePicker() {
 *   const { current, apply } = useBlockType();
 *   return <button onClick={() => apply('h1')}>Make H1</button>;
 * }
 */
export function useBlockType() {
  const [current, editor] = useCellValues(currentBlockType$, activeEditor$);
  const convertSelectionToNode = usePublisher(convertSelectionToNode$);

  const apply = (type: BlockType) => {
    if (!editor || type === '') return;

    const convert = () => {
      switch (type) {
        case 'paragraph':
          convertSelectionToNode(() => $createParagraphNode());
          break;
        case 'quote':
          convertSelectionToNode(() => $createQuoteNode());
          break;
        default:
          if (type.startsWith('h')) {
            convertSelectionToNode(() => $createHeadingNode(type as `h${1 | 2 | 3 | 4 | 5 | 6}`));
          }
      }
    };

    // Re-focus the editor first so Lexical restores its selection, then convert.
    // Without this, the dropdown's auto-focus clears the Lexical selection and
    // convertSelectionToNode$ becomes a no-op.
    editor.focus(convert);
  };

  return { current, apply };
}
