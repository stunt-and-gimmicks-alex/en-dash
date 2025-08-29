// frontend/src/hooks/v06-systemStatsHooks.ts
// Simple hooks that use the Zustand system stats store
// Follows the exact same pattern as v06-stackHooks

import { useEffect, useState, useCallback } from "react";
import {
  useSystemStatsStore,
  systemStatsSelectors,
  initializeSystemStatsStore,
} from "@/stores/v06-systemStatsStore";
import { systemStatsApi, type StatField } from "@/services/v06-systemStatsApi";
import { type SystemStat } from "@/types/unified";

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
    statsHistory,
    currentStats,
    connected,
    historySize: statsHistory.length,
    lastUpdate:
      statsHistory.length > 0
        ? new Date(statsHistory[statsHistory.length - 1].timestamp)
        : null,
  };
};

/**
 * Queue information hook for monitoring
 */
export const useSystemStatsQueue = () => {
  // FIXED: No initialization here

  const queueInfo = systemStatsSelectors.useQueueInfo();

  return {
    queueInfo,
  };
};

/**
 * Convenience hook that combines commonly needed stats
 */
export const useSystemStatsOverview = () => {
  const stats = useSystemStats();
  const history = useSystemStatsHistory();

  return {
    // Current state
    stats: stats.currentStats,
    connected: stats.connected,
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
// ENHANCED CHART DATA HOOK - Unified replacement for useSystemStatsRange and useSystemStatsChart
// =============================================================================

export type TimeAggregationInterval =
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks";

export interface ChartDataPoint {
  timestamp: string;
  [key: string]: number | string; // Dynamic field names with their values
}

export interface UseSystemStatsChartDataOptions {
  fields: StatField[];
  minutesBack?: number;
  startTime?: Date | string;
  endTime?: Date | string;
  aggregationInterval?: TimeAggregationInterval;
  refreshInterval?: number; // seconds, 0 to disable
  enabled?: boolean;
  limit?: number;
}

export interface UseSystemStatsChartDataReturn {
  data: ChartDataPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totalRecords: number;
  // Computed stats for each field
  stats: Record<
    string,
    {
      latest: number;
      min: number;
      max: number;
      avg: number;
      count: number;
    }
  >;
  // Chart-ready data (same as data, but with explicit typing for charts)
  chartData: ChartDataPoint[];
  // Helper flags
  hasData: boolean;
  isEmpty: boolean;
}

/**
 * UNIFIED HOOK: Enhanced system stats data retrieval for charts and dashboards
 * Replaces both useSystemStatsRange and useSystemStatsChart
 *
 * @param options Configuration for data retrieval
 * @returns Chart-ready data with loading states and computed statistics
 */
export const useSystemStatsChartData = (
  options: UseSystemStatsChartDataOptions
): UseSystemStatsChartDataReturn => {
  const {
    fields,
    minutesBack = 60,
    startTime,
    endTime,
    aggregationInterval = "minutes",
    refreshInterval = 0, // Default: no auto-refresh
    enabled = true,
    limit = 1000,
  } = options;

  // State management
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized fetch function with stable dependencies
  const fetchData = useCallback(async () => {
    if (!enabled || fields.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Determine time range - use minutesBack if start/end not provided
      let effectiveMinutesBack = minutesBack;

      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        effectiveMinutesBack = Math.ceil(
          (end.getTime() - start.getTime()) / (60 * 1000)
        );
      }

      // Fetch raw data from API
      const response = await systemStatsApi.getStatsRange({
        minutesBack: effectiveMinutesBack,
        fields: fields,
        limit,
      });

      if (!response.success || !response.data) {
        throw new Error("Failed to fetch stats data");
      }

      let processedData = response.data;

      // Apply time filtering if start/end times provided
      if (startTime && endTime) {
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        processedData = processedData.filter((stat) => {
          const statTime = new Date(stat.timestamp);
          return statTime >= startDate && statTime <= endDate;
        });
      }

      // Apply time aggregation if needed
      const aggregatedData = aggregateByInterval(
        processedData,
        aggregationInterval
      );

      // Transform to chart-ready format
      const chartData: ChartDataPoint[] = aggregatedData.map((stat) => {
        const dataPoint: ChartDataPoint = {
          timestamp: stat.timestamp,
        };

        // Add each requested field as a property
        fields.forEach((field) => {
          if (field === "all") {
            // Add all numeric fields from the stat
            Object.entries(stat).forEach(([key, value]) => {
              if (typeof value === "number" && key !== "timestamp") {
                dataPoint[key] = value;
              }
            });
          } else {
            // Add specific field
            const fieldValue = stat[field as keyof SystemStat];
            if (typeof fieldValue === "number") {
              dataPoint[field] = fieldValue;
            }
          }
        });

        return dataPoint;
      });

      setData(chartData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch stats";
      setError(errorMessage);
      console.error("📊 useSystemStatsChartData error:", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    // Stable primitive dependencies only
    JSON.stringify(fields), // Serialize array to prevent reference changes
    minutesBack,
    startTime?.toString(), // Convert to string to stabilize
    endTime?.toString(),
    aggregationInterval,
    enabled,
    limit,
  ]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh setup with cleanup to prevent memory leaks
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0 && enabled) {
      const interval = setInterval(() => {
        // Only fetch if component is still mounted and enabled
        if (enabled) {
          fetchData();
        }
      }, refreshInterval * 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [refreshInterval, enabled]); // Removed fetchData dependency to prevent loops

  // Compute statistics for each field
  const stats = computeFieldStats(data, fields);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    totalRecords: data.length,
    stats,
    chartData: data, // Alias for clarity
    hasData: data.length > 0,
    isEmpty: data.length === 0,
  };
};

// =============================================================================
// UTILITY FUNCTIONS for data processing
// =============================================================================

/**
 * Aggregate data points by time interval
 */
function aggregateByInterval(
  data: SystemStat[],
  interval: TimeAggregationInterval
): SystemStat[] {
  if (interval === "seconds" || data.length === 0) {
    // No aggregation needed for seconds or empty data
    return data;
  }

  // Group data by time intervals
  const grouped = new Map<string, SystemStat[]>();

  data.forEach((stat) => {
    const timestamp = new Date(stat.timestamp);
    const intervalKey = getIntervalKey(timestamp, interval);

    if (!grouped.has(intervalKey)) {
      grouped.set(intervalKey, []);
    }
    grouped.get(intervalKey)!.push(stat);
  });

  // Aggregate each group
  const aggregated: SystemStat[] = [];

  grouped.forEach((stats, intervalKey) => {
    if (stats.length === 0) return;

    // Use the middle timestamp of the interval
    const avgTimestamp = new Date(
      stats.reduce((sum, stat) => sum + new Date(stat.timestamp).getTime(), 0) /
        stats.length
    );

    // Aggregate numeric fields by averaging
    const aggregatedStat: SystemStat = {
      timestamp: avgTimestamp.toISOString(),
      collected_at: avgTimestamp.toISOString(),
      cpu_percent: avgNumericField(stats, "cpu_percent"),
      memory_percent: avgNumericField(stats, "memory_percent"),
      disk_percent: avgNumericField(stats, "disk_percent"),
      memory_used_gb: avgNumericField(stats, "memory_used_gb"),
      memory_total_gb: avgNumericField(stats, "memory_total_gb"),
      disk_used_gb: avgNumericField(stats, "disk_used_gb"),
      disk_total_gb: avgNumericField(stats, "disk_total_gb"),
      network_bytes_sent: avgNumericField(stats, "network_bytes_sent"),
      network_bytes_recv: avgNumericField(stats, "network_bytes_recv"),
      network_packets_sent: avgNumericField(stats, "network_packets_sent"),
      network_packets_recv: avgNumericField(stats, "network_packets_recv"),
      // TODO: Aggregate container_resources if needed
    };

    aggregated.push(aggregatedStat);
  });

  // Sort by timestamp
  return aggregated.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Generate interval key for grouping data points
 */
function getIntervalKey(
  timestamp: Date,
  interval: TimeAggregationInterval
): string {
  const year = timestamp.getUTCFullYear();
  const month = timestamp.getUTCMonth();
  const day = timestamp.getUTCDate();
  const hour = timestamp.getUTCHours();
  const minute = timestamp.getUTCMinutes();

  switch (interval) {
    case "minutes":
      return `${year}-${month}-${day}-${hour}-${minute}`;
    case "hours":
      return `${year}-${month}-${day}-${hour}`;
    case "days":
      return `${year}-${month}-${day}`;
    case "weeks":
      const weekStart = new Date(timestamp);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
      return `${weekStart.getUTCFullYear()}-W${Math.ceil(
        weekStart.getUTCDate() / 7
      )}`;
    default:
      return timestamp.toISOString();
  }
}

/**
 * Average a numeric field across multiple stats
 */
function avgNumericField(stats: SystemStat[], field: keyof SystemStat): number {
  const values = stats
    .map((stat) => stat[field])
    .filter((value): value is number => typeof value === "number");

  return values.length > 0
    ? values.reduce((sum, val) => sum + val, 0) / values.length
    : 0;
}

/**
 * Compute statistics for each field in the data
 */
function computeFieldStats(
  data: ChartDataPoint[],
  fields: StatField[]
): Record<
  string,
  { latest: number; min: number; max: number; avg: number; count: number }
> {
  const stats: Record<
    string,
    { latest: number; min: number; max: number; avg: number; count: number }
  > = {};

  if (data.length === 0) {
    return stats;
  }

  // Get all numeric field names from the data
  const numericFields = new Set<string>();
  data.forEach((point) => {
    Object.entries(point).forEach(([key, value]) => {
      if (typeof value === "number" && key !== "timestamp") {
        numericFields.add(key);
      }
    });
  });

  // Compute stats for each numeric field
  numericFields.forEach((fieldName) => {
    const values = data
      .map((point) => point[fieldName])
      .filter((value): value is number => typeof value === "number");

    if (values.length > 0) {
      stats[fieldName] = {
        latest: values[values.length - 1] || 0,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        count: values.length,
      };
    }
  });

  return stats;
}

// =============================================================================
// LEGACY COMPATIBILITY HOOKS (deprecated but kept for backwards compatibility)
// =============================================================================

/**
 * @deprecated Use useSystemStatsChartData instead
 * Legacy hook for backwards compatibility
 */
export const useSystemStatsRange = (
  options: {
    minutesBack?: number;
    fields?: StatField[];
    refreshInterval?: number;
    enabled?: boolean;
  } = {}
) => {
  const {
    minutesBack = 60,
    fields = ["all"],
    refreshInterval,
    enabled = true,
  } = options;

  console.warn(
    "⚠️ useSystemStatsRange is deprecated. Use useSystemStatsChartData instead."
  );

  const chartDataResult = useSystemStatsChartData({
    fields,
    minutesBack,
    refreshInterval,
    enabled,
  });

  // Transform to old format
  const legacyData = chartDataResult.data.map((point) => {
    const { timestamp, ...rest } = point;
    return {
      timestamp,
      ...rest,
    } as SystemStat;
  });

  return {
    data: legacyData,
    loading: chartDataResult.loading,
    error: chartDataResult.error,
    refetch: chartDataResult.refetch,
    totalRecords: chartDataResult.totalRecords,
  };
};

/**
 * @deprecated Use useSystemStatsChartData instead
 * Legacy chart hook for backwards compatibility
 */
export const useSystemStatsChart = (
  metric: StatField,
  timeRangeMinutes: number = 60
) => {
  console.warn(
    "⚠️ useSystemStatsChart is deprecated. Use useSystemStatsChartData instead."
  );

  const result = useSystemStatsChartData({
    fields: [metric],
    minutesBack: timeRangeMinutes,
    refreshInterval: 30,
  });

  // Transform to old format
  const chartData = result.data.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    value: (point[metric] as number) || 0,
    timestamp: point.timestamp,
  }));

  const fieldStats = result.stats[metric] || {
    latest: 0,
    min: 0,
    max: 0,
    avg: 0,
    count: 0,
  };

  return {
    data: chartData,
    loading: result.loading,
    error: result.error,
    latest: fieldStats.latest,
    min: fieldStats.min,
    max: fieldStats.max,
    avg: fieldStats.avg,
  };
};

/**
 * @deprecated Use useSystemStatsChartData instead
 * Legacy summary hook for backwards compatibility
 */
export const useSystemStatsSummary = (minutesBack: number = 60) => {
  console.warn(
    "⚠️ useSystemStatsSummary is deprecated. Use useSystemStatsChartData instead."
  );

  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await systemStatsApi.getStatsSummary(minutesBack);
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch summary");
    } finally {
      setLoading(false);
    }
  }, [minutesBack]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary: data,
    loading,
    error,
    refetch: fetchSummary,
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
