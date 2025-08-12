// frontend/src/hooks/useNewApi.ts
// Clean, modern hooks using WebSocket unified stacks + REST operations
import { useRefresh } from "@/contexts/RefreshContext";

import { useState, useEffect, useCallback, useRef } from "react";
import { newApiService } from "@/services/newApiServices";
import type { UnifiedStack } from "@/types/unified";
import { useStacks, useStackActions } from "@/hooks/v06-stackHooks";

// =============================================================================
// WEBSOCKET-BASED HOOKS (Primary Data Source)
// =============================================================================

/**
 * Real-time unified stacks via WebSocket
 * This is the primary data source for stack information
 */

/**
 * Get a specific stack by name from real-time data
 */
export const useStack = (stackName: string) => {
  const { stacks, connected, error } = useStacks();

  const stack = stacks.find((s) => s.name === stackName) || null;

  return {
    stack,
    connected,
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
