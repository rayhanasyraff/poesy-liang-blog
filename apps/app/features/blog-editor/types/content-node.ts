export type TextNode = {
  type: 'text';
  text?: string | null;
};

export type ElementNode = {
  type: string;
  children?: NodeType[];
};

export type NodeType = TextNode | ElementNode;