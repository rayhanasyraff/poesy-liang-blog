'use client';

import React from 'react';
import { DropdownMenuLabel } from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

interface BlogEditorToolbarMenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function BlogEditorToolbarMenuLabel({
  children,
  className,
}: BlogEditorToolbarMenuLabelProps) {
  return (
    <DropdownMenuLabel
      className={cn('px-3 py-2 text-xs text-muted-foreground font-medium', className)}
    >
      {children}
    </DropdownMenuLabel>
  );
}
