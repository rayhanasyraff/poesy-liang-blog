/**
 * Ensures that the first node in the editor document is a heading.
 * If not, resets the document to the predefined initial content.
 */
const ensureFirstNodeIsHeading = (editor: any, initialContent: any) => {
  const doc = editor.getDocument?.('json');
  const firstNode = doc?.root?.children?.[0];

  if (firstNode?.type !== 'heading') {
    editor.setDocument('json', initialContent);
  }
};

/**
 * Safely retrieves the Lexical editor root DOM element.
 */
const getRootElement = (editor: any) => {
  const lexical = editor.getLexicalEditor?.();
  return typeof lexical?.getRootElement === 'function'
    ? lexical.getRootElement()
    : null;
};

/**
 * Places the caret at the end of a given element.
 */
const placeCaretAtEnd = (element: HTMLElement) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);

  const selection = globalThis.getSelection();
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
const focusHeading = (rootEl: HTMLElement) => {
  const h1 = rootEl.querySelector('h1');
  if (!h1) return;

  placeCaretAtEnd(h1 as HTMLElement);
};

/**
 * Removes zero-width spaces and trims text.
 */
const cleanText = (value: string | null | undefined) =>
  (value ?? '').replaceAll('\u200B', '').trim();

/**
 * Determines whether a Backspace/Delete action should be blocked
 * to prevent Lexical from removing the H1 node itself.
 *
 * Only blocks when the H1 is already empty and the caret is collapsed inside it.
 * Selecting H1 text and deleting it is intentionally allowed (text clears, node stays).
 */
const shouldBlockDeletion = (
  event: KeyboardEvent,
  rootEl: HTMLElement
) => {
  if (event.key !== 'Backspace' && event.key !== 'Delete') return false;

  const selection = window.getSelection();
  const h1 = rootEl.querySelector('h1');
  if (!selection || !h1) return false;

  const anchorNode = selection.anchorNode || selection.focusNode;
  if (!anchorNode || !h1.contains(anchorNode)) return false;

  // Only block a collapsed caret in an already-empty H1.
  return selection.isCollapsed && cleanText(h1.textContent) === '';
};

/**
 * Attaches a capturing keydown listener to prevent deleting
 * the entire H1 heading node.
 */
const attachHeadingProtection = (rootEl: HTMLElement) => {
  const existing = (rootEl as any)._copilot_h1_block_handler;
  if (typeof existing === 'function') {
    rootEl.removeEventListener('keydown', existing, true);
  }

  const handler = (event: KeyboardEvent) => {
    if (shouldBlockDeletion(event, rootEl)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  };

  rootEl.addEventListener('keydown', handler, true);
  (rootEl as any)._copilot_h1_block_handler = handler;
};

/**
 * Focuses the Lexical editor instance.
 */
const focusEditor = (editor: any) => {
  const lexical = editor.getLexicalEditor?.();
  if (typeof lexical?.focus === 'function') {
    lexical.focus();
  }
};

/**
 * Performs UI-related initialization:
 * - Places caret inside H1
 * - Focuses editor
 * - Protects H1 from deletion
 */
const initializeEditorUI = (editor: any, placeholder?: string) => {
  const rootEl = getRootElement(editor);
  if (!rootEl) return;

  // Ensure the caret starts in the H1 on init per user preference.
  attachHeadingProtection(rootEl);
  try {
    focusHeading(rootEl);
    focusEditor(editor);
  } catch(e) {
    // ignore focus errors
  }

  // Clean up any stale pointerup handler from a previous init (e.g. hot-reload).
  try {
    const existing = (rootEl as any)._copilot_paragraph_pointer;
    if (existing) {
      rootEl.removeEventListener('pointerup', existing, false);
      (rootEl as any)._copilot_paragraph_pointer = null;
    }
  } catch(e) {}
  // Lexical handles all click-to-caret placement natively via its own pointerdown handler.
  // Adding our own pointerup override with caretRangeFromPoint causes it to misplace the
  // cursor (an empty paragraph has no text, so caretRangeFromPoint resolves to the H1).

  try {
    const h1 = rootEl.querySelector('h1');
    if (h1 && typeof placeholder === 'string') {
      try {
        const syncPlaceholder = () => {
          const text = (h1.textContent || '').replaceAll('\u200B', '').trim();
          if (text === '') {
            h1.setAttribute('data-placeholder', placeholder);
          } else {
            h1.removeAttribute('data-placeholder');
          }
        };

        syncPlaceholder();

        // Attach observer here so it's ready before the first onTextChange fires.
        if (!(h1 as any)._copilot_empty_observer) {
          const obs = new MutationObserver(syncPlaceholder);
          obs.observe(h1, { characterData: true, childList: true, subtree: true });
          (h1 as any)._copilot_empty_observer = obs;
        }
      } catch(e) {}
    }
  } catch(e) {}
};

/**
 * Main initialization handler.
 * Ensures document structure and sets up UI behavior after render.
 */
export const initializeEditorWithHeading = (editor: any, initialContent: any, placeholder?: string) => {
  ensureFirstNodeIsHeading(editor, initialContent);

  setTimeout(() => {
    initializeEditorUI(editor, placeholder);
  }, 50);
};
