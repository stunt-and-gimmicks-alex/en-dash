import { useState, useEffect, useCallback, useRef } from "react";
import { newApiService } from "@/services/newApiServices";
import type {
  ChartData,
  DashboardData,
  SystemStat,
  HistoricalStatsResponse,
  MetricsResponse,
} from "@/types/unified";

const getWsBaseUrl = () => {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${wsProtocol}//${hostname}:8001/api`;
    }
  }
  return "ws://localhost:8001/api";
};

const WS_BASE = getWsBaseUrl();

// =============================================================================
// HISTORICAL STATS HOOKS
// =============================================================================

/**
 * Hook to get historical system statistics
 */
export const useHistoricalStats = (hours: number = 24) => {
  const [stats, setStats] = useState<SystemStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: HistoricalStatsResponse =
        await newApiService.systemStats.getHistoricalStats(hours);
      setStats(response.stats || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch historical stats"
      );
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
};

/**
 * Hook to get chart data for a specific metric
 */
export const useChartData = (
  metric: string = "cpu_percent",
  hours: number = 6
) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: ChartData = await newApiService.systemStats.getChartData(
        metric,
        hours
      );
      setChartData(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to fetch ${metric} chart data`
      );
    } finally {
      setLoading(false);
    }
  }, [metric, hours]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  return { chartData, loading, error, refresh: fetchChartData };
};

/**
 * Hook to get dashboard data for multiple metrics
 */
export const useDashboardData = (hours: number = 6) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: DashboardData =
        await newApiService.systemStats.getDashboardData(hours);
      setDashboardData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch dashboard data"
      );
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { dashboardData, loading, error, refresh: fetchDashboardData };
};

/**
 * Hook to get available metrics
 */
export const useAvailableMetrics = () => {
  const [metrics, setMetrics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: MetricsResponse =
        await newApiService.systemStats.getAvailableMetrics();
      setMetrics(response.metrics || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch available metrics"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refresh: fetchMetrics };
};

// =============================================================================
// COMBINED LIVE + HISTORICAL HOOK
// =============================================================================

/**
 * Hook that combines live stats with historical trend data
 */
export const useCombinedStats = (hours: number = 6) => {
  const { chartData: cpuChart, loading: cpuLoading } = useChartData(
    "cpu_percent",
    hours
  );
  const { chartData: memoryChart, loading: memoryLoading } = useChartData(
    "memory_percent",
    hours
  );
  const { chartData: diskChart, loading: diskLoading } = useChartData(
    "disk_percent",
    hours
  );

  const loading = cpuLoading || memoryLoading || diskLoading;

  return {
    cpu: cpuChart,
    memory: memoryChart,
    disk: diskChart,
    loading,
    timeframe: hours,
  };
};

export const useLiveSystemStats = () => {
  const [currentStats, setCurrentStats] = useState<SystemStat | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      setConnecting(true);
      setError(null);

      // Use the EXISTING unified WebSocket endpoint
      const wsUrl = "ws://192.168.1.69:8002/"; // Direct picows connection
      console.log("🔗 Connecting to unified WebSocket:", wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Connected to unified WebSocket");
        setConnected(true);
        setConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;

        // Subscribe to system_stats topic (ADD THIS)
        ws.send(
          JSON.stringify({
            type: "subscribe",
            topic: "system_stats",
          })
        );

        // Send ping to confirm connection
        ws.send(JSON.stringify({ type: "ping" }));
      };

      ws.onmessage = async (event) => {
        try {
          // Handle binary frames from picows
          let messageText;
          if (event.data instanceof Blob) {
            messageText = await event.data.text();
          } else {
            messageText = event.data;
          }

          const message = JSON.parse(messageText);
          console.log("📊 Received from unified WebSocket:", message);

          switch (message.type) {
            case "system_stats": // HANDLE SYSTEM STATS
              setCurrentStats(message.data);
              setLastUpdated(message.timestamp);
              setError(null);

              if (message.immediate) {
                console.log("⚡ Immediate system stats loaded");
              } else if (message.trigger === "live_query") {
                console.log("📡 System stats live query update received");
              }
              break;

            case "unified_stacks": // IGNORE STACK DATA (handled by other hooks)
              console.log(
                "📦 Stack data received (ignored by system stats hook)"
              );
              break;

            case "pong":
              console.log("🏓 Pong received from unified WebSocket");
              break;

            case "error":
              console.error("❌ WebSocket error:", message.message);
              setError(message.message || "WebSocket error");
              break;

            case "connected":
              console.log("🎉 Connected to picows server:", message);
              break;

            case "subscribed":
              console.log("✅ Subscribed to topic:", message.topic);
              break;

            case "pong":
              console.log("🏓 Pong received");
              break;

            default:
              console.log("🔍 Unknown message type:", message.type);
          }
        } catch (error) {
          console.error("❌ Failed to parse WebSocket message:", error);
          setError("Failed to parse message");
        }
      };

      ws.onclose = (event) => {
        console.log(
          "🔌 System stats WebSocket closed:",
          event.code,
          event.reason
        );
        setConnected(false);
        setConnecting(false);

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          console.log(
            `🔄 Reconnecting system stats in ${delay}ms (attempt ${
              reconnectAttempts.current + 1
            }/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setError("Max reconnection attempts reached");
        }
      };

      ws.onerror = (error) => {
        console.error("❌ System stats WebSocket error:", error);
        setError("WebSocket connection error");
        setConnecting(false);
      };
    } catch (error) {
      console.error("❌ Failed to create WebSocket connection:", error);
      setError("Failed to connect");
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    setConnected(false);
    setConnecting(false);
    reconnectAttempts.current = 0;
  }, []);

  const ping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

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
