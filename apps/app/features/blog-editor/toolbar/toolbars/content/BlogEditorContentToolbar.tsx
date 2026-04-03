'use client';

import React, { useEffect } from 'react';
import { DiffSourceToggleWrapper, editorRootElementRef$, useCellValues } from '@mdxeditor/editor';
import { BlockTypeSelectAdapter } from './buttons/block-type/BlockTypeSelectAdapter';
import { useEditorToolbarStore } from '@/stores/useEditorToolbarStore';
import { BlogEditorToolbar } from '@/components/blog-editor/toolbar/BlogEditorToolbar';
import { useToolbarScroll } from './hooks/useToolbarScroll';
import { BlogEditorToolbarButtonDivider } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButtonDivider';
import { UndoButtonAdapter } from './buttons/undo/UndoButtonAdapter';
import { RedoButtonAdapter } from './buttons/redo/RedoButtonAdapter';
import { BoldButtonAdapter } from './buttons/bold/BoldButtonAdapter';
import { ItalicButtonAdapter } from './buttons/italic/ItalicButtonAdapter';
import { UnderlineButtonAdapter } from './buttons/underline/UnderlineButtonAdapter';
import { StrikeButtonAdapter } from './buttons/strike/StrikeButtonAdapter';
import { SuperscriptButtonAdapter } from './buttons/superscript/SuperscriptButtonAdapter';
import { SubscriptButtonAdapter } from './buttons/subscript/SubscriptButtonAdapter';
import { CodeButtonAdapter } from './buttons/code/CodeButtonAdapter';
import { BulletListButtonAdapter } from './buttons/bullet-list/BulletListButtonAdapter';
import { OrderedListButtonAdapter } from './buttons/ordered-list/OrderedListButtonAdapter';
import { LinkButtonAdapter } from './buttons/link/LinkButtonAdapter';
import { ImageButtonAdapter } from './buttons/image/ImageButtonAdapter';
import { VideoButtonAdapter } from './buttons/video/VideoButtonAdapter';
import { SocialPostButtonAdapter } from './buttons/social-post/SocialPostButtonAdapter';
import { TableButtonAdapter } from './buttons/table/TableButtonAdapter';
import { ThematicBreakButtonAdapter } from './buttons/thematic-break/ThematicBreakButtonAdapter';
import { EditorLinkClickHandler } from './EditorLinkClickHandler';
import './style.css';

/**
 * Content toolbar — rendered inside MDXEditor's toolbarPlugin React tree so
 * all editor signals work correctly. position:fixed (via CSS custom properties)
 * escapes the editor's overflow context.
 *
 * Pass this component as `toolbarContents` to MDXEditor's `toolbarPlugin`:
 *   toolbarPlugin({ toolbarContents: BlogEditorContentToolbar })
 */
export function BlogEditorContentToolbar() {
  const isContentFocused = useEditorToolbarStore((s) => s.isContentFocused);
  const editorLeft = useEditorToolbarStore((s) => s.editorLeft);
  const editorRight = useEditorToolbarStore((s) => s.editorRight);

  // MDXEditor portals dropdowns (BlockTypeSelect, etc.) to editorRootElementRef.current.
  // That ref points to the .blog-mdx-editor div, which is inside overflow:hidden wrappers.
  // Our toolbar trigger is position:fixed below those bounds, so floating-ui can't compute
  // a valid position and falls back to bottom-left. Fix: redirect portals to document.body.
  const [editorRootRef] = useCellValues(editorRootElementRef$);
  useEffect(() => {
    if (!editorRootRef || typeof document === 'undefined') return;
    const original = editorRootRef.current;
    (editorRootRef as React.RefObject<HTMLElement | null>).current = document.body;
    return () => {
      (editorRootRef as React.RefObject<HTMLElement | null>).current = original;
    };
  }, [editorRootRef]);

  const { ref } = useToolbarScroll();

  return (
    <React.Fragment>
    <EditorLinkClickHandler />
    <BlogEditorToolbar
      visible={isContentFocused}
      zIndex={99999}
      offsetLeft={editorLeft}
      offsetRight={editorRight}
      onMouseDown={(e) => e.preventDefault()}
      className="pt-2 pb-3"
    >
      {/* Scrollable pill */}
      <div
        ref={ref}
        className={[
          'editor-content-toolbar',
          'rounded-full border border-border/50 bg-background shadow-xl shadow-black/12',
          'w-[min(390px,calc(100vw-2rem))]',
          'overflow-x-scroll overflow-y-hidden',
          'touch-pan-x shrink-0 cursor-grab',
        ].join(' ')}
      >
        {/* Inner row */}
        <div className="inline-flex items-center px-2 py-[5px]">
          <DiffSourceToggleWrapper>
            <UndoButtonAdapter />
            <RedoButtonAdapter />
            <BlogEditorToolbarButtonDivider />
            <BlockTypeSelectAdapter />
            <BlogEditorToolbarButtonDivider />
            <BoldButtonAdapter />
            <ItalicButtonAdapter />
            <UnderlineButtonAdapter />
            <BlogEditorToolbarButtonDivider />
            <StrikeButtonAdapter />
            <SuperscriptButtonAdapter />
            <SubscriptButtonAdapter />
            <CodeButtonAdapter />
            <BlogEditorToolbarButtonDivider />
            <BulletListButtonAdapter />
            <OrderedListButtonAdapter />
            <BlogEditorToolbarButtonDivider />
            <LinkButtonAdapter />
            <ImageButtonAdapter />
            <VideoButtonAdapter />
            <SocialPostButtonAdapter />
            <TableButtonAdapter />
            <ThematicBreakButtonAdapter />
          </DiffSourceToggleWrapper>
        </div>
      </div>
    </BlogEditorToolbar>
    </React.Fragment>
  );
}
