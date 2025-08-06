// frontend/src/contexts/RefreshContext.tsx
// Global refresh context for coordinating data updates across the app

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";

interface RefreshContextType {
  // Global refresh trigger
  refreshAll: () => void;

  // Specific refresh functions
  refreshStacks: () => void;
  refreshDockerStats: () => void;
  refreshSystemStats: () => void;

  // Refresh state for UI feedback
  isRefreshing: boolean;

  // Register refresh functions from hooks/components
  registerStacksRefresh: (fn: () => void | Promise<void>) => void;
  registerDockerStatsRefresh: (fn: () => void | Promise<void>) => void;
  registerSystemStatsRefresh: (fn: () => void | Promise<void>) => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

interface RefreshProviderProps {
  children: ReactNode;
}

export const RefreshProvider: React.FC<RefreshProviderProps> = ({
  children,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Store refresh functions from different hooks/components
  const [refreshFunctions, setRefreshFunctions] = useState<{
    stacks?: () => void | Promise<void>;
    dockerStats?: () => void | Promise<void>;
    systemStats?: () => void | Promise<void>;
  }>({});

  // Register refresh functions
  const registerStacksRefresh = useCallback(
    (fn: () => void | Promise<void>) => {
      setRefreshFunctions((prev) => ({ ...prev, stacks: fn }));
    },
    []
  );

  const registerDockerStatsRefresh = useCallback(
    (fn: () => void | Promise<void>) => {
      setRefreshFunctions((prev) => ({ ...prev, dockerStats: fn }));
    },
    []
  );

  const registerSystemStatsRefresh = useCallback(
    (fn: () => void | Promise<void>) => {
      setRefreshFunctions((prev) => ({ ...prev, systemStats: fn }));
    },
    []
  );

  // Individual refresh functions
  const refreshStacks = useCallback(async () => {
    if (refreshFunctions.stacks) {
      setIsRefreshing(true);
      try {
        await refreshFunctions.stacks();
      } catch (error) {
        console.error("Error refreshing stacks:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [refreshFunctions.stacks]);

  const refreshDockerStats = useCallback(async () => {
    if (refreshFunctions.dockerStats) {
      setIsRefreshing(true);
      try {
        await refreshFunctions.dockerStats();
      } catch (error) {
        console.error("Error refreshing Docker stats:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [refreshFunctions.dockerStats]);

  const refreshSystemStats = useCallback(async () => {
    if (refreshFunctions.systemStats) {
      setIsRefreshing(true);
      try {
        await refreshFunctions.systemStats();
      } catch (error) {
        console.error("Error refreshing system stats:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [refreshFunctions.systemStats]);

  // Global refresh - triggers all registered refresh functions
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refreshPromises = Object.values(refreshFunctions)
        .filter(Boolean)
        .map((fn) => fn!());

      await Promise.allSettled(refreshPromises);
    } catch (error) {
      console.error("Error during global refresh:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFunctions]);

  const value = {
    refreshAll,
    refreshStacks,
    refreshDockerStats,
    refreshSystemStats,
    isRefreshing,
    registerStacksRefresh,
    registerDockerStatsRefresh,
    registerSystemStatsRefresh,
  };

  return (
    <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
  );
};

// Custom hook to use refresh context
export const useRefresh = (): RefreshContextType => {
  const context = useContext(RefreshContext);

  if (context === undefined) {
    throw new Error("useRefresh must be used within a RefreshProvider");
  }

  return context;
};

// Export the context for advanced use cases
export { RefreshContext };
