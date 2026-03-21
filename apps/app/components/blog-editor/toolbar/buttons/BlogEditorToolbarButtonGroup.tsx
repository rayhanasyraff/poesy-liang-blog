'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BlogEditorToolbarButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function BlogEditorToolbarButtonGroup({
  children,
  className,
}: BlogEditorToolbarButtonGroupProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {children}
    </div>
  );
}
