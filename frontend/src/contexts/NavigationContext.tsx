// frontend/src/contexts/NavigationContext.tsx
// Navigation context for app-wide navigation state and actions

import React, { createContext, useContext, type ReactNode } from "react";
import type { PageKey } from "@/types/navigation";

interface NavigationContextType {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

interface NavigationProviderProps {
  children: ReactNode;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  currentPage,
  onNavigate,
}) => {
  const value = {
    currentPage,
    onNavigate,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

// Custom hook to use navigation context
export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);

  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }

  return context;
};

// Export the context for advanced use cases
export { NavigationContext };
