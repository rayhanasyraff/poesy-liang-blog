'use client';

import React from 'react';
import { DropdownMenuContent, DropdownMenuPortal } from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

interface BlogEditorToolbarMenuContentProps {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  /** Called when the menu closes — use `e.preventDefault()` to keep editor focus/selection intact. */
  onCloseAutoFocus?: (e: Event) => void;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
}

export function BlogEditorToolbarMenuContent({
  children,
  side = 'top',
  align = 'center',
  sideOffset = 8,
  className,
  onCloseAutoFocus,
  onMouseDown,
}: BlogEditorToolbarMenuContentProps) {
  return (
    <DropdownMenuPortal>
    <DropdownMenuContent
      side={side}
      align={align}
      sideOffset={sideOffset}
      onCloseAutoFocus={onCloseAutoFocus}
      onMouseDown={onMouseDown}
      className={cn(
        'z-50 min-w-40 rounded-xl border border-border bg-background shadow-lg',
        'p-1 text-sm outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
    >
      {children}
    </DropdownMenuContent>
    </DropdownMenuPortal>
  );
}
