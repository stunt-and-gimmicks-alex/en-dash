// frontend/src/services/newApiServices.ts
// Clean, modern API service layer using unified backend + WebSockets

import { type UnifiedStack, type StackActionResponse } from "@/types/unified";

// =============================================================================
// BASE CONFIGURATION
// =============================================================================

const API_BASE = "http://localhost:8001/api/docker";
const WS_BASE = "ws://localhost:8001/api";

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

      return await response.json();
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, data?: any): Promise<T> {
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
    return this.client.post<StackActionResponse>(
      `/stacks/${encodeURIComponent(stackName)}/stop`
    );
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

  constructor() {
    this.client = new ModernApiClient();
    this.stacks = new UnifiedStackService(this.client);
    this.containers = new ContainerService(this.client);
    this.websockets = new WebSocketService();
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
// EXPORT SINGLETON INSTANCE
// =============================================================================

export const newApiService = new NewApiService();
export default newApiService;

// Export types for convenience
export type { UnifiedStack, StackActionResponse };
