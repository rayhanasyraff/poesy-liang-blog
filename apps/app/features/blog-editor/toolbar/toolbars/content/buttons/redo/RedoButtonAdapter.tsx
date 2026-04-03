'use client';
import { useEffect, useState } from 'react';
import { useCellValues, activeEditor$ } from '@mdxeditor/editor';
import { REDO_COMMAND, CAN_REDO_COMMAND, COMMAND_PRIORITY_CRITICAL } from 'lexical';
import { RedoButton } from './RedoButton';

export function RedoButtonAdapter() {
  const [activeEditor] = useCellValues(activeEditor$);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!activeEditor) return;
    return activeEditor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => { setCanRedo(payload); return false; },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [activeEditor]);

  return (
    <RedoButton
      onClick={() => activeEditor?.dispatchCommand(REDO_COMMAND, undefined)}
      disabled={!canRedo}
    />
  );
}
