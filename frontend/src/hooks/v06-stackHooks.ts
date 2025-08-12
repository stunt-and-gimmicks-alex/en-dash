// frontend/src/hooks/v06-stackHooks.ts
// Simple hooks that use the Zustand stack store
// Drop-in replacements for v06-useStacks and v06-useStackActions

import { useEffect } from "react";
import {
  useStackStore,
  stackSelectors,
  initializeStackStore,
} from "@/stores/v06-stackStore";

// =============================================================================
// MAIN HOOKS - Drop-in replacements
// =============================================================================

/**
 * Main stacks hook - replaces v06-useStacks
 * Auto-initializes the store on first use
 */
export const useStacks = () => {
  // Auto-initialize store only once
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await initializeStackStore();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once

  const stacks = stackSelectors.useStacks();
  const connection = stackSelectors.useConnection();
  const stats = stackSelectors.useStackStats();

  const store = useStackStore();

  return {
    // Data
    stacks,
    connected: connection.connected,
    connecting: connection.connecting,
    error: connection.error,
    totalStacks: stats.totalStacks,
    lastUpdated: stats.lastUpdated,
    connectionCount: stats.connectionCount,

    // Actions
    connect: store.connect,
    disconnect: store.disconnect,
    setUpdateInterval: store.setUpdateInterval,
    ping: store.ping,

    // Debug
    serviceStats: () => ({
      connected: connection.connected,
      totalStacks: stats.totalStacks,
      lastUpdated: stats.lastUpdated,
    }),
  };
};

/**
 * Stack actions hook - replaces v06-useStackActions
 */
export const useStackActions = () => {
  // Auto-initialize store only once
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await initializeStackStore();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once

  return stackSelectors.useStackActions();
};

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Get a specific stack by name
 */
export const useStack = (stackName: string) => {
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await initializeStackStore();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const stack = stackSelectors.useStack(stackName);
  const connection = stackSelectors.useConnection();

  return {
    stack,
    loading: !connection.connected && !connection.error,
    error: connection.error,
    connected: connection.connected,
    connecting: connection.connecting,
  };
};

/**
 * Get containers from a specific stack
 */
export const useStackContainers = (stackName: string) => {
  const { stack } = useStack(stackName);

  return {
    containers: stack?.containers?.containers || [],
    loading: !stack,
    totalContainers: stack?.containers?.total || 0,
    runningContainers: stack?.stats?.containers?.running || 0,
  };
};

/**
 * Get aggregated configs from a specific stack
 */
export const useStackAggregatedConfigs = (stackName: string) => {
  const { stack } = useStack(stackName);

  return {
    aggregatedConfigs: stack?.aggregated_configs || null,
    loading: !stack,
    error: stack ? null : "Stack not found",
  };
};

/**
 * Get stacks by status category
 */
export const useStacksByStatus = () => {
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await initializeStackStore();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    running: stackSelectors.useRunningStacks(),
    stopped: stackSelectors.useStoppedStacks(),
    partial: stackSelectors.usePartialStacks(),
  };
};

/**
 * Get stack statistics and counts
 */
export const useStackStats = () => {
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await initializeStackStore();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return stackSelectors.useStackStats();
};

/**
 * Convenience hook for a specific stack's actions
 */
export const useStackAction = (stackName: string) => {
  const actions = useStackActions();
  const store = useStackStore();

  return {
    ...actions,
    // Pre-bound methods for this specific stack
    start: () => actions.startStack(stackName),
    stop: () => actions.stopStack(stackName),
    restart: () => actions.restartStack(stackName),

    // Stack-specific history
    history: store.getStackActionHistory(stackName),

    // Stack-specific state
    isThisStackActive:
      actions.lastAction?.stackName === stackName && actions.isPerformingAction,
  };
};

// Export the store directly for advanced usage
export { useStackStore, stackSelectors, initializeStackStore };

export default useStacks;
