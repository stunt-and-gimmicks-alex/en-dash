/**
 * React hooks for unified stack data - eliminates frontend transformations
 */

import { useState, useEffect, useCallback } from "react";
import {
  type UnifiedStack,
  type FrontendReadyStack,
  type StacksSummary,
  type StackActionResponse,
  type UseUnifiedStackResult,
  type UseUnifiedStacksResult,
  type UnifiedNetworks,
  type UnifiedVolumes,
} from "@/types/unified";

// API base URL
const API_BASE = "http://localhost:8001/api/docker";

// =============================================================================
// UNIFIED STACK HOOKS
// =============================================================================

export const useUnifiedStacks = (): UseUnifiedStacksResult => {
  const [stacks, setStacks] = useState<UnifiedStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/stacks/unified`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStacks(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch stacks";
      setError(errorMessage);
      console.error("Error fetching unified stacks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStacks();
  }, [fetchStacks]);

  return {
    stacks,
    loading,
    error,
    refresh: fetchStacks,
  };
};

export const useUnifiedStack = (stackName: string): UseUnifiedStackResult => {
  const [stack, setStack] = useState<UnifiedStack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStack = useCallback(async () => {
    if (!stackName) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/stacks/unified/${encodeURIComponent(stackName)}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Stack '${stackName}' not found`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStack(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch stack";
      setError(errorMessage);
      console.error(`Error fetching unified stack ${stackName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [stackName]);

  useEffect(() => {
    fetchStack();
  }, [fetchStack]);

  return {
    stack,
    loading,
    error,
    refresh: fetchStack,
  };
};

// =============================================================================
// FRONTEND-READY HOOK - Eliminates ALL transformations
// =============================================================================

export const useFrontendReadyStack = (stackName: string) => {
  const [stack, setStack] = useState<FrontendReadyStack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStack = useCallback(async () => {
    if (!stackName) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/stacks/unified/${encodeURIComponent(
          stackName
        )}/frontend-ready`
      );
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Stack '${stackName}' not found`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStack(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch stack";
      setError(errorMessage);
      console.error(`Error fetching frontend-ready stack ${stackName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [stackName]);

  useEffect(() => {
    fetchStack();
  }, [fetchStack]);

  return {
    stack,
    loading,
    error,
    refresh: fetchStack,
  };
};

// =============================================================================
// STACK MANAGEMENT HOOKS
// =============================================================================

export const useStackActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performAction = useCallback(
    async (
      stackName: string,
      action: "start" | "stop" | "restart"
    ): Promise<StackActionResponse | null> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE}/stacks/unified/${encodeURIComponent(
            stackName
          )}/${action}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : `Failed to ${action} stack`;
        setError(errorMessage);
        console.error(`Error ${action}ing stack ${stackName}:`, err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const startStack = useCallback(
    (stackName: string) => performAction(stackName, "start"),
    [performAction]
  );

  const stopStack = useCallback(
    (stackName: string) => performAction(stackName, "stop"),
    [performAction]
  );

  const restartStack = useCallback(
    (stackName: string) => performAction(stackName, "restart"),
    [performAction]
  );

  return {
    loading,
    error,
    startStack,
    stopStack,
    restartStack,
    performAction,
  };
};

// =============================================================================
// SUMMARY AND OVERVIEW HOOKS
// =============================================================================

export const useStacksSummary = () => {
  const [summary, setSummary] = useState<StacksSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/stacks/summary`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch summary";
      setError(errorMessage);
      console.error("Error fetching stacks summary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refresh: fetchSummary,
  };
};

// =============================================================================
// SPECIFIC DATA HOOKS - For component-level granularity
// =============================================================================

export const useStackNetworks = (stackName: string) => {
  const [networks, setNetworks] = useState<UnifiedNetworks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetworks = useCallback(async () => {
    if (!stackName) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/stacks/unified/${encodeURIComponent(stackName)}/networks`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setNetworks(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch networks";
      setError(errorMessage);
      console.error(`Error fetching networks for ${stackName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [stackName]);

  useEffect(() => {
    fetchNetworks();
  }, [fetchNetworks]);

  return {
    networks,
    loading,
    error,
    refresh: fetchNetworks,
  };
};

export const useStackVolumes = (stackName: string) => {
  const [volumes, setVolumes] = useState<UnifiedVolumes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVolumes = useCallback(async () => {
    if (!stackName) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/stacks/unified/${encodeURIComponent(stackName)}/volumes`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setVolumes(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch volumes";
      setError(errorMessage);
      console.error(`Error fetching volumes for ${stackName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [stackName]);

  useEffect(() => {
    fetchVolumes();
  }, [fetchVolumes]);

  return {
    volumes,
    loading,
    error,
    refresh: fetchVolumes,
  };
};

export const useStackServices = (stackName: string) => {
  const [services, setServices] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!stackName) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/stacks/unified/${encodeURIComponent(stackName)}/services`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setServices(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch services";
      setError(errorMessage);
      console.error(`Error fetching services for ${stackName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [stackName]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    refresh: fetchServices,
  };
};

export const useStackContainers = (stackName: string) => {
  const [containers, setContainers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContainers = useCallback(async () => {
    if (!stackName) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/stacks/unified/${encodeURIComponent(stackName)}/containers`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setContainers(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch containers";
      setError(errorMessage);
      console.error(`Error fetching containers for ${stackName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [stackName]);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  return {
    containers,
    loading,
    error,
    refresh: fetchContainers,
  };
};

// =============================================================================
// BACKWARDS COMPATIBILITY HOOKS
// =============================================================================

/**
 * Drop-in replacement for your existing useDockgeStacks hook
 * Uses unified backend processing instead of frontend transformations
 */
export const useUnifiedDockgeStacks = () => {
  const { stacks, loading, error, refresh } = useUnifiedStacks();
  const { startStack, stopStack, restartStack } = useStackActions();

  // Transform to match your existing component expectations
  const transformedStacks = stacks.map((stack: UnifiedStack) => ({
    name: stack.name,
    status: stack.status as "running" | "stopped" | "error",
    containers: stack.containers.containers, // Direct access, no mapping needed!
    path: stack.path,
    lastUpdated: stack.last_modified,

    // Additional data that was hard to get before
    networks: stack.networks.all,
    volumes: stack.volumes.all,
    services: stack.services,
    health: stack.health,
  }));

  return {
    stacks: transformedStacks,
    loading,
    error,
    refreshStacks: refresh,
    startStack,
    stopStack,
    restartStack,
  };
};

// =============================================================================
// COMPONENT-SPECIFIC HOOKS
// =============================================================================

/**
 * Hook specifically for components that need to render service containers
 * Eliminates the need for mapToStackContainers completely!
 */
export const useServiceContainers = (
  stackName: string,
  serviceName: string
) => {
  const { stack, loading, error } = useUnifiedStack(stackName);

  const serviceContainers = stack?.services[serviceName]?.containers || [];

  return {
    containers: serviceContainers, // Ready to use directly in ContainerBlock!
    loading,
    error,
    service: stack?.services[serviceName] || null,
  };
};

/**
 * Hook for network information across all sources
 * Example: stack.networks.all gives you exactly what you described
 */
export const useStackNetworkInfo = (stackName: string) => {
  const { networks, loading, error } = useStackNetworks(stackName);

  return {
    // All networks with source tracking - exactly what you wanted!
    allNetworks: networks?.all || [],

    // Specific sources if needed
    composeNetworks: networks?.compose || {},
    serviceNetworks: networks?.services || {},
    containerNetworks: networks?.containers || {},
    dockerNetworks: networks?.docker || {},

    loading,
    error,
  };
};

/**
 * Hook for volume information across all sources
 * Same pattern as networks
 */
export const useStackVolumeInfo = (stackName: string) => {
  const { volumes, loading, error } = useStackVolumes(stackName);

  return {
    // All volumes with source tracking
    allVolumes: volumes?.all || [],

    // Specific sources
    composeVolumes: volumes?.compose || {},
    serviceVolumes: volumes?.services || {},
    containerVolumes: volumes?.containers || {},
    dockerVolumes: volumes?.docker || {},

    loading,
    error,
  };
};

// =============================================================================
// PERFORMANCE-OPTIMIZED HOOKS
// =============================================================================

/**
 * Hook that combines multiple data sources efficiently
 * Perfect for overview pages that need everything
 */
export const useStackOverview = (stackName: string) => {
  const {
    stack,
    loading: stackLoading,
    error: stackError,
  } = useFrontendReadyStack(stackName);

  // All data comes from a single API call - no multiple requests!
  return {
    stack,
    services: stack?.services || {},
    networks: stack?.networks || { all: [] },
    volumes: stack?.volumes || { all: [] },
    containers: stack?.containers || { total: 0, containers: [] },
    stats: stack?.stats || { containers: { total: 0, running: 0, stopped: 0 } },
    health: stack?.health || { overall_health: "unknown" },
    uiHelpers: stack?.ui_helpers || {},

    loading: stackLoading,
    error: stackError,
  };
};

/**
 * Lightweight hook for dashboard cards that only need basic info
 */
export const useStackCard = (stackName: string) => {
  const { summary, loading, error, refresh } = useStacksSummary();

  const stackSummary = summary?.stacks.find(
    (s: {
      name: string;
      status: string;
      container_count: number;
      running_containers: number;
    }) => s.name === stackName
  );

  return {
    name: stackName,
    status: stackSummary?.status || "unknown",
    containerCount: stackSummary?.container_count || 0,
    runningContainers: stackSummary?.running_containers || 0,
    loading,
    error,
    refresh,
  };
};

/**
 * Real-time hook that automatically refreshes data
 */
export const useStackRealTime = (
  stackName: string,
  refreshInterval: number = 30000
) => {
  const { stack, loading, error, refresh } = useFrontendReadyStack(stackName);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, refreshInterval]);

  return {
    stack,
    loading,
    error,
    refresh,
    lastUpdated: Date.now(), // You could track this more precisely
  };
};
