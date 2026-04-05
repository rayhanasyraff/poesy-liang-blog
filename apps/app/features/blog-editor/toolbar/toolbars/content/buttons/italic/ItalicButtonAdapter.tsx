'use client';
import { usePublisher, useCellValues, applyFormat$, currentFormat$, IS_ITALIC } from '@mdxeditor/editor';
import { ItalicButton } from './ItalicButton';

export function ItalicButtonAdapter() {
  const applyFormat = usePublisher(applyFormat$);
  const [format] = useCellValues(currentFormat$);

  return (
    <ItalicButton
      onClick={() => applyFormat('italic')}
      active={(format & IS_ITALIC) !== 0}
    />
  );
}
