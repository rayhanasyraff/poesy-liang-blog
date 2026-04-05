'use client';

import React from 'react';
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  tablePlugin,
  linkPlugin,
  imagePlugin,
  jsxPlugin,
  diffSourcePlugin,
  toolbarPlugin,
} from '@mdxeditor/editor';
import { CustomEditImageToolbar } from '../toolbar/toolbars/content/buttons/image/CustomEditImageToolbar';
import { VideoJsxEditor } from '../toolbar/toolbars/content/buttons/video/VideoJsxEditor';
import { SocialPostJsxEditor } from '../toolbar/toolbars/content/buttons/social-post/SocialPostJsxEditor';
import { BlogEditorContentToolbar } from '../toolbar/toolbars/content/BlogEditorContentToolbar';

// ── Upload handler ─────────────────────────────────────────────────────────────

async function uploadFile(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// ── JSX component descriptors ─────────────────────────────────────────────────

export const VideoDescriptor = {
  name: 'Video',
  kind: 'flow' as const,
  props: [{ name: 'url', type: 'string' as const }],
  hasChildren: false,
  Editor: VideoJsxEditor,
};

export const SocialPostDescriptor = {
  name: 'SocialPost',
  kind: 'flow' as const,
  props: [{ name: 'url', type: 'string' as const }],
  hasChildren: false,
  Editor: SocialPostJsxEditor,
};

const ToolbarContentsWrapper = () => <BlogEditorContentToolbar />;

// ── buildMdxPlugins ────────────────────────────────────────────────────────────
// Returns a stable plugin array. Call inside useMemo with [] deps.

export function buildMdxPlugins() {
  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
    codeMirrorPlugin({
      codeBlockLanguages: {
        text: 'Plain Text',
        js: 'JavaScript',
        javascript: 'JavaScript',
        ts: 'TypeScript',
        typescript: 'TypeScript',
        tsx: 'TSX',
        jsx: 'JSX',
        css: 'CSS',
        html: 'HTML',
        json: 'JSON',
        bash: 'Bash',
        sh: 'Shell',
        python: 'Python',
        py: 'Python',
        rust: 'Rust',
        go: 'Go',
        sql: 'SQL',
        yaml: 'YAML',
        yml: 'YAML',
        markdown: 'Markdown',
        md: 'Markdown',
      },
    }),
    tablePlugin(),
    linkPlugin(),
    imagePlugin({
      imageUploadHandler: async (image: File) => {
        const result = await uploadFile(image);
        return result.url;
      },
      EditImageToolbar: CustomEditImageToolbar,
    }),
    jsxPlugin({ jsxComponentDescriptors: [VideoDescriptor, SocialPostDescriptor] }),
    diffSourcePlugin({ viewMode: 'rich-text' }),
    toolbarPlugin({ toolbarContents: ToolbarContentsWrapper }),
  ];
}
