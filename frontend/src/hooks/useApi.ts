// frontend/src/hooks/useApi.ts - Updated hooks for REST API

import { useState, useEffect, useCallback } from "react";
import {
  apiService,
  type ApiContainer,
  type ApiStack,
  type ApiSystemStats,
  type ApiDockerStats,
} from "../services/apiService";

// =============================================================================
// CONNECTION HOOK
// =============================================================================

export const useApiConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const available = await apiService.isAvailable();
      setIsConnected(available);
      if (!available) {
        setError("API server is not reachable");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    isConnected,
    isConnecting,
    error,
    reconnect: checkConnection,
  };
};

// =============================================================================
// DOCKER HOOKS
// =============================================================================

export const useContainers = () => {
  const [containers, setContainers] = useState<ApiContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContainers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getContainers();
      setContainers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch containers"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const startContainer = useCallback(
    async (containerId: string) => {
      try {
        await apiService.startContainer(containerId);
        // Refresh containers list after action
        await fetchContainers();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to start container"
        );
        return false;
      }
    },
    [fetchContainers]
  );

  const stopContainer = useCallback(
    async (containerId: string) => {
      try {
        await apiService.stopContainer(containerId);
        await fetchContainers();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to stop container"
        );
        return false;
      }
    },
    [fetchContainers]
  );

  const restartContainer = useCallback(
    async (containerId: string) => {
      try {
        await apiService.restartContainer(containerId);
        await fetchContainers();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to restart container"
        );
        return false;
      }
    },
    [fetchContainers]
  );

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  return {
    containers,
    loading,
    error,
    refreshContainers: fetchContainers,
    startContainer,
    stopContainer,
    restartContainer,
  };
};

export const useStacks = () => {
  const [stacks, setStacks] = useState<ApiStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getStacks();
      setStacks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stacks");
    } finally {
      setLoading(false);
    }
  }, []);

  const startStack = useCallback(
    async (stackName: string) => {
      try {
        await apiService.startStack(stackName);
        await fetchStacks();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start stack");
        return false;
      }
    },
    [fetchStacks]
  );

  const stopStack = useCallback(
    async (stackName: string) => {
      try {
        await apiService.stopStack(stackName);
        await fetchStacks();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to stop stack");
        return false;
      }
    },
    [fetchStacks]
  );

  const restartStack = useCallback(
    async (stackName: string) => {
      try {
        await apiService.restartStack(stackName);
        await fetchStacks();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to restart stack"
        );
        return false;
      }
    },
    [fetchStacks]
  );

  useEffect(() => {
    fetchStacks();
  }, [fetchStacks]);

  return {
    stacks,
    loading,
    error,
    refreshStacks: fetchStacks,
    startStack,
    stopStack,
    restartStack,
  };
};

export const useDockerStats = () => {
  const [stats, setStats] = useState<ApiDockerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getDockerStats();
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch Docker stats"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats,
  };
};

// =============================================================================
// SYSTEM MONITORING HOOKS
// =============================================================================

export const useSystemStats = () => {
  const [stats, setStats] = useState<ApiSystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getSystemStats();
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch system stats"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Refresh stats every 10 seconds for real-time monitoring
    const interval = setInterval(fetchStats, 10000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats,
  };
};

export const useProcesses = () => {
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProcesses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getProcesses(50);
      setProcesses(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch processes"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProcesses();

    // Refresh processes every 15 seconds
    const interval = setInterval(fetchProcesses, 15000);

    return () => clearInterval(interval);
  }, [fetchProcesses]);

  return {
    processes,
    loading,
    error,
    refreshProcesses: fetchProcesses,
  };
};

// =============================================================================
// COMBINED HOOKS (for backward compatibility)
// =============================================================================

// This replaces your old useDockgeStacks hook
export const useDockgeStacks = () => {
  const stacksHook = useStacks();

  // Transform data to match your existing component expectations
  return {
    stacks: stacksHook.stacks.map((stack) => ({
      name: stack.name,
      status: stack.status as "running" | "stopped" | "error",
      containers: stack.containers,
      path: stack.path,
      lastUpdated: stack.last_modified,
    })),
    loading: stacksHook.loading,
    error: stacksHook.error,
    refreshStacks: stacksHook.refreshStacks,
    startStack: stacksHook.startStack,
    stopStack: stacksHook.stopStack,
    restartStack: stacksHook.restartStack,
  };
};

// This replaces your old useDockgeStats hook
export const useDockgeStats = () => {
  const dockerStats = useDockerStats();

  // Transform data to match your existing component expectations
  return {
    stats: dockerStats.stats
      ? {
          runningContainers: dockerStats.stats.containers.running,
          exitedContainers: dockerStats.stats.containers.stopped,
          inactiveContainers: dockerStats.stats.containers.paused,
          totalImages: dockerStats.stats.images.total,
          totalVolumes: dockerStats.stats.volumes.total,
          totalNetworks: dockerStats.stats.networks.total,
        }
      : null,
    loading: dockerStats.loading,
    error: dockerStats.error,
    refreshStats: dockerStats.refreshStats,
  };
};

// Overall health hook
export const useHealth = () => {
  const [health, setHealth] = useState<{
    api: boolean;
    docker: boolean;
    system: boolean;
  }>({ api: false, docker: false, system: false });

  const [loading, setLoading] = useState(true);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);

      const [apiHealth, dockerHealth] = await Promise.allSettled([
        apiService.healthCheck(),
        apiService.dockerHealthCheck(),
      ]);

      setHealth({
        api: apiHealth.status === "fulfilled",
        docker: dockerHealth.status === "fulfilled",
        system: true, // If API is working, system monitoring should work
      });
    } catch (err) {
      setHealth({ api: false, docker: false, system: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();

    // Check health every minute
    const interval = setInterval(checkHealth, 60000);

    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    health,
    loading,
    checkHealth,
  };
};
