// Enhanced types for frontend/src/types/system.ts
// Add these types to your existing system types file

export interface EnhancedSystemStat {
  timestamp: number;
  collected_at: number;

  // Basic stats (existing)
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  network_bytes_sent: number;
  network_bytes_recv: number;
  network_packets_sent: number;
  network_packets_recv: number;

  // Enhanced CPU monitoring
  cpu_enhanced?: {
    per_core_usage: number[];
    per_core_freq: Array<{
      current: number;
      min: number;
      max: number;
    }>;
    tctl_temp?: number;
    core_count: number;
    thread_count: number;
    temperatures?: Record<string, number>;
  };

  // Enhanced memory monitoring
  memory_enhanced?: {
    physical: {
      total: number;
      available: number;
      used: number;
      free: number;
      percent: number;
      active: number;
      inactive: number;
      buffers: number;
      cached: number;
      shared: number;
    };
    swap: {
      total: number;
      used: number;
      free: number;
      percent: number;
    };
    temperatures: Record<string, number>;
  };

  // SSD temperature monitoring
  ssd_temps?: Record<
    string,
    {
      composite_temp: number;
      device: string;
      method: "nvme" | "hwmon" | "smartctl";
    }
  >;

  // Fan monitoring
  fans?: Record<
    string,
    {
      speed_rpm: number;
      sensor_path: string;
      hwmon: string;
    }
  >;

  // Per-container Docker stats
  docker_containers?: Record<string, DockerContainerStats>;
}

export interface DockerContainerStats {
  id: string;
  image: string;
  status: string;
  cpu: {
    percent: number;
  };
  memory: {
    usage_bytes: number;
    usage_mb: number;
    limit_bytes: number;
    limit_mb: number;
    percent: number;
  };
  network: {
    rx_bytes: number;
    tx_bytes: number;
    rx_mb: number;
    tx_mb: number;
  };
  storage: {
    read_bytes: number;
    write_bytes: number;
    read_mb: number;
    write_mb: number;
  };
  compose_project?: string;
  compose_service?: string;
  error?: string;
}

// Dashboard summary response
export interface HardwareDashboardSummary {
  timestamp: number;
  collected_at: number;
  basic_stats: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
  };
  temperatures: Record<string, number>;
  fans: Record<string, number>;
  docker_summary: {
    total_containers: number;
    total_cpu_percent: number;
    total_memory_mb: number;
    containers: Record<
      string,
      {
        cpu_percent: number;
        memory_mb: number;
        status: string;
      }
    >;
  };
}

// Available sensors response
export interface AvailableSensors {
  cpu_temps: string[];
  memory_temps: string[];
  ssd_temps: string[];
  fans: string[];
  docker_containers: string[];
}

// Historical data responses
export interface CPUCoreHistory {
  timestamp: number;
  collected_at: number;
  cores: number[];
}

export interface TemperatureHistory {
  cpu_temps: Array<{
    timestamp: number;
    collected_at: number;
    temperatures: Record<string, number>;
  }>;
  memory_temps: Array<{
    timestamp: number;
    collected_at: number;
    temperatures: Record<string, number>;
  }>;
  ssd_temps: Array<{
    timestamp: number;
    collected_at: number;
    temperatures: Record<
      string,
      {
        composite_temp: number;
        device: string;
        method: string;
      }
    >;
  }>;
}

export interface FanSpeedHistory {
  timestamp: number;
  collected_at: number;
  fans: Record<
    string,
    {
      speed_rpm: number;
      sensor_path: string;
      hwmon: string;
    }
  >;
}

export interface DockerContainerHistory {
  timestamp: number;
  collected_at: number;
  containers: Record<string, DockerContainerStats>;
}

export interface MetricHistory {
  timestamp: number;
  collected_at: number;
  value: number;
  metric: string;
}

export interface CPUFrequencyHistory {
  timestamp: number;
  collected_at: number;
  frequencies: Array<{
    current: number;
    min: number;
    max: number;
  }>;
}

export interface EnhancedMemoryHistory {
  timestamp: number;
  collected_at: number;
  memory: {
    physical: {
      total: number;
      available: number;
      used: number;
      free: number;
      percent: number;
      active: number;
      inactive: number;
      buffers: number;
      cached: number;
      shared: number;
    };
    swap: {
      total: number;
      used: number;
      free: number;
      percent: number;
    };
    temperatures: Record<string, number>;
  };
}

