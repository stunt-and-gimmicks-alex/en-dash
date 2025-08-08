// frontend/src/hooks/useWebSocketUnifiedStacks.ts
// Real-time unified stack data via WebSocket with unified backend processing

import { useState, useEffect, useRef, useCallback } from "react";
import type { UnifiedStack } from "@/types/unified";

interface WebSocketUnifiedStacksResponse {
  type: "unified_stacks" | "error" | "config_updated" | "pong";
  data?: {
    available: boolean;
    stacks: UnifiedStack[];
    total_stacks: number;
    processing_time: string;
    error?: string;
    message?: string;
  };
  message?: string;
  timestamp: string;
  connection_count?: number;
}

interface UseWebSocketUnifiedStacksOptions {
  updateInterval?: number; // seconds
  autoConnect?: boolean;
  reconnectOnError?: boolean;
  maxReconnectAttempts?: number;
}

interface UseWebSocketUnifiedStacksResult {
  stacks: UnifiedStack[];
  connected: boolean;
  connecting: boolean;
  error: string | null;
  totalStacks: number;
  lastUpdated: string | null;
  connectionCount: number;
  // Actions
  connect: () => void;
  disconnect: () => void;
  setUpdateInterval: (interval: number) => void;
  ping: () => void;
}

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

const WS_BASE = getWsBaseUrl();

const WS_URL = WS_BASE + "/docker/ws/unified-stacks";

export const useWebSocketUnifiedStacks = (
  options: UseWebSocketUnifiedStacksOptions = {}
): UseWebSocketUnifiedStacksResult => {
  const {
    updateInterval = 3,
    autoConnect = true,
    reconnectOnError = true,
    maxReconnectAttempts = 5,
  } = options;

  // State
  const [stacks, setStacks] = useState<UnifiedStack[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalStacks, setTotalStacks] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // Connection management
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      setConnecting(true);
      setError(null);

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🔗 Unified stacks WebSocket connected");
        setConnected(true);
        setConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;

        // Set update interval
        ws.send(
          JSON.stringify({
            type: "set_update_interval",
            interval: updateInterval,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketUnifiedStacksResponse = JSON.parse(
            event.data
          );

          switch (message.type) {
            case "unified_stacks":
              if (message.data?.available && message.data.stacks) {
                setStacks(message.data.stacks);
                setTotalStacks(message.data.total_stacks || 0);
                setLastUpdated(message.timestamp);
                setConnectionCount(message.connection_count || 0);
                setError(null);
              } else if (message.data?.error) {
                setError(message.data.error);
              }
              break;

            case "error":
              console.error("WebSocket error:", message.message);
              setError(message.message || "Unknown WebSocket error");
              break;

            case "config_updated":
              console.log("Config updated:", message.message);
              break;

            case "pong":
              console.log("WebSocket ping successful");
              break;
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
          setError("Error parsing server response");
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
        setConnecting(false);
      };

      ws.onclose = (event) => {
        console.log(
          "Unified stacks WebSocket closed:",
          event.code,
          event.reason
        );
        setConnected(false);
        setConnecting(false);
        wsRef.current = null;

        // Attempt to reconnect if not a clean close and reconnect is enabled
        if (
          reconnectOnError &&
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

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError("Max reconnection attempts reached");
        }
      };
    } catch (err) {
      console.error("Error creating WebSocket connection:", err);
      setError("Failed to create WebSocket connection");
      setConnecting(false);
    }
  }, [updateInterval, reconnectOnError, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    setConnected(false);
    setConnecting(false);
  }, []);

  // Actions
  const setUpdateInterval = useCallback((interval: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "set_update_interval",
          interval: Math.max(1, Math.min(10, interval)), // Clamp between 1-10 seconds
        })
      );
    }
  }, []);

  const ping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "ping",
        })
      );
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Update interval change
  useEffect(() => {
    setUpdateInterval(updateInterval);
  }, [updateInterval, setUpdateInterval]);

  return {
    // Data
    stacks,
    connected,
    connecting,
    error,
    totalStacks,
    lastUpdated,
    connectionCount,

    // Actions
    connect,
    disconnect,
    setUpdateInterval,
    ping,
  };
};

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Simple hook for basic unified stacks usage
 */
export const useUnifiedStacks = () => {
  const { stacks, connected, error } = useWebSocketUnifiedStacks();

  return {
    stacks,
    loading: !connected && !error,
    error: error,
    connected,
  };
};

/**
 * Hook for getting a specific stack by name
 */
export const useUnifiedStack = (stackName: string) => {
  const { stacks, connected, error } = useWebSocketUnifiedStacks();

  const stack = stacks.find((s) => s.name === stackName) || null;

  return {
    stack,
    loading: !connected && !error,
    error,
    connected,
  };
};

/**
 * Hook for getting containers from a specific stack
 */
export const useStackContainers = (stackName: string) => {
  const { stack } = useUnifiedStack(stackName);

  return {
    containers: stack?.containers?.containers || [],
    loading: !stack,
    totalContainers: stack?.containers?.total || 0,
    runningContainers: stack?.stats?.containers?.running || 0,
  };
};

export default useWebSocketUnifiedStacks;
