'use client';
import { useEffect, useState } from 'react';
import { useCellValues, activeEditor$ } from '@mdxeditor/editor';
import { UNDO_COMMAND, CAN_UNDO_COMMAND, COMMAND_PRIORITY_CRITICAL } from 'lexical';
import { UndoButton } from './UndoButton';

export function UndoButtonAdapter() {
  const [activeEditor] = useCellValues(activeEditor$);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    if (!activeEditor) return;
    return activeEditor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => { setCanUndo(payload); return false; },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [activeEditor]);

  return (
    <UndoButton
      onClick={() => activeEditor?.dispatchCommand(UNDO_COMMAND, undefined)}
      disabled={!canUndo}
    />
  );
}
