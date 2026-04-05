'use client';

import React from 'react';
import { DropdownMenu } from '@radix-ui/react-dropdown-menu';

interface BlogEditorToolbarMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BlogEditorToolbarMenu({
  children,
  open,
  onOpenChange,
}: BlogEditorToolbarMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      {children}
    </DropdownMenu>
  );
}