export interface DockerResourceSummary {
  containers: Record<string, DockerContainerStats>;
  by_project: Record<
    string,
    {
      containers: Array<{
        name: string;
        cpu_percent: number;
        memory_mb: number;
        status: string;
      }>;
      total_cpu: number;
      total_memory: number;
    }
  >;
  summary: {
    total_containers: number;
    total_cpu_percent: number;
    total_memory_mb: number;
    total_memory_gb: number;
  };
  timestamp: number;
}

// Chart data for dashboard widgets
export interface ChartDataPoint {
  timestamp: number;
  collected_at: number;
  value: number;
  time: string; // ISO string for recharts
}

export interface ChartDataResponse {
  success: boolean;
  metric_type: string;
  hours_requested: number;
  data_points: number;
  data: ChartDataPoint[];
  timestamp: string;
}

// API Response wrappers
export interface HardwareDashboardResponse {
  success: boolean;
  data: HardwareDashboardSummary;
  timestamp: string;
}

export interface AvailableSensorsResponse {
  success: boolean;
  sensors: AvailableSensors;
  timestamp: string;
}

export interface CPUCoreHistoryResponse {
  success: boolean;
  hours_requested: number;
  data_points: number;
  data: CPUCoreHistory[];
  timestamp: string;
}

export interface TemperatureHistoryResponse {
  success: boolean;
  hours_requested: number;
  data: TemperatureHistory;
  timestamp: string;
}

export interface FanSpeedHistoryResponse {
  success: boolean;
  hours_requested: number;
  data_points: number;
  data: FanSpeedHistory[];
  timestamp: string;
}

export interface DockerContainerHistoryResponse {
  success: boolean;
  hours_requested: number;
  container_filter?: string;
  data_points: number;
  data: DockerContainerHistory[];
  timestamp: string;
}

export interface MetricHistoryResponse {
  success: boolean;
  metric_path: string;
  hours_requested: number;
  data_points: number;
  data: MetricHistory[];
  timestamp: string;
}

export interface CPUFrequencyHistoryResponse {
  success: boolean;
  hours_requested: number;
  data_points: number;
  data: CPUFrequencyHistory[];
  timestamp: string;
}

export interface EnhancedMemoryHistoryResponse {
  success: boolean;
  hours_requested: number;
  data_points: number;
  data: EnhancedMemoryHistory[];
  timestamp: string;
}

export interface DockerResourceSummaryResponse {
  success: boolean;
  data?: DockerResourceSummary;
  error?: string;
}

export interface EnhancedSystemStatsResponse {
  success: boolean;
  hours_requested: number;
  data_points: number;
  data: EnhancedSystemStat[];
  timestamp: string;
}

// Metric type definitions for chart endpoints
export type MetricType =
  | "cpu_percent"
  | "memory_percent"
  | "disk_percent"
  | "cpu_temp"
  | "memory_temp"
  | "ssd_temp"
  | "fan_speed"
  | "docker_cpu"
  | "docker_memory";

// Widget configuration types for dashboards
export interface TemperatureWidgetConfig {
  title: string;
  sensors: string[];
  chart_type: "line" | "area";
  time_range: number; // hours
  alert_thresholds?: {
    warning: number;
    critical: number;
  };
}

export interface FanSpeedWidgetConfig {
  title: string;
  fans: string[];
  chart_type: "line" | "gauge";
  time_range: number; // hours
  alert_thresholds?: {
    min_rpm: number;
    max_rpm: number;
  };
}

export interface CPUCoreWidgetConfig {
  title: string;
  show_individual_cores: boolean;
  show_average: boolean;
  chart_type: "line" | "area" | "heatmap";
  time_range: number; // hours
}

export interface DockerContainerWidgetConfig {
  title: string;
  containers: string[];
  metric: "cpu" | "memory" | "network" | "storage";
  chart_type: "line" | "bar" | "stacked";
  time_range: number; // hours
  group_by_project: boolean;
}

export interface MemoryDetailWidgetConfig {
  title: string;
  show_physical: boolean;
  show_swap: boolean;
  show_breakdown: boolean; // active, inactive, buffers, cached
  show_temperatures: boolean;
  chart_type: "line" | "area" | "stacked";
  time_range: number; // hours;
}

// Dashboard layout types
export interface DashboardWidget {
  id: string;
  type:
    | "temperature"
    | "fan_speed"
    | "cpu_cores"
    | "docker_containers"
    | "memory_detail";
  config:
    | TemperatureWidgetConfig
    | FanSpeedWidgetConfig
    | CPUCoreWidgetConfig
    | DockerContainerWidgetConfig
    | MemoryDetailWidgetConfig;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  created_at: string;
  updated_at: string;
}
