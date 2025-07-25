// frontend/src/services/apiService.ts - Smart API service with dynamic URL detection

// Smart API URL detection function
const getApiBaseUrl = (): string => {
  // Check for environment variable first
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Auto-detect based on current window location
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;

    // If accessing via server IP, use same IP for API
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:8001/api`;
    }
  }

  // Default fallback for localhost development
  return "http://localhost:8001/api";
};

const API_BASE_URL = getApiBaseUrl();

// Log the detected URL for debugging
console.log("🔗 API Base URL detected:", API_BASE_URL);

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
    console.log("🚀 ApiService initialized with URL:", this.baseUrl);
  }

  // Generic fetch wrapper with error handling
  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log("📡 API Request:", url);

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ API Response received for:", endpoint);
      return data;
    } catch (error) {
      console.error("❌ API Error for:", url, error);
      throw error;
    }
  }

  // =============================================================================
  // HEALTH & CONNECTION
  // =============================================================================

  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.fetchApi("/health");
  }

  // =============================================================================
  // DOCKER MANAGEMENT
  // =============================================================================

  // Docker health check
  async getDockerHealth(): Promise<{ status: string; docker_version: string }> {
    return this.fetchApi("/docker/health");
  }

  // Container management
  async getContainers(): Promise<ApiContainer[]> {
    return this.fetchApi("/docker/containers");
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

  async removeContainer(containerId: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/containers/${containerId}`, {
      method: "DELETE",
    });
  }

  // Stack management
  async getStacks(): Promise<ApiStack[]> {
    return this.fetchApi("/docker/stacks");
  }

  async startStack(stackName: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/start`, {
      method: "POST",
    });
  }

  async stopStack(stackName: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/stop`, {
      method: "POST",
    });
  }

  async restartStack(stackName: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/restart`, {
      method: "POST",
    });
  }

  async removeStack(stackName: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}`, {
      method: "DELETE",
    });
  }

  // Docker images
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

  async removeImage(imageId: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/images/${imageId}`, {
      method: "DELETE",
    });
  }

  // Docker stats
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
    version: string;
    machine: string;
    processor: string;
    python_version: string;
    cpu_count: number;
    memory_total: number;
    disk_total: number;
  }> {
    return this.fetchApi("/system/info");
  }

  // Process management
  async getProcesses(
    limit: number = 50,
    sortBy: string = "cpu_percent"
  ): Promise<
    Array<{
      pid: number;
      name: string;
      cpu_percent: number;
      memory_percent: number;
      memory_mb: number;
      status: string;
      username: string;
      command: string;
      created: string;
    }>
  > {
    return this.fetchApi(`/system/processes?limit=${limit}&sort_by=${sortBy}`);
  }

  async killProcess(
    pid: number,
    signal: number = 15
  ): Promise<{ message: string }> {
    return this.fetchApi(`/system/processes/${pid}/kill`, {
      method: "POST",
      body: JSON.stringify({ signal }),
    });
  }

  // Service management
  async getServices(limit: number = 100): Promise<
    Array<{
      name: string;
      load_state: string;
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

  // Get the current API base URL (useful for debugging)
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Export for backward compatibility with your existing code
export default ApiService;
