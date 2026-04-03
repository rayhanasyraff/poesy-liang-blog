'use client';

import React from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

// ── Root ──────────────────────────────────────────────────────────────────────

interface BlogEditorToolbarPopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BlogEditorToolbarPopover({
  children,
  open,
  onOpenChange,
}: BlogEditorToolbarPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {children}
    </Popover>
  );
}

// ── Trigger ───────────────────────────────────────────────────────────────────

interface BlogEditorToolbarPopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function BlogEditorToolbarPopoverTrigger({
  children,
  asChild = true,
}: BlogEditorToolbarPopoverTriggerProps) {
  return <PopoverTrigger asChild={asChild}>{children}</PopoverTrigger>;
}

// ── Content ───────────────────────────────────────────────────────────────────

interface BlogEditorToolbarPopoverContentProps {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
}

export function BlogEditorToolbarPopoverContent({
  children,
  side = 'top',
  align = 'center',
  sideOffset = 8,
  className,
}: BlogEditorToolbarPopoverContentProps) {
  return (
    <PopoverContent
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 rounded-xl border border-border bg-background shadow-lg p-3 outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
    >
      {children}
    </PopoverContent>
  );
}
