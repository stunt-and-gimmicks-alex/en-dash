import { useState, useEffect, useCallback, useRef } from "react";
import { newApiService } from "@/services/newApiServices";
import type {
  ChartData,
  DashboardData,
  SystemStat,
  HistoricalStatsResponse,
  MetricsResponse,
} from "@/types/unified";

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

// =============================================================================
// IMPROVED LIVE SYSTEM STATS
// =============================================================================

export const useLiveSystemStats = () => {
  const [currentStats, setCurrentStats] = useState<SystemStat | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      setError(null);

      const ws = newApiService.systemStats.createLiveStatsConnection(
        (stats) => {
          console.log("📊 Live system stats received:", stats);
          setCurrentStats(stats);
          setError(null);
        },
        (error) => {
          console.error("❌ Live system stats error:", error);
          setError(error);
        }
      );

      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log("✅ Live system stats connected");
      };

      ws.onclose = () => {
        setConnected(false);
        console.log("❌ Live system stats disconnected");
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    currentStats,
    connected,
    error,
    refresh: connect,
  };
};
