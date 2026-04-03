'use client';

import React from 'react';
import { DropdownMenuGroup } from '@radix-ui/react-dropdown-menu';

interface BlogEditorToolbarMenuGroupProps {
  children: React.ReactNode;
}

export function BlogEditorToolbarMenuGroup({ children }: BlogEditorToolbarMenuGroupProps) {
  return <DropdownMenuGroup>{children}</DropdownMenuGroup>;
}
