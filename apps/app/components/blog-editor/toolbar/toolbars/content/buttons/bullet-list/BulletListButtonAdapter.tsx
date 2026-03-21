'use client';
import { usePublisher, useCellValues, applyListType$, currentListType$ } from '@mdxeditor/editor';
import { BulletListButton } from './BulletListButton';

export function BulletListButtonAdapter() {
  const applyListType = usePublisher(applyListType$);
  const [currentListType] = useCellValues(currentListType$);
  const isActive = currentListType === 'bullet';

  return (
    <BulletListButton
      active={isActive}
      onClick={() => applyListType(isActive ? '' : 'bullet')}
    />
  );
}
