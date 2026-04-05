'use client';
import { usePublisher, useCellValues, applyFormat$, currentFormat$, IS_STRIKETHROUGH } from '@mdxeditor/editor';
import { StrikeButton } from './StrikeButton';

export function StrikeButtonAdapter() {
  const applyFormat = usePublisher(applyFormat$);
  const [format] = useCellValues(currentFormat$);

  return (
    <StrikeButton
      onClick={() => applyFormat('strikethrough')}
      active={(format & IS_STRIKETHROUGH) !== 0}
    />
  );
}
