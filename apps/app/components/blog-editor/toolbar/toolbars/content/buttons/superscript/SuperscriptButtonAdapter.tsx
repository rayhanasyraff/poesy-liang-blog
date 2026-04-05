'use client';
import { usePublisher, useCellValues, applyFormat$, currentFormat$, IS_SUPERSCRIPT } from '@mdxeditor/editor';
import { SuperscriptButton } from './SuperscriptButton';

export function SuperscriptButtonAdapter() {
  const applyFormat = usePublisher(applyFormat$);
  const [format] = useCellValues(currentFormat$);

  return (
    <SuperscriptButton
      onClick={() => applyFormat('superscript')}
      active={(format & IS_SUPERSCRIPT) !== 0}
    />
  );
}
