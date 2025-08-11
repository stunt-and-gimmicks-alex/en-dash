// frontend/src/services/newApiServices.ts
// Clean, modern API service layer using unified backend + WebSockets
// Fixed version with proper EnhancedUnifiedStack integration

import type {
  EnhancedUnifiedStack,
  EnhancedUnifiedService,
  StackActionResponse,
  SystemStat,
  ChartDataPoint,
  DashboardData,
  HistoricalStatsResponse,
  ChartData,
  MetricsResponse,
} from "@/types/unified";

// =============================================================================
// BASE CONFIGURATION
// =============================================================================

const API_BASE = (() => {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:8001/api`;
    }
  }
  return "http://localhost:8001/api";
})();

const WS_BASE = (() => {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${wsProtocol}//${hostname}:8001/api`;
    }
  }
  return "ws://localhost:8001/api";
})();

// =============================================================================
// CORE API CLIENT
// =============================================================================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T = any>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// =============================================================================
// UNIFIED STACK SERVICE (WebSocket-Based)
// =============================================================================

class UnifiedStackService {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // Create WebSocket connection for real-time unified stacks
  createUnifiedStacksStream(
    onData: (stacks: EnhancedUnifiedStack[]) => void,
    onError?: (error: string) => void,
    updateInterval?: number
  ): WebSocket {
    const interval = updateInterval || 3;
    const ws = new WebSocket(`${WS_BASE}/docker/ws/unified-stacks`);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "set_update_interval",
          interval: interval,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "unified_stacks" && message.data?.stacks) {
          onData(message.data.stacks);
        } else if (message.type === "error") {
          onError?.(message.message || "WebSocket error");
        }
      } catch (error) {
        onError?.("Failed to parse WebSocket message");
      }
    };

    ws.onerror = () => {
      onError?.("WebSocket connection error");
    };

    return ws;
  }

  // Health check for unified processing
  async getUnifiedHealth() {
    return this.client.get("/unified-stacks/health");
  }

  // Debug endpoint (development only)
  async getUnifiedDebug() {
    return this.client.get("/unified-stacks/debug");
  }

  // Stack actions (still REST-based for operations)
  async startStack(stackName: string): Promise<StackActionResponse> {
    return this.client.post<StackActionResponse>(
      `/stacks/${encodeURIComponent(stackName)}/start`
    );
  }

  async stopStack(stackName: string): Promise<StackActionResponse> {
    console.log("🔧 UnifiedStackService.stopStack called with:", stackName);
    console.log(
      "🔧 API endpoint will be:",
      `/stacks/${encodeURIComponent(stackName)}/stop`
    );
    console.log("🔧 Base URL:", API_BASE);

    try {
      console.log("🔧 Calling client.post...");
      const result = await this.client.post<StackActionResponse>(
        `/stacks/${encodeURIComponent(stackName)}/stop`
      );
      console.log("🔧 API call successful:", result);
      return result;
    } catch (error) {
      console.error("🔧 API call failed:", error);
      console.error("🔧 Error details:", {
        name: (error as any)?.name || "unknown",
        message: (error as any)?.message || "no message",
        status: (error as any)?.status || "no status",
        stack: (error as any)?.stack || "no stack",
      });
      throw error;
    }
  }

  async restartStack(stackName: string): Promise<StackActionResponse> {
    return this.client.post<StackActionResponse>(
      `/stacks/${encodeURIComponent(stackName)}/restart`
    );
  }
}

// =============================================================================
// CONTAINER SERVICE
// =============================================================================

class ContainerService {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // Container actions
  async startContainer(containerId: string): Promise<StackActionResponse> {
    return this.client.post<StackActionResponse>(
      `/containers/${containerId}/start`
    );
  }

  async stopContainer(containerId: string): Promise<StackActionResponse> {
    return this.client.post<StackActionResponse>(
      `/containers/${containerId}/stop`
    );
  }

  async restartContainer(containerId: string): Promise<StackActionResponse> {
    return this.client.post<StackActionResponse>(
      `/containers/${containerId}/restart`
    );
  }

  // Get container logs
  async getContainerLogs(containerId: string, lines?: number) {
    const linesParam = lines || 100;
    return this.client.get(
      `/containers/${containerId}/logs?lines=${linesParam}`
    );
  }

  // Get container details
  async getContainerDetails(containerId: string) {
    return this.client.get(`/containers/${containerId}`);
  }
}

// =============================================================================
// SYSTEM STATS SERVICE
// =============================================================================

class SystemStatsService {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // Get historical stats
  async getHistoricalStats(
    hours: number = 24
  ): Promise<HistoricalStatsResponse> {
    return this.client.get(`/system/stats/historical?hours=${hours}`);
  }

  // Get formatted chart data
  async getChartData(
    metric: string = "cpu_percent",
    hours: number = 6
  ): Promise<ChartData> {
    return this.client.get(
      `/system/stats/chart-data?metric=${metric}&hours=${hours}`
    );
  }

