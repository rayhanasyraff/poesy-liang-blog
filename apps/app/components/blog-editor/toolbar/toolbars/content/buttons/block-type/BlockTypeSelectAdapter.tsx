'use client';

import React from 'react';
import { ChevronUp } from 'lucide-react';
import { useBlockType } from './useBlockType';
import { BlogEditorToolbarMenu } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenu';
import { BlogEditorToolbarMenuTrigger } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuTrigger';
import { BlogEditorToolbarMenuContent } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuContent';
import { BlogEditorToolbarMenuItem } from '@/components/blog-editor/toolbar/menu/BlogEditorToolbarMenuItem';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BlockType = 'paragraph' | 'quote' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | '';

export interface BlockTypeOption {
  /** The MDXEditor block type value passed to `applyBlockType$`. */
  type: BlockType;
  /** Full label shown in the dropdown menu, e.g. "Heading 1". */
  label: string;
  /** Short label shown in the toolbar trigger button, e.g. "H1". */
  shortLabel: string;
}

// ── Builder helpers ───────────────────────────────────────────────────────────
// Each accepts optional field overrides — only specify what you want to change.

export const paragraphOption = (overrides?: Partial<BlockTypeOption>): BlockTypeOption => ({
  type: 'paragraph',
  label: 'Paragraph',
  shortLabel: 'P',
  ...overrides,
});

export const headingOption = (
  level: 1 | 2 | 3 | 4 | 5 | 6,
  overrides?: Partial<BlockTypeOption>,
): BlockTypeOption => ({
  type: `h${level}` as BlockType,
  label: `Heading ${level}`,
  shortLabel: `H${level}`,
  ...overrides,
});

export const quoteOption = (overrides?: Partial<BlockTypeOption>): BlockTypeOption => ({
  type: 'quote',
  label: 'Quote',
  shortLabel: '"',
  ...overrides,
});

/** All standard block types pre-built. Import and spread/filter as needed. */
export const DEFAULT_BLOCK_TYPES: BlockTypeOption[] = [
  paragraphOption(),
  headingOption(1),
  headingOption(2),
  headingOption(3),
  headingOption(4),
  headingOption(5),
  headingOption(6),
  quoteOption(),
];

// ── Component ─────────────────────────────────────────────────────────────────

interface BlockTypeSelectAdapterProps {
  /** Block type options to display. Defaults to all standard types. */
  blockTypes?: BlockTypeOption[];
}

/**
 * Custom block-type selector for the content toolbar.
 *
 * Uses `BlogEditorToolbarMenu` (Radix DropdownMenu) which portals to
 * `document.body` — avoiding the MDXEditor portal positioning bug.
 *
 * @example
 * // Zero-config
 * <BlockTypeSelectAdapter />
 *
 * @example
 * // Custom subset with custom labels
 * <BlockTypeSelectAdapter blockTypes={[
 *   paragraphOption({ label: 'Body' }),
 *   headingOption(1, { label: 'Title', shortLabel: 'T' }),
 *   headingOption(2),
 *   quoteOption({ shortLabel: '❝' }),
 * ]} />
 */
export function BlockTypeSelectAdapter({ blockTypes = DEFAULT_BLOCK_TYPES }: BlockTypeSelectAdapterProps) {
  const { current, apply } = useBlockType();
  const currentOption = blockTypes.find((o) => o.type === current);

  return (
    <BlogEditorToolbarMenu>
      <BlogEditorToolbarMenuTrigger>
        <button
          type="button"
          title="Block type"
          className="inline-flex items-center gap-0.5 h-8 px-2 rounded-full text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors whitespace-nowrap"
        >
          {currentOption?.shortLabel ?? 'P'}
          <ChevronUp size={10} />
        </button>
      </BlogEditorToolbarMenuTrigger>
      <BlogEditorToolbarMenuContent
        side="top"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
      >
        {blockTypes.map((opt) => (
          <BlogEditorToolbarMenuItem
            key={opt.type}
            onSelect={() => apply(opt.type)}
            className={current === opt.type ? 'bg-accent text-foreground' : ''}
          >
            <span className="w-6 shrink-0 text-center text-[10px] font-mono text-muted-foreground">
              {opt.shortLabel}
            </span>
            {opt.label}
          </BlogEditorToolbarMenuItem>
        ))}
      </BlogEditorToolbarMenuContent>
    </BlogEditorToolbarMenu>
  );
}
