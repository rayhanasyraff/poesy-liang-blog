'use client';

import React from 'react';
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@radix-ui/react-dropdown-menu';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlogEditorToolbarMenuSubProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function BlogEditorToolbarMenuSub({
  trigger,
  children,
  className,
}: BlogEditorToolbarMenuSubProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer',
          'text-foreground outline-none transition-colors',
          'hover:bg-accent focus:bg-accent',
          '[&[data-state=open]]:bg-accent',
        )}
      >
        {trigger}
        <ChevronRight size={12} className="ml-auto" />
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        className={cn(
          'z-50 min-w-40 rounded-xl border border-border bg-background shadow-lg p-1 outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
      >
        {children}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
