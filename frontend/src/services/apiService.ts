// frontend/src/services/apiService.ts - New REST API service to replace dockgeApi

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "http://localhost:8001/api" // Changed to port 8001
    : "http://localhost:8001/api";

// Types (keep your existing interfaces, add these new ones)
export interface ApiContainer {
  id: string;
  short_id: string;
  name: string;
  status: string;
  state: string;
  image: string;
  created: string;
  ports: string[];
  labels: Record<string, string>;
  compose_project?: string;
  compose_service?: string;
}

export interface ApiStack {
  name: string;
  path: string;
  compose_file: string;
  status: "running" | "stopped" | "partial";
  services: string[];
  containers: ApiContainer[];
  last_modified?: string;
}

export interface ApiSystemStats {
  cpu: {
    percent: number;
    per_cpu: number[];
    count: number;
    frequency: number;
    load_average: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percent: number;
    available?: number;
    cached?: number;
    buffers?: number;
    raw_used?: number;
    raw_percent?: number;
  };
  swap: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  disk: Array<{
    device: string;
    mountpoint: string;
    fstype: string;
    total: number;
    used: number;
    free: number;
    percent: number;
  }>;
  network: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
    interfaces: Array<{
      name: string;
      ip_addresses: string[];
      is_up: boolean;
      speed: number;
      mtu: number;
    }>;
  };
  uptime: number;
  timestamp: string;
}

export interface ApiDockerStats {
  stacks: {
    total: number;
    running: number;
    stopped: number;
    partial: number;
  };
  containers: {
    total: number;
    running: number;
    stopped: number;
    paused: number;
  };
  images: {
    total: number;
    size: number;
  };
  networks: {
    total: number;
  };
  volumes: {
    total: number;
  };
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Generic fetch wrapper with error handling
  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API error (${endpoint}):`, error);
      throw error;
    }
  }

  // Health checks
  async healthCheck(): Promise<{
    status: string;
    service: string;
    version: string;
  }> {
    return this.fetchApi("/health");
  }

  async dockerHealthCheck(): Promise<{
    status: string;
    version: any;
    containers_running: number;
  }> {
    return this.fetchApi("/docker/health");
  }

  // =============================================================================
  // METRICS DATA
  // =============================================================================

  async getCPUMetrics(hours: number = 1): Promise<{
    metric_type: string;
    data: Array<{ timestamp: string; value: number }>;
    summary: { average: number; minimum: number; maximum: number };
  }> {
    return this.fetchApi(`/metrics/cpu?hours=${hours}`);
  }

  async getMemoryMetrics(hours: number = 1): Promise<{
    metric_type: string;
    data: Array<{ timestamp: string; value: number }>;
    summary: { average: number; minimum: number; maximum: number };
  }> {
    return this.fetchApi(`/metrics/memory?hours=${hours}`);
  }

  async getLatestMetrics(): Promise<{
    timestamp: string;
    metrics: Record<string, { value: number; timestamp: string }>;
  }> {
    return this.fetchApi("/metrics/latest");
  }

  // =============================================================================
  // DOCKER MANAGEMENT
  // =============================================================================

  // Containers
  async getContainers(): Promise<ApiContainer[]> {
    return this.fetchApi("/docker/containers?all=true");
  }

  async startContainer(containerId: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/containers/${containerId}/start`, {
      method: "POST",
    });
  }

  async stopContainer(containerId: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/containers/${containerId}/stop`, {
      method: "POST",
    });
  }

  async restartContainer(containerId: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/containers/${containerId}/restart`, {
      method: "POST",
    });
  }

  async getContainerLogs(
    containerId: string,
    tail: number = 100
  ): Promise<{ logs: string[] }> {
    return this.fetchApi(`/docker/containers/${containerId}/logs?tail=${tail}`);
  }

  // Stacks
  async getStacks(): Promise<ApiStack[]> {
    return this.fetchApi("/docker/stacks");
  }

  async startStack(
    stackName: string
  ): Promise<{ message: string; output: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/start`, {
      method: "POST",
    });
  }

  async stopStack(
    stackName: string
  ): Promise<{ message: string; output: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/stop`, {
      method: "POST",
    });
  }

  async restartStack(
    stackName: string
  ): Promise<{ message: string; output: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/restart`, {
      method: "POST",
    });
  }

  async pullStack(
    stackName: string
  ): Promise<{ message: string; output: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/pull`, {
      method: "POST",
    });
  }

  // Docker resources
  async getImages(): Promise<
    Array<{
      id: string;
      tags: string[];
      size: number;
      created: string;
    }>
  > {
    return this.fetchApi("/docker/images");
  }

  async getNetworks(): Promise<
    Array<{
      id: string;
      name: string;
      driver: string;
      scope: string;
    }>
  > {
    return this.fetchApi("/docker/networks");
  }

  async getVolumes(): Promise<
    Array<{
      name: string;
      driver: string;
      mountpoint: string;
    }>
  > {
    return this.fetchApi("/docker/volumes");
  }

  async getDockerStats(): Promise<ApiDockerStats> {
    return this.fetchApi("/docker/stats");
  }

  // =============================================================================
  // SYSTEM MONITORING
  // =============================================================================

  async getSystemStats(): Promise<ApiSystemStats> {
    return this.fetchApi("/system/stats");
  }

  async getSystemInfo(): Promise<{
    hostname: string;
    system: string;
    release: string;
    cpu_count: number;
    memory_total: number;
  }> {
    return this.fetchApi("/system/info");
  }

  async getProcesses(limit: number = 50): Promise<
    Array<{
      pid: number;
      name: string;
      cpu_percent: number;
      memory_percent: number;
      status: string;
      username: string;
    }>
  > {
    return this.fetchApi(`/system/processes?limit=${limit}`);
  }

  async getServices(limit: number = 100): Promise<
    Array<{
      name: string;
      active_state: string;
      sub_state: string;
      description: string;
    }>
  > {
    return this.fetchApi(`/system/services?limit=${limit}`);
  }

  async getUptime(): Promise<{
    uptime_seconds: number;
    uptime_formatted: string;
    boot_time: string;
  }> {
    return this.fetchApi("/system/uptime");
  }

  // File system
  async browseFileSystem(path: string = "/"): Promise<
    Array<{
      name: string;
      path: string;
      type: string;
      size: number;
      modified: string;
    }>
  > {
    const encodedPath = encodeURIComponent(path);
    return this.fetchApi(`/system/filesystem/browse?path=${encodedPath}`);
  }

  async getDiskUsage(): Promise<
    Array<{
      device: string;
      mountpoint: string;
      total: number;
      used: number;
      free: number;
      percent: number;
    }>
  > {
    return this.fetchApi("/system/filesystem/disk-usage");
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  // Check if the API is reachable
  async isAvailable(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }

  // Get connection status
  getConnectionStatus(): "connected" | "connecting" | "disconnected" {
    // Since REST is stateless, we're always "connected" if the API is reachable
    // You could enhance this with actual connectivity checks
    return "connected";
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Export for backward compatibility with your existing code
export default ApiService;
