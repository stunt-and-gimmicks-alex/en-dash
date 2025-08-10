// frontend/src/stores/selectedStackStore.ts
import { create } from "zustand";

interface SelectedStackState {
  selectedStackName: string | null;
  setSelectedStack: (stackName: string | null) => void;
}

export const useSelectedStackStore = create<SelectedStackState>((set) => ({
  selectedStackName: null,
  setSelectedStack: (stackName) => set({ selectedStackName: stackName }),
}));
