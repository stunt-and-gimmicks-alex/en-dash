// frontend/src/services/newApiServices.ts
// Clean, modern API service layer using unified backend + WebSockets

import {
  type UnifiedStack,
  type StackActionResponse,
  type SystemStat,
  type ChartDataPoint,
  type DashboardData,
  type HistoricalStatsResponse,
  type ChartData,
  type MetricsResponse,
} from "@/types/unified";

// =============================================================================
// BASE CONFIGURATION
// =============================================================================

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

const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const apiProtocol = protocol === "https:" ? "https:" : "http:";
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${apiProtocol}//${hostname}:8001/api/docker`;
    }
  }
  return "http://localhost:8001/api/docker";
};

const WS_BASE = getWsBaseUrl();
const API_BASE = getApiBaseUrl();

// =============================================================================
// CORE API CLIENT
// =============================================================================

class ModernApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log("🌐 Making request to:", url);
    console.log("🌐 Options:", options);

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      console.log("🌐 Response status:", response.status);
      console.log("🌐 Response OK:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🌐 Response error text:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("🌐 Response data:", result);
      return result;
    } catch (error) {
      console.error("🌐 Request failed:", error);
      console.error(`🌐 API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    console.log("🌐 ModernApiClient.post called with:", endpoint);
    console.log("🌐 Full URL:", `${this.baseUrl}${endpoint}`);
    console.log("🌐 Data:", data);

    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// =============================================================================
// UNIFIED STACK SERVICE (WebSocket-Based)
// =============================================================================

class UnifiedStackService {
  private client: ModernApiClient;

  constructor(client: ModernApiClient) {
    this.client = client;
  }

  // WebSocket connection for real-time unified stacks
  createUnifiedStacksConnection(
    onData: (stacks: UnifiedStack[]) => void,
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
    console.log("🔧 Base URL:", API_BASE); // Use the constant instead

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
    onData: (stacks: UnifiedStack[]) => void,
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

  // Close specific connection
  closeConnection(endpoint: string) {
    const ws = this.connections.get(endpoint);
    if (ws) {
      ws.close();
      this.connections.delete(endpoint);
    }
  }

  // Close all connections
  closeAllConnections() {
    this.connections.forEach((ws) => ws.close());
    this.connections.clear();
  }
}

// =============================================================================
// CONTAINER SERVICE
// =============================================================================

class ContainerService {
  private client: ModernApiClient;

  constructor(client: ModernApiClient) {
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
// MAIN API SERVICE CLASS
// =============================================================================

class NewApiService {
  private client: ModernApiClient;
  public stacks: UnifiedStackService;
  public containers: ContainerService;
  public websockets: WebSocketService;
  public systemStats: SystemStatsService;

  constructor() {
    this.client = new ModernApiClient();
    this.stacks = new UnifiedStackService(this.client);
    this.containers = new ContainerService(this.client);
    this.websockets = new WebSocketService();
    this.systemStats = new SystemStatsService(this.client); // Add this line
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get("/health");
      return true;
    } catch {
      return false;
    }
  }

  // System stats (REST fallback)
  async getSystemStats() {
    return this.client.get("/system/stats");
  }

  // Docker stats summary (REST fallback)
  async getDockerStats() {
    return this.client.get("/stats");
  }

  // Main method: Get real-time unified stacks
  createUnifiedStacksStream(
    onData: (stacks: UnifiedStack[]) => void,
    onError?: (error: string) => void,
    updateInterval?: number
  ) {
    return this.stacks.createUnifiedStacksConnection(
      onData,
      onError,
      updateInterval
    );
  }
}

// =============================================================================
// SYSTEM STATS SERVICE (Historical Data)
// =============================================================================

class SystemStatsService {
  private client: ModernApiClient;

  constructor(client: ModernApiClient) {
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
}

// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================

export const newApiService = new NewApiService();
export default newApiService;

// Export types for convenience
export type { UnifiedStack, StackActionResponse };
