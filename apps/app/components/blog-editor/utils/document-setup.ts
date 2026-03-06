/**
 * Ensures that the first node in the editor is a heading.
 * If not, resets the document to the initial content.
 */
export const ensureFirstNodeIsHeading = (editor: any, initialContent: any) => {
  const doc = editor.getDocument?.('json');
  const firstNode = doc?.root?.children?.[0];

  if (firstNode?.type !== 'heading') {
    editor.setDocument('json', initialContent);
  }
};
