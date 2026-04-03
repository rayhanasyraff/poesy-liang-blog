import { ElementNode, NodeType, TextNode } from '../types/content-node';

const isTextNode = (node: NodeType): node is TextNode =>
  node?.type === 'text';

const hasChildren = (
  node: ElementNode
): node is ElementNode & { children: NodeType[] } =>
  Array.isArray(node.children) && node.children.length > 0;

const cleanText = (value?: string | null): string =>
  (value ?? '').replaceAll('\u200B', '');

const extractFromTextNode = (node: TextNode): string =>
  cleanText(node.text);

const extractFromElementNode = (node: ElementNode): string =>
  hasChildren(node)
    ? node.children.map(extractTextFromNodeTree).join('')
    : '';

/**
 * Recursively traverses a node tree and extracts all textual content.
 *
 * Behavior:
 * - Returns empty string for null/undefined input
 * - Cleans zero-width spaces from text nodes
 * - Recursively concatenates child node text
 */
export const extractTextFromNodeTree = (
  node?: NodeType | null
): string => {
  if (!node) return '';

  if (isTextNode(node)) {
    return extractFromTextNode(node);
  }

  return extractFromElementNode(node);
};
