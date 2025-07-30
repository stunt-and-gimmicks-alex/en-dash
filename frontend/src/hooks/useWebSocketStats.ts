/**
 * React hooks for WebSocket-based real-time stats
 */

import { useState, useEffect, useCallback, useRef } from "react";

// Types for system stats
interface SystemStats {
  cpu: {
    percent_per_core: number[];
    percent_total: number;
    frequency: {
      current: number;
      min: number;
      max: number;
    };
    load_average: {
      "1min": number;
      "5min": number;
      "15min": number;
    };
    count: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percent: number;
    cached: number;
    buffers: number;
  };
  swap: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  disk_io: {
    read_bytes: number;
    write_bytes: number;
    read_count: number;
    write_count: number;
  };
  network_io: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
  };
  processes: {
    total: number;
  };
}

interface DockerContainer {
  id: string;
  short_id: string;
  name: string;
  status: string;
  state: string;
  image: string;
  created: string;
  labels: Record<string, string>;
  compose_project?: string;
  compose_service?: string;
  stats?: {
    cpu_percent: number;
    memory: {
      usage: number;
      limit: number;
      percent: number;
    };
    network: {
      rx_bytes: number;
      tx_bytes: number;
    };
    block_io: {
      read_bytes: number;
      write_bytes: number;
    };
  };
}

// Hook for system stats WebSocket
export const useSystemStatsWebSocket = (
  updateInterval: number = 1.0,
  autoConnect: boolean = true
) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const wsUrl = `ws://localhost:8001/api/ws/system/stats`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("Connected to system stats WebSocket");
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Set update interval
        ws.current?.send(
          JSON.stringify({
            type: "set_update_interval",
            interval: updateInterval,
          })
        );
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case "system_stats":
              setStats(message.data);
              setLastUpdate(new Date(message.timestamp));
              break;
            case "error":
              setError(message.message);
              break;
            case "config_updated":
              console.log("WebSocket config updated:", message.message);
              break;
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.current.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
      };

      ws.current.onclose = (event) => {
        console.log("System stats WebSocket closed:", event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect if not a clean close
        if (
          event.code !== 1000 &&
          reconnectAttempts.current < maxReconnectAttempts
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          reconnectAttempts.current++;

          console.log(
            `Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`
          );
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.error("Error creating WebSocket connection:", err);
      setError("Failed to create WebSocket connection");
    }
  }, [updateInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (ws.current) {
      ws.current.close(1000, "User disconnected");
      ws.current = null;
    }

    setIsConnected(false);
    setStats(null);
  }, []);

  const setUpdateInterval = useCallback((interval: number) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "set_update_interval",
          interval: interval,
        })
      );
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    stats,
    isConnected,
    error,
    lastUpdate,
    connect,
    disconnect,
    setUpdateInterval,
  };
};

// Hook for Docker stats WebSocket
export const useDockerStatsWebSocket = (
  updateInterval: number = 2.0,
  autoConnect: boolean = true
) => {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [dockerInfo, setDockerInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `ws://localhost:8001/api/ws/docker/stats`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("Connected to Docker stats WebSocket");
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Set update interval
        ws.current?.send(
          JSON.stringify({
            type: "set_update_interval",
            interval: updateInterval,
          })
        );
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case "docker_containers":
              setContainers(message.data);
              setLastUpdate(new Date(message.timestamp));
              break;
            case "docker_info":
              setDockerInfo(message.data);
              break;
            case "container_action_result":
              console.log("Container action result:", message.data);
              // You could add a callback here for UI updates
              break;
            case "error":
              setError(message.message);
              break;
            case "config_updated":
              console.log("Docker WebSocket config updated:", message.message);
              break;
          }
        } catch (err) {
          console.error("Error parsing Docker WebSocket message:", err);
        }
      };

      ws.current.onerror = (event) => {
        console.error("Docker WebSocket error:", event);
        setError("Docker WebSocket connection error");
      };

      ws.current.onclose = (event) => {
        console.log("Docker WebSocket closed:", event.code, event.reason);
        setIsConnected(false);

        if (
          event.code !== 1000 &&
          reconnectAttempts.current < maxReconnectAttempts
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          reconnectAttempts.current++;

          console.log(
            `Docker WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`
          );
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.error("Error creating Docker WebSocket connection:", err);
      setError("Failed to create Docker WebSocket connection");
    }
  }, [updateInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (ws.current) {
      ws.current.close(1000, "User disconnected");
      ws.current = null;
    }

    setIsConnected(false);
    setContainers([]);
    setDockerInfo(null);
  }, []);

  const performContainerAction = useCallback(
    (containerId: string, action: "start" | "stop" | "restart") => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: "container_action",
            container_id: containerId,
            action: action,
          })
        );
      } else {
        console.error(
          "WebSocket not connected, cannot perform container action"
        );
      }
    },
    []
  );

  const setUpdateInterval = useCallback((interval: number) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "set_update_interval",
          interval: interval,
        })
      );
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    containers,
    dockerInfo,
    isConnected,
    error,
    lastUpdate,
    connect,
    disconnect,
    performContainerAction,
    setUpdateInterval,
  };
};

// Combined hook for both system and Docker stats
export const useRealTimeStats = (
  systemInterval: number = 1.0,
  dockerInterval: number = 2.0
) => {
  const systemStats = useSystemStatsWebSocket(systemInterval);
  const dockerStats = useDockerStatsWebSocket(dockerInterval);

  return {
    system: systemStats,
    docker: dockerStats,
    isConnected: systemStats.isConnected && dockerStats.isConnected,
    hasErrors: !!(systemStats.error || dockerStats.error),
    errors: {
      system: systemStats.error,
      docker: dockerStats.error,
    },
  };
};
