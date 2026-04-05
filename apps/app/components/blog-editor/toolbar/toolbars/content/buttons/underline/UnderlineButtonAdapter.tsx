'use client';
import { usePublisher, useCellValues, applyFormat$, currentFormat$, IS_UNDERLINE } from '@mdxeditor/editor';
import { UnderlineButton } from './UnderlineButton';

export function UnderlineButtonAdapter() {
  const applyFormat = usePublisher(applyFormat$);
  const [format] = useCellValues(currentFormat$);

  return (
    <UnderlineButton
      onClick={() => applyFormat('underline')}
      active={(format & IS_UNDERLINE) !== 0}
    />
  );
}
