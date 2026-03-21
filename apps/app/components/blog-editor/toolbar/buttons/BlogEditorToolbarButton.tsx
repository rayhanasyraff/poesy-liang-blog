'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BlogEditorToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}

export function BlogEditorToolbarButton({
  icon,
  title,
  onClick,
  disabled,
  active,
  className,
}: BlogEditorToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
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
