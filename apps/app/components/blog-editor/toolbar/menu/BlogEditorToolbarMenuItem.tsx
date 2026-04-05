'use client';

import React from 'react';
import { DropdownMenuItem } from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

interface BlogEditorToolbarMenuItemProps {
  children: React.ReactNode;
  onSelect?: (e: Event) => void;
  disabled?: boolean;
  className?: string;
}

export function BlogEditorToolbarMenuItem({
  children,
  onSelect,
  disabled,
  className,
}: BlogEditorToolbarMenuItemProps) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer',
        'text-foreground outline-none transition-colors',
        'hover:bg-accent focus:bg-accent',
        'disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
    >
      {children}
    </DropdownMenuItem>
  );
}
