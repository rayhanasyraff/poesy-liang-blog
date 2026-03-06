/**
 * Safely retrieves the Lexical editor root DOM element.
 */
export const getRootElement = (editor: any) => {
  const lexical = editor.getLexicalEditor?.();
  return typeof lexical?.getRootElement === 'function'
    ? lexical.getRootElement()
    : null;
};

/**
 * Places the caret at the end of a given element.
 */
export const placeCaretAtEnd = (element: HTMLElement) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);

  const selection = window.getSelection();
  if (!selection) return;

  selection.removeAllRanges();
  selection.addRange(range);

  if (typeof element.focus === 'function') {
    element.focus();
  }
};

/**
 * Moves the caret inside the first H1 element in the editor.
 */
export const focusHeading = (rootEl: HTMLElement) => {
  const h1 = rootEl.querySelector('h1');
  if (h1) placeCaretAtEnd(h1 as HTMLElement);
};

/**
 * Focuses the Lexical editor instance.
 */
export const focusEditor = (editor: any) => {
  const lexical = editor.getLexicalEditor?.();
  if (typeof lexical?.focus === 'function') lexical.focus();
};

/**
 * Performs UI-related initialization:
 * - Places caret inside H1
 * - Focuses editor
 * - Attaches heading protection
 */
export const initializeEditorUI = (editor: any, attachProtection: (rootEl: HTMLElement) => void) => {
  const rootEl = getRootElement(editor);
  if (!rootEl) return;

  focusHeading(rootEl);
  focusEditor(editor);
  attachProtection(rootEl);
};
