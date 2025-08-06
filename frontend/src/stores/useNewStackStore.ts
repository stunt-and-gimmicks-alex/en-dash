import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface NewStack {
  name: string;
  description: string;
  configs: Record<string, any>;
  services: Record<string, any>; // Replace `any` with a strong type when available
  networks: Record<string, any>;
  volumes: Record<string, any>;
  environment: Record<string, string>;
}

interface NewStackStore {
  newStack: NewStack;
  setNewStack: (updater: (stack: NewStack) => void) => void;
  resetStack: () => void;
}

const defaultStack: NewStack = {
  name: "",
  description: "",
  configs: {},
  services: {},
  networks: {},
  volumes: {},
  environment: {},
};

export const useNewStackStore = create<NewStackStore>()(
  immer((set) => ({
    newStack: defaultStack,

    setNewStack: (updater) =>
      set((state) => {
        updater(state.newStack);
      }),

    resetStack: () => set(() => ({ newStack: { ...defaultStack } })),
  }))
);
