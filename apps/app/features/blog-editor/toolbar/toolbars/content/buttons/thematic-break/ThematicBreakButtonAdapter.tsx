'use client';
import { usePublisher, insertThematicBreak$ } from '@mdxeditor/editor';
import { ThematicBreakButton } from './ThematicBreakButton';

export function ThematicBreakButtonAdapter() {
  const insertThematicBreak = usePublisher(insertThematicBreak$);

  return <ThematicBreakButton onClick={() => insertThematicBreak()} />;
}