  // Get available metrics
  async getAvailableMetrics(): Promise<MetricsResponse> {
    return this.client.get("/system/stats/metrics");
  }

  // Get multiple metrics for dashboard
  async getDashboardData(hours: number = 6): Promise<DashboardData> {
    const metrics = ["cpu_percent", "memory_percent", "disk_percent"];
    const promises = metrics.map((metric) =>
      this.getChartData(metric, hours).catch((err) => ({
        metric,
        error: err.message,
        data: [],
      }))
    );

    const results = await Promise.all(promises);

    return {
      timeframe_hours: hours,
      metrics: results.reduce((acc, result) => {
        if ("error" in result) {
          acc[result.metric] = { error: result.error, data: [] };
        } else {
          acc[result.metric] = result;
        }
        return acc;
      }, {} as Record<string, any>),
    };
  }

  // Create live stats WebSocket connection
  createLiveStatsConnection(
    onData: (stats: SystemStat) => void,
    onError?: (error: string) => void
  ): WebSocket {
    const ws = new WebSocket(`${WS_BASE}/system/stats/live`);

    ws.onopen = () => {
      console.log("🔗 Live system stats connected");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "system_stats") {
          onData(message.data);
        } else if (message.type === "error") {
          onError?.(message.message || "System stats error");
        }
      } catch (error) {
        onError?.("Failed to parse system stats message");
      }
    };

    ws.onerror = () => {
      onError?.("System stats WebSocket error");
    };

    return ws;
  }
}

// =============================================================================
// WEBSOCKET SERVICE
// =============================================================================

class WebSocketService {
  private connections: Map<string, WebSocket> = new Map();

  // Create or get existing WebSocket connection
  getConnection(endpoint: string): WebSocket {
    if (this.connections.has(endpoint)) {
      const existing = this.connections.get(endpoint)!;
      if (existing.readyState === WebSocket.OPEN) {
        return existing;
      }
    }

    const ws = new WebSocket(`${WS_BASE}${endpoint}`);
    this.connections.set(endpoint, ws);

    ws.onclose = () => {
      this.connections.delete(endpoint);
    };

    return ws;
  }

  // System stats WebSocket
  connectSystemStats(onData: (stats: any) => void, updateInterval?: number) {
    const interval = updateInterval || 5000;
    const ws = new WebSocket(`${WS_BASE}/system/stats`);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "set_update_interval",
          interval: interval,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "system_stats") {
          onData(message.data);
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    return ws;
  }

  // Docker stats WebSocket
  connectDockerStats(onData: (dockerData: any) => void) {
    const ws = new WebSocket(`${WS_BASE}/docker/stats`);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (
          message.type === "docker_containers" ||
          message.type === "docker_info"
        ) {
          onData(message);
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    return ws;
  }

  // Unified stacks WebSocket (primary data source)
  connectUnifiedStacks(
    onData: (stacks: EnhancedUnifiedStack[]) => void,
    onError?: (error: string) => void,
    updateInterval?: number
  ) {
    const interval = updateInterval || 3;
    const ws = new WebSocket(`${WS_BASE}/docker/ws/unified-stacks`);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "set_update_interval",
          interval: interval,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "unified_stacks" && message.data?.stacks) {
          onData(message.data.stacks);
        } else if (message.type === "error") {
          onError?.(message.message || "WebSocket error");
        }
      } catch (error) {
        onError?.("Failed to parse WebSocket message");
      }
    };

    ws.onerror = () => {
      onError?.("WebSocket connection error");
    };

    return ws;
  }
}

// =============================================================================
// MAIN API SERVICE CLASS
// =============================================================================

class NewApiService {
  public client: ApiClient;
  public stacks: UnifiedStackService;
  public containers: ContainerService;
  public systemStats: SystemStatsService;
  public websockets: WebSocketService;

  constructor() {
    this.client = new ApiClient(API_BASE);
    this.stacks = new UnifiedStackService(this.client);
    this.containers = new ContainerService(this.client);
    this.systemStats = new SystemStatsService(this.client);
    this.websockets = new WebSocketService();
  }

  // Convenience method for creating unified stacks stream
  createUnifiedStacksStream(
    onData: (stacks: EnhancedUnifiedStack[]) => void,
    onError?: (error: string) => void,
    updateInterval?: number
  ) {
    return this.stacks.createUnifiedStacksStream(
      onData,
      onError,
      updateInterval
    );
  }

  // Convenience method for creating system stats stream
  createSystemStatsStream(
    onData: (stats: SystemStat) => void,
    onError?: (error: string) => void
  ) {
    return this.systemStats.createLiveStatsConnection(onData, onError);
  }
}

// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================

export const newApiService = new NewApiService();
export default newApiService;

// Export types for convenience
export type {
  EnhancedUnifiedStack,
  StackActionResponse,
  SystemStat,
  ChartData,
};
