// Enhanced hooks for frontend/src/hooks/useEnhancedSystemStats.ts
// Hardware monitoring hooks for dashboard widgets - FIXED VERSION

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  HardwareDashboardSummary,
  AvailableSensors,
  CPUCoreHistory,
  TemperatureHistory,
  FanSpeedHistory,
  DockerContainerHistory,
  MetricHistory,
  CPUFrequencyHistory,
  EnhancedMemoryHistory,
  DockerResourceSummary,
  ChartDataPoint,
  MetricType,
  EnhancedSystemStat,
} from "@/types/system";

const API_BASE = "http://localhost:8001/api";

// =============================================================================
// HARDWARE DASHBOARD HOOK
// =============================================================================

export const useHardwareDashboard = (refreshInterval: number = 5000) => {
  const [dashboard, setDashboard] = useState<HardwareDashboardSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // FIXED: Added undefined as initial value
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/system/hardware/dashboard`);
      const result = await response.json();

      if (result.success) {
        setDashboard(result.data);
        setError(null);
      } else {
        setError("Failed to fetch dashboard data");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchDashboard, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchDashboard, refreshInterval]);

  return { dashboard, loading, error, refresh: fetchDashboard };
};

// =============================================================================
// AVAILABLE SENSORS HOOK
// =============================================================================

export const useAvailableSensors = () => {
  const [sensors, setSensors] = useState<AvailableSensors | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSensors = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/system/hardware/sensors`);
      const result = await response.json();

      if (result.success) {
        setSensors(result.sensors);
        setError(null);
      } else {
        setError("Failed to fetch sensors");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sensors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSensors();
  }, [fetchSensors]);

  return { sensors, loading, error, refresh: fetchSensors };
};

// =============================================================================
// CPU CORE HISTORY HOOK
// =============================================================================

export const useCPUCoreHistory = (hours: number = 6) => {
  const [coreHistory, setCoreHistory] = useState<CPUCoreHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoreHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/system/hardware/cpu/cores?hours=${hours}`
      );
      const result = await response.json();

      if (result.success) {
        setCoreHistory(result.data);
        setError(null);
      } else {
        setError("Failed to fetch CPU core history");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch CPU core history"
      );
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchCoreHistory();
  }, [fetchCoreHistory]);

  return { coreHistory, loading, error, refresh: fetchCoreHistory };
};

// =============================================================================
// TEMPERATURE HISTORY HOOK
// =============================================================================

export const useTemperatureHistory = (hours: number = 6) => {
  const [temperatureHistory, setTemperatureHistory] =
    useState<TemperatureHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemperatureHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/system/hardware/temperatures?hours=${hours}`
      );
      const result = await response.json();

      if (result.success) {
        setTemperatureHistory(result.data);
        setError(null);
      } else {
        setError("Failed to fetch temperature history");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch temperature history"
      );
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchTemperatureHistory();
  }, [fetchTemperatureHistory]);

  return {
    temperatureHistory,
    loading,
    error,
    refresh: fetchTemperatureHistory,
  };
};

// =============================================================================
// FAN SPEED HISTORY HOOK
// =============================================================================

export const useFanSpeedHistory = (hours: number = 6) => {
  const [fanHistory, setFanHistory] = useState<FanSpeedHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFanHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/system/hardware/fans?hours=${hours}`
      );
      const result = await response.json();

      if (result.success) {
        setFanHistory(result.data);
        setError(null);
      } else {
        setError("Failed to fetch fan speed history");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch fan speed history"
      );
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchFanHistory();
  }, [fetchFanHistory]);

  return { fanHistory, loading, error, refresh: fetchFanHistory };
};

// =============================================================================
// DOCKER CONTAINER HISTORY HOOK
// =============================================================================

export const useDockerContainerHistory = (
  hours: number = 6,
  container?: string
) => {
  const [containerHistory, setContainerHistory] = useState<
    DockerContainerHistory[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContainerHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ hours: hours.toString() });
      if (container) {
        params.append("container", container);
      }

      const response = await fetch(
        `${API_BASE}/system/hardware/docker/containers?${params}`
      );
      const result = await response.json();

      if (result.success) {
        setContainerHistory(result.data);
        setError(null);
      } else {
        setError("Failed to fetch Docker container history");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch Docker container history"
      );
    } finally {
      setLoading(false);
    }
  }, [hours, container]);

  useEffect(() => {
    fetchContainerHistory();
  }, [fetchContainerHistory]);

  return { containerHistory, loading, error, refresh: fetchContainerHistory };
};

// =============================================================================
// SPECIFIC METRIC HISTORY HOOK
// =============================================================================

export const useMetricHistory = (metricPath: string, hours: number = 6) => {
  const [metricHistory, setMetricHistory] = useState<MetricHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetricHistory = useCallback(async () => {
    if (!metricPath) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/system/hardware/metric/${metricPath}?hours=${hours}`
      );
      const result = await response.json();

      if (result.success) {
        setMetricHistory(result.data);
        setError(null);
      } else {
        setError(`Failed to fetch metric ${metricPath}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to fetch metric ${metricPath}`
      );
    } finally {
      setLoading(false);
    }
  }, [metricPath, hours]);

  useEffect(() => {
    fetchMetricHistory();
  }, [fetchMetricHistory]);

  return { metricHistory, loading, error, refresh: fetchMetricHistory };
};

