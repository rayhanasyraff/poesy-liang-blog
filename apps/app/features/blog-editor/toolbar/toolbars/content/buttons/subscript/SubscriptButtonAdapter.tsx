'use client';
import { usePublisher, useCellValues, applyFormat$, currentFormat$, IS_SUBSCRIPT } from '@mdxeditor/editor';
import { SubscriptButton } from './SubscriptButton';

export function SubscriptButtonAdapter() {
  const applyFormat = usePublisher(applyFormat$);
  const [format] = useCellValues(currentFormat$);

  return (
    <SubscriptButton
      onClick={() => applyFormat('subscript')}
      active={(format & IS_SUBSCRIPT) !== 0}
    />
  );
}
