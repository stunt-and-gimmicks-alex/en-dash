// frontend/src/hooks/useWebSocketUnifiedStacks.ts
// Real-time unified stack data via WebSocket with unified backend processing
// Updated to use EnhancedUnifiedStack throughout

import { useState, useEffect, useRef, useCallback } from "react";
import type { EnhancedUnifiedStack } from "@/types/unified";

interface WebSocketUnifiedStacksResponse {
  type: "unified_stacks" | "error" | "config_updated" | "pong";
  data?: {
    available: boolean;
    stacks: EnhancedUnifiedStack[]; // Changed from UnifiedStack[]
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
  stacks: EnhancedUnifiedStack[]; // Changed from UnifiedStack[]
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
    const { hostname } = window.location;
    const wsPort = "8002"; // Picows server port
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `ws://${hostname}:${wsPort}/`;
    }
  }
  return "ws://localhost:8002/";
};

const WS_URL = getWsBaseUrl();

export const useWebSocketUnifiedStacks = (
  options: UseWebSocketUnifiedStacksOptions = {}
): UseWebSocketUnifiedStacksResult => {
  const {
    updateInterval = 3,
    autoConnect = true,
    reconnectOnError = true,
    maxReconnectAttempts = 5,
  } = options;

  // State - Updated to use EnhancedUnifiedStack
  const [stacks, setStacks] = useState<EnhancedUnifiedStack[]>([]);
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

        // Subscribe to unified_stacks topic (NEW)
        ws.send(
          JSON.stringify({
            type: "subscribe",
            topic: "unified_stacks",
          })
        );

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
          reconnectAttempts.current++;
          console.log(
            `🔄 Attempting reconnect ${reconnectAttempts.current}/${maxReconnectAttempts}`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000));
        }
      };
    } catch (err) {
      console.error("Error creating WebSocket connection:", err);
      setError("Failed to create WebSocket connection");
      setConnecting(false);
    }
  }, [updateInterval, reconnectOnError, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }

    setConnected(false);
    setConnecting(false);
    reconnectAttempts.current = 0;
  }, []);

  const setUpdateInterval = useCallback((interval: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "set_update_interval",
          interval,
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
// CONVENIENCE HOOKS - Updated to use EnhancedUnifiedStack
// =============================================================================

/**
 * Simple hook for basic unified stacks usage
 * Now returns EnhancedUnifiedStack[] with aggregatedConfigs
 */
export const useStack = () => {
  const { stacks, connected, error } = useStacks();

  return {
    stacks, // Now EnhancedUnifiedStack[]
    loading: !connected && !error,
    error: error,
    connected,
  };
};

/**
 * Hook for getting a specific stack by name
 * Now returns EnhancedUnifiedStack | null with aggregatedConfigs
 */
export const useUnifiedStack = (stackName: string) => {
  const { stacks, connected, error } = useStacks();

  const stack = stacks.find((s) => s.name === stackName) || null;

  return {
    stack, // Now EnhancedUnifiedStack | null
    loading: !connected && !error,
    error,
    connected,
  };
};

/**
 * Hook for getting containers from a specific stack
 */
export const useStackContainers = (stackName: string) => {
  const { stack } = useStack(stackName);

  return {
    containers: stack?.containers?.containers || [],
    loading: !stack,
    totalContainers: stack?.containers?.total || 0,
    runningContainers: stack?.stats?.containers?.running || 0,
  };
};

/**
 * NEW: Hook for getting aggregated configs from a specific stack
 */
export const useStackAggregatedConfigs = (stackName: string) => {
  const { stack } = useStack(stackName);

  return {
    aggregatedConfigs: stack?.aggregated_configs || null,
    loading: !stack,
    error: stack ? null : "Stack not found",
  };
};

export default useWebSocketUnifiedStacks;
