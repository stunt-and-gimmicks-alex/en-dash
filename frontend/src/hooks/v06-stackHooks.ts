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
// GLOBAL INITIALIZATION - Survive React StrictMode double effects
// =============================================================================

let globalInitPromise: Promise<void> | null = null;
let initCallCount = 0;
let isGloballyInitialized = false;

const ensureInitialized = () => {
  initCallCount++;
  console.log(`🔍 ensureInitialized called #${initCallCount}`);

  // FIXED: Only initialize once globally, ignore React StrictMode double effects
  if (isGloballyInitialized) {
    console.log("✅ Already globally initialized, skipping");
    return Promise.resolve();
  }

  if (!globalInitPromise) {
    console.log("🚀 Creating new global init promise");
    globalInitPromise = initializeStackStore().then(() => {
      isGloballyInitialized = true;
      console.log("🎉 Global initialization complete");
    });
  } else {
    console.log("♻️ Reusing existing global init promise");
  }
  return globalInitPromise;
};

// =============================================================================
// MAIN HOOKS - Drop-in replacements
// =============================================================================

/**
 * Main stacks hook - replaces v06-useStacks
 * Auto-initializes the store on first use ONLY
 */
export const useStacks = () => {
  // FIXED: Only initialize once globally, not per hook
  useEffect(() => {
    ensureInitialized();
  }, []);

  // Use individual primitive selectors to avoid object recreation
  const stacks = stackSelectors.useStacks();
  const connected = stackSelectors.useConnected();
  const connecting = stackSelectors.useConnecting();
  const error = stackSelectors.useError();
  const totalStacks = stackSelectors.useTotalStacks();
  const lastUpdated = stackSelectors.useLastUpdated();
  const connectionCount = stackSelectors.useConnectionCount();

  const store = useStackStore();

  return {
    // Data
    stacks,
    connected,
    connecting,
    error,
    totalStacks,
    lastUpdated,
    connectionCount,

    // Actions
    connect: store.connect,
    disconnect: store.disconnect,
    setUpdateInterval: store.setUpdateInterval,
    ping: store.ping,

    // Debug
    serviceStats: () => ({
      connected,
      totalStacks,
      lastUpdated,
    }),
  };
};

/**
 * Stack actions hook - replaces v06-useStackActions
 */
export const useStackActions = () => {
  // FIXED: No initialization here, rely on global init
  // Use individual primitive selectors for action state
  const isPerformingAction = stackSelectors.useIsPerformingAction();
  const lastAction = stackSelectors.useLastAction();

  // Use individual action method selectors
  const startStack = stackSelectors.useStartStack();
  const stopStack = stackSelectors.useStopStack();
  const restartStack = stackSelectors.useRestartStack();
  const clearActionHistory = stackSelectors.useClearActionHistory();

  return {
    startStack,
    stopStack,
    restartStack,
    clearActionHistory,
    isPerformingAction,
    lastAction,
  };
};

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Get a specific stack by name
 */
export const useStack = (stackName: string) => {
  // FIXED: No initialization here

  const stack = stackSelectors.useStack(stackName);
  const connected = stackSelectors.useConnected();
  const error = stackSelectors.useError();

  return {
    stack,
    loading: !connected && !error,
    error,
    connected,
    connecting: stackSelectors.useConnecting(),
  };
};

/**
 * Hook for getting a specific stack by name (OLD API COMPATIBILITY)
 * Now returns EnhancedUnifiedStack | null with aggregatedConfigs
 */
export const useUnifiedStack = (stackName: string) => {
  const { stacks, connected, error } = useStacks();

  const stack = stacks.find((s) => s.name === stackName) || null;

  return {
    stack, // Now EnhancedUnifiedStack | null
    loading: !connected && !error,
    error,
    connected,
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
  // FIXED: No initialization here

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
  // FIXED: No initialization here

  const totalStacks = stackSelectors.useTotalStacks();
  const lastUpdated = stackSelectors.useLastUpdated();
  const connectionCount = stackSelectors.useConnectionCount();
  const runningStacks = stackSelectors.useRunningStacks();
  const stoppedStacks = stackSelectors.useStoppedStacks();
  const partialStacks = stackSelectors.usePartialStacks();

  return {
    totalStacks,
    runningCount: runningStacks.length,
    stoppedCount: stoppedStacks.length,
    partialCount: partialStacks.length,
    lastUpdated,
    connectionCount,
  };
};

/**
 * Convenience hook for a specific stack's actions
 */
export const useStackAction = (stackName: string) => {
  const actions = useStackActions();
  const store = useStackStore();

  return {
    // Individual action methods
    startStack: actions.startStack,
    stopStack: actions.stopStack,
    restartStack: actions.restartStack,
    clearActionHistory: actions.clearActionHistory,
    isPerformingAction: actions.isPerformingAction,
    lastAction: actions.lastAction,

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
