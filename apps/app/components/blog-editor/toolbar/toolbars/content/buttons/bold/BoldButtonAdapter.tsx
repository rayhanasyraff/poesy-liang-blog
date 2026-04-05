'use client';
import { usePublisher, useCellValues, applyFormat$, currentFormat$, IS_BOLD } from '@mdxeditor/editor';
import { BoldButton } from './BoldButton';

export function BoldButtonAdapter() {
  const applyFormat = usePublisher(applyFormat$);
  const [format] = useCellValues(currentFormat$);

  return (
    <BoldButton
      onClick={() => applyFormat('bold')}
      active={(format & IS_BOLD) !== 0}
    />
  );
}
