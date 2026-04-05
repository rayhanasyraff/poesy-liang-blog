'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BlogEditorToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function BlogEditorToolbarButton({
  icon,
  title,
  active,
  className,
  ref,
  onMouseDown,
  ...rest
}: BlogEditorToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      {...rest}
      ref={ref}
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        onMouseDown?.(e);
      }}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded-full flex-shrink-0',
        'text-muted-foreground transition-colors',
        'hover:text-foreground hover:bg-accent',
        'disabled:opacity-40 disabled:pointer-events-none',
        active && 'bg-accent text-foreground',
        className,
      )}
    >
      {icon}
    </button>
  );
}
