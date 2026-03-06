/**
 * Removes zero-width spaces and trims text.
 */
export const cleanText = (value: string | null | undefined) =>
  (value ?? '').replaceAll('\u200B', '').trim();

/**
 * Determines whether Backspace/Delete should be blocked
 * to prevent deletion of the main H1 heading.
 */
export const shouldBlockDeletion = (event: KeyboardEvent, rootEl: HTMLElement) => {
  if (event.key !== 'Backspace' && event.key !== 'Delete') return false;

  const selection = globalThis.getSelection();
  const h1 = rootEl.querySelector('h1');
  if (!selection || !h1) return false;

  const anchorNode = selection.anchorNode || selection.focusNode;
  const isInsideHeading = anchorNode && h1.contains(anchorNode);
  if (!isInsideHeading) return false;

  const headingText = cleanText(h1.textContent);
  const isCollapsed = selection.isCollapsed;

  if (isCollapsed && headingText === '') return true;

  if (!isCollapsed) {
    const selectedText = cleanText(selection.toString());
    if (selectedText === headingText) return true;
  }

  return false;
};

/**
 * Attaches a capturing keydown listener to prevent deletion of the H1 heading.
 */
export const attachHeadingProtection = (rootEl: HTMLElement) => {
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