// =============================================================================
// CPU FREQUENCY HISTORY HOOK
// =============================================================================

export const useCPUFrequencyHistory = (hours: number = 6) => {
  const [frequencyHistory, setFrequencyHistory] = useState<
    CPUFrequencyHistory[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFrequencyHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/system/hardware/cpu/frequencies?hours=${hours}`
      );
      const result = await response.json();

      if (result.success) {
        setFrequencyHistory(result.data);
        setError(null);
      } else {
        setError("Failed to fetch CPU frequency history");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch CPU frequency history"
      );
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchFrequencyHistory();
  }, [fetchFrequencyHistory]);

  return { frequencyHistory, loading, error, refresh: fetchFrequencyHistory };
};

// =============================================================================
// ENHANCED MEMORY HISTORY HOOK
// =============================================================================

export const useEnhancedMemoryHistory = (hours: number = 6) => {
  const [memoryHistory, setMemoryHistory] = useState<EnhancedMemoryHistory[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemoryHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/system/hardware/memory/enhanced?hours=${hours}`
      );
      const result = await response.json();

      if (result.success) {
        setMemoryHistory(result.data);
        setError(null);
      } else {
        setError("Failed to fetch enhanced memory history");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch enhanced memory history"
      );
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchMemoryHistory();
  }, [fetchMemoryHistory]);

  return { memoryHistory, loading, error, refresh: fetchMemoryHistory };
};

// =============================================================================
// DOCKER RESOURCE SUMMARY HOOK
// =============================================================================

export const useDockerResourceSummary = (refreshInterval: number = 10000) => {
  const [summary, setSummary] = useState<DockerResourceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // FIXED: Added undefined as initial value
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/system/hardware/docker/summary`
      );
      const result = await response.json();

      if (result.success) {
        setSummary(result.data || null);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch Docker resource summary");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch Docker resource summary"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchSummary, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSummary, refreshInterval]);

  return { summary, loading, error, refresh: fetchSummary };
};

// =============================================================================
// CHART DATA HOOK (For Dashboard Widgets)
// =============================================================================

export const useChartData = (metricType: MetricType, hours: number = 6) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/system/stats/chart-data/${metricType}?hours=${hours}`
      );
      const result = await response.json();

      if (result.success) {
        setChartData(result.data);
        setError(null);
      } else {
        setError(`Failed to fetch chart data for ${metricType}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to fetch chart data for ${metricType}`
      );
    } finally {
      setLoading(false);
    }
  }, [metricType, hours]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  return { chartData, loading, error, refresh: fetchChartData };
};

// =============================================================================
// ENHANCED SYSTEM STATS HOOK (Raw Data)
// =============================================================================

export const useEnhancedSystemStats = (hours: number = 24) => {
  const [stats, setStats] = useState<EnhancedSystemStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/system/stats/enhanced?hours=${hours}`
      );
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
        setError(null);
      } else {
        setError("Failed to fetch enhanced system stats");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch enhanced system stats"
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

// =============================================================================
// COMBINED DASHBOARD HOOK (Everything at once)
// =============================================================================

export const useCompleteDashboard = (
  hours: number = 6,
  refreshInterval: number = 10000
) => {
  const dashboard = useHardwareDashboard(refreshInterval);
  const sensors = useAvailableSensors();
  const dockerSummary = useDockerResourceSummary(refreshInterval);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      dashboard.refresh(),
      sensors.refresh(),
      dockerSummary.refresh(),
    ]);
  }, [dashboard.refresh, sensors.refresh, dockerSummary.refresh]);

  const loading = dashboard.loading || sensors.loading || dockerSummary.loading;
  const error = dashboard.error || sensors.error || dockerSummary.error;

  return {
    dashboard: dashboard.dashboard,
    sensors: sensors.sensors,
    dockerSummary: dockerSummary.summary,
    loading,
    error,
    refreshAll,
  };
};
