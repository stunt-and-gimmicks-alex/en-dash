// frontend/src/hooks/v06-systemStatsHooks.ts
// Simple hooks that use the Zustand system stats store
// Follows the exact same pattern as v06-stackHooks

import { useEffect } from "react";
import {
  useSystemStatsStore,
  systemStatsSelectors,
  initializeSystemStatsStore,
} from "@/stores/v06-systemStatsStore";

// =============================================================================
// GLOBAL INITIALIZATION - Survive React StrictMode double effects
// =============================================================================

let globalInitPromise: Promise<void> | null = null;
let initCallCount = 0;
let isGloballyInitialized = false;

const ensureInitialized = () => {
  initCallCount++;
  console.log(`🔍 ensureSystemStatsInitialized called #${initCallCount}`);

  // FIXED: Only initialize once globally, ignore React StrictMode double effects
  if (isGloballyInitialized) {
    console.log("✅ System stats already globally initialized, skipping");
    return Promise.resolve();
  }

  if (!globalInitPromise) {
    console.log("🚀 Creating new system stats global init promise");
    globalInitPromise = initializeSystemStatsStore().then(() => {
      isGloballyInitialized = true;
      console.log("🎉 System stats global initialization complete");
    });
  } else {
    console.log("♻️ Reusing existing system stats global init promise");
  }
  return globalInitPromise;
};

// =============================================================================
// MAIN HOOKS - Drop-in replacements
// =============================================================================

/**
 * Main system stats hook - replaces old useSystemStats
 * Auto-initializes the store on first use ONLY
 */
export const useSystemStats = () => {
  // FIXED: Only initialize once globally, not per hook
  useEffect(() => {
    ensureInitialized();
  }, []);

  // Use individual primitive selectors to avoid object recreation
  const currentStats = systemStatsSelectors.useCurrentStats();
  const connected = systemStatsSelectors.useConnected();
  const connecting = systemStatsSelectors.useConnecting();
  const error = systemStatsSelectors.useError();
  const lastUpdated = systemStatsSelectors.useLastUpdated();
  const connectionCount = systemStatsSelectors.useConnectionCount();

  const store = useSystemStatsStore();

  return {
    // Data (using currentStats to match old API)
    currentStats,
    connected,
    connecting,
    error,
    lastUpdated,
    connectionCount,

    // Actions
    connect: store.connect,
    disconnect: store.disconnect,
    ping: store.ping,
    setUpdateInterval: store.setUpdateInterval,

    // Utility
    refresh: store.connect, // Legacy compatibility
    clearHistory: store.clearHistory,

    // Debug
    serviceStats: () => ({
      connected,
      lastUpdated,
      connectionCount,
    }),
  };
};

/**
 * Container resource stats hook
 */
export const useContainerResourceStats = () => {
  // FIXED: No initialization here, rely on global init

  const containerResources = systemStatsSelectors.useContainerResources();
  const connected = systemStatsSelectors.useConnected();
  const error = systemStatsSelectors.useError();

  const { getContainersByStack, getStackResourceSummary } =
    useSystemStatsStore();

  return {
    containerResources,
    connected,
    error,
    hasContainerData: !!containerResources,
    totalContainers: containerResources?.total_containers || 0,

    // Helper methods
    getContainersByStack,
    getStackResourceSummary,
  };
};

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Get system stats for a specific stack's containers
 */
export const useStackResourceStats = (stackName: string) => {
  // FIXED: No initialization here

  //  const store = useSystemStatsStore();
  const connected = systemStatsSelectors.useConnected();
  const error = systemStatsSelectors.useError();

  // Use selector for this specific stack
  const stackContainers = systemStatsSelectors.useContainersByStack(stackName);
  const stackSummary = systemStatsSelectors.useStackResourceSummary(stackName);

  return {
    containers: stackContainers,
    summary: stackSummary,
    loading: !connected && !error,
    error,
    connected,
    hasContainers: stackContainers.length > 0,
  };
};

/**
 * Get system stats history
 */
export const useSystemStatsHistory = () => {
  // FIXED: No initialization here

  const statsHistory = systemStatsSelectors.useStatsHistory();
  const currentStats = systemStatsSelectors.useCurrentStats();
  const connected = systemStatsSelectors.useConnected();

  return {
    history: statsHistory,
    currentStats,
    connected,
    historySize: statsHistory.length,
  };
};

/**
 * Get queue information for debugging smooth updates
 */
export const useSystemStatsQueue = () => {
  // FIXED: No initialization here

  const queueInfo = systemStatsSelectors.useQueueInfo();
  const connected = systemStatsSelectors.useConnected();

  return {
    queueInfo,
    connected,
    isSmooth: queueInfo.isPlaying,
  };
};

/**
 * Get system stats by category
 */
export const useSystemStatsByCategory = () => {
  // FIXED: No initialization here

  const currentStats = systemStatsSelectors.useCurrentStats();

  return {
    cpu: {
      percent: currentStats?.cpu_percent || 0,
    },
    memory: {
      percent: currentStats?.memory_percent || 0,
      used_gb: currentStats?.memory_used_gb || 0,
      total_gb: currentStats?.memory_total_gb || 0,
    },
    disk: {
      percent: currentStats?.disk_percent || 0,
      used_gb: currentStats?.disk_used_gb || 0,
      total_gb: currentStats?.disk_total_gb || 0,
    },
    network: {
      bytes_sent: currentStats?.network_bytes_sent || 0,
      bytes_recv: currentStats?.network_bytes_recv || 0,
    },
    containers: currentStats?.container_resources || null,
  };
};

// =============================================================================
// LEGACY COMPATIBILITY HOOKS
// =============================================================================

/**
 * Legacy compatibility - same interface as old useLiveSystemStats
 */
export const useLiveSystemStats = () => {
  const {
    currentStats,
    connected,
    connecting,
    error,
    lastUpdated,
    refresh,
    disconnect,
    ping,
  } = useSystemStats();

  return {
    currentStats,
    connected,
    connecting,
    error,
    lastUpdated,
    refresh,
    disconnect,
    ping,
  };
};

/**
 * Legacy compatibility - for old useSystemStatsWebSocket pattern
 */
export const useSystemStatsWebSocket = (updateInterval: number = 5) => {
  const stats = useSystemStats();

  // Set update interval if different from default
  useEffect(() => {
    if (updateInterval !== 5) {
      stats.setUpdateInterval(updateInterval);
    }
  }, [updateInterval, stats.setUpdateInterval]);

  return {
    stats: stats.currentStats,
    isConnected: stats.connected,
    error: stats.error,
    lastUpdate: stats.lastUpdated ? new Date(stats.lastUpdated) : null,
    connect: stats.connect,
    disconnect: stats.disconnect,
    setUpdateInterval: stats.setUpdateInterval,
  };
};

/**
 * Debug hook for monitoring the smooth update system
 */
export const useSystemStatsDebug = () => {
  const stats = useSystemStats();
  const queueInfo = useSystemStatsQueue();
  const history = useSystemStatsHistory();

  return {
    stats: stats.currentStats,
    connected: stats.connected,
    error: stats.error,
    queueInfo: queueInfo.queueInfo,
    historySize: history.historySize,
    serviceStats: stats.serviceStats(),
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

// Export the store directly for advanced usage
export {
  useSystemStatsStore,
  systemStatsSelectors,
  initializeSystemStatsStore,
};

export default useSystemStats;
