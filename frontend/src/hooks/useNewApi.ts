// frontend/src/hooks/useNewApi.ts
// Clean, modern hooks using WebSocket unified stacks + REST operations
import { useRefresh } from "@/contexts/RefreshContext";

import { useState, useEffect, useCallback, useRef } from "react";
import { newApiService } from "@/services/newApiServices";
import type { UnifiedStack } from "@/types/unified";

// =============================================================================
// WEBSOCKET-BASED HOOKS (Primary Data Source)
// =============================================================================

/**
 * Real-time unified stacks via WebSocket
 * This is the primary data source for stack information
 */
export const useStacks = () => {
  const { registerStacksRefresh } = useRefresh();
  const [stacks, setStacks] = useState<UnifiedStack[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      setError(null);
      setLoading(true);

      const ws = newApiService.createUnifiedStacksStream(
        (newStacks) => {
          setStacks(newStacks);
          setLoading(false);
          setError(null);
        },
        (error) => {
          setError(error);
          setLoading(false);
        }
      );

      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setLoading(false);
      };

      ws.onclose = () => {
        setConnected(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Stack actions (still REST-based)
  const startStack = useCallback(async (stackName: string) => {
    try {
      await newApiService.stacks.startStack(stackName);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start stack");
      return false;
    }
  }, []);

  const stopStack = useCallback(async (stackName: string) => {
    console.log("🛑 stopStack called with:", stackName);
    console.log("🛑 stackName type:", typeof stackName);
    console.log("🛑 stackName value:", JSON.stringify(stackName));

    try {
      console.log("🛑 About to call newApiService.stacks.stopStack...");
      const result = await newApiService.stacks.stopStack(stackName);
      console.log("🛑 Stop stack result:", result);
      console.log("✅ Stack stopped successfully");
      return true;
    } catch (err) {
      console.error("❌ Stop stack error:", err);
      console.error("❌ Error type:", typeof err);
      console.error(
        "❌ Error message:",
        err instanceof Error ? err.message : String(err)
      );
      console.error(
        "❌ Error stack:",
        err instanceof Error ? err.stack : "No stack trace"
      );
      setError(err instanceof Error ? err.message : "Failed to stop stack");
      return false;
    }
  }, []);

  const restartStack = useCallback(async (stackName: string) => {
    try {
      await newApiService.stacks.restartStack(stackName);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restart stack");
      return false;
    }
  }, []);

  const manualRefresh = useCallback(async () => {
    // Force reconnect to get fresh data
    await connect();
  }, [connect]);
  useEffect(() => {
    registerStacksRefresh(manualRefresh);
  }, [registerStacksRefresh, manualRefresh]);
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    stacks,
    connected,
    loading,
    error,
    refresh: connect,
    startStack,
    stopStack,
    restartStack,
  };
};

/**
 * Get a specific stack by name from real-time data
 */
export const useStack = (stackName: string) => {
  const { stacks, connected, loading, error } = useStacks();

  const stack = stacks.find((s) => s.name === stackName) || null;

  return {
    stack,
    connected,
    loading,
    error,
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
    error: null,
    totalContainers: stack?.containers?.total || 0,
    runningContainers: stack?.stats?.containers?.running || 0,
  };
};

// =============================================================================
// REST-BASED HOOKS (Operations & Fallbacks)
// =============================================================================

/**
 * API health check
 */
export const useApiHealth = () => {
  const [healthy, setHealthy] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkHealth = useCallback(async () => {
    try {
      setChecking(true);
      const isHealthy = await newApiService.healthCheck();
      setHealthy(isHealthy);
    } catch {
      setHealthy(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { healthy, checking, checkHealth };
};

/**
 * Docker stats summary (REST fallback)
 */
export const useDockerStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await newApiService.getDockerStats();
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
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
};

// =============================================================================
// BACKWARDS COMPATIBILITY
// =============================================================================

/**
 * Drop-in replacement for old useDockgeStacks
 */
export const useDockgeStacksCompat = () => {
  const {
    stacks,
    connected,
    loading,
    error,
    startStack,
    stopStack,
    restartStack,
  } = useStacks();

  // Transform to match old interface
  const compatStacks = stacks.map((stack) => ({
    name: stack.name,
    status: stack.status as "running" | "stopped" | "error",
    containers: stack.containers?.containers || [],
    path: stack.path,
    lastUpdated: stack.last_modified,
  }));

  return {
    stacks: compatStacks,
    loading,
    error,
    refreshStacks: () => {}, // WebSocket auto-refreshes
    startStack,
    stopStack,
    restartStack,
  };
};
