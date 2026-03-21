'use client';
import { usePublisher, useCellValues, applyFormat$, currentFormat$, IS_CODE } from '@mdxeditor/editor';
import { CodeButton } from './CodeButton';

export function CodeButtonAdapter() {
  const applyFormat = usePublisher(applyFormat$);
  const [format] = useCellValues(currentFormat$);

  return (
    <CodeButton
      onClick={() => applyFormat('code')}
      active={(format & IS_CODE) !== 0}
    />
  );
}
