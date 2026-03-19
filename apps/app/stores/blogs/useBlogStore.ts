import { create } from 'zustand';
import type { ApiBlog, BlogVersionSummary } from '@/types/blog';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface BlogState {
  blog: ApiBlog | null;
  blogVersions: BlogVersionSummary[];
  blogTitle: string;
  saveStatus: SaveStatus;
  unsavedChangesAt: Date | null;
}

interface BlogActions {
  setBlog: (blog: ApiBlog | null) => void;
  setBlogVersions: (versions: BlogVersionSummary[]) => void;
  setBlogTitle: (title: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setUnsavedChangesAt: (date: Date | null) => void;
  resetEditorState: () => void;
}

const initialState: BlogState = {
  blog: null,
  blogVersions: [],
  blogTitle: '',
  saveStatus: 'idle',
  unsavedChangesAt: null,
};

export const useBlogStore = create<BlogState & BlogActions>((set) => ({
  ...initialState,
  setBlog: (blog) => set({ blog }),
  setBlogVersions: (blogVersions) => set({ blogVersions }),
  setBlogTitle: (blogTitle) => set({ blogTitle }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setUnsavedChangesAt: (unsavedChangesAt) => set({ unsavedChangesAt }),
  resetEditorState: () => set(initialState),
}));
