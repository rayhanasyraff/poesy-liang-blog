'use client';
import { usePublisher, insertTable$ } from '@mdxeditor/editor';
import { TableButton } from './TableButton';

export function TableButtonAdapter() {
  const insertTable = usePublisher(insertTable$);

  return <TableButton onClick={() => insertTable({ rows: 3, columns: 3 })} />;
}
