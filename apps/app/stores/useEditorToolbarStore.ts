import { create } from 'zustand';

interface EditorToolbarState {
  isContentFocused: boolean;
  keyboardOffset: number;
  editorLeft: number;
  editorRight: number;
}

interface EditorToolbarActions {
  setContentFocused: (focused: boolean) => void;
  setKeyboardOffset: (offset: number) => void;
  setEditorBounds: (left: number, right: number) => void;
}

export const useEditorToolbarStore = create<EditorToolbarState & EditorToolbarActions>((set) => ({
  isContentFocused: false,
  keyboardOffset: 0,
  editorLeft: 0,
  editorRight: 0,
  setContentFocused: (isContentFocused) => set({ isContentFocused }),
  setKeyboardOffset: (keyboardOffset) => set({ keyboardOffset }),
  setEditorBounds: (editorLeft, editorRight) => set({ editorLeft, editorRight }),
}));
