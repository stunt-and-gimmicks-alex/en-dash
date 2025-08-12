// frontend/src/hooks/useSystemStats.ts
// Simple hook that uses the existing v06-unifiedWebSocketService for system stats
// This replaces the old duplicate WebSocket connections

import { useState, useEffect, useCallback } from "react";
import v06WebSocketService from "@/services/v06-unifiedWebSocketService";

interface SystemStats {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
  network_bytes_sent: number;
  network_bytes_recv: number;
  timestamp: string;
  container_resources?: {
    total_containers: number;
    total_cpu_usage: number;
    total_memory_usage_mb: number;
    total_memory_limit_mb: number;
    containers: Array<{
      id: string;
      name: string;
      stack_name?: string;
      service_name?: string;
      cpu_percent: number;
      memory_usage_mb: number;
      memory_limit_mb: number;
      memory_percent: number;
      network_rx_bytes: number;
      network_tx_bytes: number;
      block_read_bytes: number;
      block_write_bytes: number;
    }>;
  };
}

/**
 * Hook for system stats using the unified v06 WebSocket service
 * Provides buttery smooth 1/2 second updates with 5-second server batches
 */
export const useSystemStats = () => {
  const [currentStats, setCurrentStats] = useState<SystemStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      setError(null);
      await v06WebSocketService.connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    v06WebSocketService.disconnect();
  }, []);

  const ping = useCallback(() => {
    v06WebSocketService.ping();
  }, []);

  // Set up event listeners and subscription
  useEffect(() => {
    let unsubscribeFromSystemStats: (() => void) | null = null;

    const handleConnected = () => {
      setConnected(true);
      setConnecting(false);
      setError(null);

      // Subscribe to system_stats topic
      unsubscribeFromSystemStats = v06WebSocketService.subscribe(
        "system_stats",
        (data: SystemStats, message: any) => {
          setCurrentStats(data);
          setLastUpdated(message.timestamp);
          setError(null);
        }
      );
    };

    const handleDisconnected = () => {
      setConnected(false);
      setConnecting(false);
      if (unsubscribeFromSystemStats) {
        unsubscribeFromSystemStats();
        unsubscribeFromSystemStats = null;
      }
    };

    const handleConnecting = () => {
      setConnecting(true);
      setError(null);
    };

    const handleError = (error: Error) => {
      setError(error.message);
      setConnecting(false);
    };

    // Register event listeners
    v06WebSocketService.on("connected", handleConnected);
    v06WebSocketService.on("disconnected", handleDisconnected);
    v06WebSocketService.on("connecting", handleConnecting);
    v06WebSocketService.on("error", handleError);

    // Auto-connect
    connect();

    return () => {
      // Cleanup
      v06WebSocketService.off("connected", handleConnected);
      v06WebSocketService.off("disconnected", handleDisconnected);
      v06WebSocketService.off("connecting", handleConnecting);
      v06WebSocketService.off("error", handleError);

      if (unsubscribeFromSystemStats) {
        unsubscribeFromSystemStats();
      }
    };
  }, [connect]);

  return {
    currentStats,
    connected,
    connecting,
    error,
    lastUpdated,
    refresh: connect,
    disconnect,
    ping,
  };
};

/**
 * Hook specifically for container resource data from system stats
 */
export const useContainerResourceStats = () => {
  const { currentStats, connected, error } = useSystemStats();

  const containerResources = currentStats?.container_resources;

  const getContainersByStack = useCallback(
    (stackName: string) => {
      return (
        containerResources?.containers.filter(
          (c) => c.stack_name === stackName
        ) || []
      );
    },
    [containerResources]
  );

  const getStackResourceSummary = useCallback(
    (stackName: string) => {
      const stackContainers = getContainersByStack(stackName);

      if (stackContainers.length === 0) {
        return {
          total_containers: 0,
          total_cpu_usage: 0,
          total_memory_usage_mb: 0,
          avg_cpu_usage: 0,
          avg_memory_percent: 0,
        };
      }

      const totalCpu = stackContainers.reduce(
        (sum, c) => sum + c.cpu_percent,
        0
      );
      const totalMemoryUsage = stackContainers.reduce(
        (sum, c) => sum + c.memory_usage_mb,
        0
      );

      return {
        total_containers: stackContainers.length,
        total_cpu_usage: totalCpu,
        total_memory_usage_mb: totalMemoryUsage,
        avg_cpu_usage: totalCpu / stackContainers.length,
        avg_memory_percent:
          stackContainers.reduce((sum, c) => sum + c.memory_percent, 0) /
          stackContainers.length,
      };
    },
    [getContainersByStack]
  );

  return {
    containerResources,
    connected,
    error,
    getContainersByStack,
    getStackResourceSummary,
    hasContainerData: !!containerResources,
    totalContainers: containerResources?.total_containers || 0,
  };
};

/**
 * Debug hook for monitoring the smooth update system
 */
export const useSystemStatsDebug = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setDebugInfo({
        timestamp: new Date().toISOString(),
        serviceStats: v06WebSocketService.getStats(),
        queueInfo: v06WebSocketService.getSystemStatsQueueInfo(),
        currentStats: v06WebSocketService.getCurrentSystemStats(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return debugInfo;
};

// Legacy compatibility - same interface as old useSystemStats
export const useLiveSystemStats = useSystemStats;
