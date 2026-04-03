'use client';

import React from 'react';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';

interface BlogEditorToolbarMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function BlogEditorToolbarMenuTrigger({
  children,
  asChild = true,
}: BlogEditorToolbarMenuTriggerProps) {
  return (
    <DropdownMenuTrigger asChild={asChild}>
      {children}
    </DropdownMenuTrigger>
  );
}
