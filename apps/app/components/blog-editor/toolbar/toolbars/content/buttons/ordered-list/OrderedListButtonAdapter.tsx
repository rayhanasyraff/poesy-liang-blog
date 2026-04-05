'use client';
import { usePublisher, useCellValues, applyListType$, currentListType$ } from '@mdxeditor/editor';
import { OrderedListButton } from './OrderedListButton';

export function OrderedListButtonAdapter() {
  const applyListType = usePublisher(applyListType$);
  const [currentListType] = useCellValues(currentListType$);
  const isActive = currentListType === 'number';

  return (
    <OrderedListButton
      active={isActive}
      onClick={() => applyListType(isActive ? '' : 'number')}
    />
  );
}
