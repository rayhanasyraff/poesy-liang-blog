'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useEditorToolbarStore } from '@/stores/useEditorToolbarStore';

interface BlogEditorToolbarProps {
  children: React.ReactNode;
  visible: boolean;
  className?: string;
  zIndex?: number;
  offsetLeft?: number;
  offsetRight?: number;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
}

const TRANSITION = { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const };

export function BlogEditorToolbar({
  children,
  visible,
  className,
  zIndex = 50,
  offsetLeft = 0,
  offsetRight = 0,
  onMouseDown,
}: BlogEditorToolbarProps) {
  const keyboardOffset = useEditorToolbarStore((s) => s.keyboardOffset);

  return (
    // Outer: position:fixed — opacity only, NEVER a CSS transform (would break Radix portal positioning)
    <motion.div
      animate={{ opacity: visible ? 1 : 0 }}
      initial={{ opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION}
      style={
        {
          zIndex,
          '--keyboard-offset': `${keyboardOffset}px`,
          '--toolbar-left': `${offsetLeft}px`,
          '--toolbar-right': `${offsetRight}px`,
        } as React.CSSProperties
      }
      className={cn(
        'fixed flex justify-center px-4 pb-4 pt-2',
        'left-[var(--toolbar-left)] right-[var(--toolbar-right)]',
        'bottom-[calc(var(--keyboard-offset,0px)+env(safe-area-inset-bottom))]',
        !visible && 'pointer-events-none',
        className,
      )}
      onMouseDown={onMouseDown}
    >
      {/* Inner: normal block — y-slide is safe here (not a fixed containing block for Radix portals) */}
      <motion.div
        animate={{ y: visible ? 0 : 8 }}
        initial={{ y: 8 }}
        exit={{ y: 8 }}
        transition={TRANSITION}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
