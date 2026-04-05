import { create } from 'zustand';

interface PageState {
  scrollY: number;
}

interface PageActions {
  setScrollY: (y: number) => void;
}

export const usePageStore = create<PageState & PageActions>((set) => ({
  scrollY: 0,
  setScrollY: (scrollY) => set({ scrollY }),
}));
