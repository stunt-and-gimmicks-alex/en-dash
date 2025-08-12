// frontend/src/hooks/v06-useStacks.ts
// Clean stacks hook using v06 unified WebSocket service
// Replaces useWebSocketUnifiedStacks with simpler API and fixed binary frame handling

import { useState, useEffect, useRef, useCallback } from "react";
import type { EnhancedUnifiedStack } from "@/types/unified";
import v06WebSocketService from "@/services/v06-unifiedWebSocketService";

interface StacksMessage {
  type: "unified_stacks" | "error" | "config_updated" | "pong";
  data?: {
    available: boolean;
    stacks: EnhancedUnifiedStack[];
    total_stacks: number;
    processing_time: string;
    error?: string;
    message?: string;
  };
  message?: string;
  timestamp: string;
  connection_count?: number;
}

interface UseStacksOptions {
  updateInterval?: number;
  autoConnect?: boolean;
}

interface UseStacksResult {
  // Data
  stacks: EnhancedUnifiedStack[];
  connected: boolean;
  connecting: boolean;
  error: string | null;
  totalStacks: number;
  lastUpdated: string | null;
  connectionCount: number;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  setUpdateInterval: (interval: number) => void;
  ping: () => void;

  // Service stats for debugging
  serviceStats: () => any;
}

export const useStacks = (options: UseStacksOptions = {}): UseStacksResult => {
  const { updateInterval = 3, autoConnect = true } = options;

  // State
  const [stacks, setStacks] = useState<EnhancedUnifiedStack[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalStacks, setTotalStacks] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);

  // Refs for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isSubscribedRef = useRef(false);

  // Handle stacks messages from WebSocket
  const handleStacksMessage = useCallback((data: any, message: any) => {
    console.log("📦 v06-useStacks received:", {
      type: message.type,
      stackCount: data?.stacks?.length,
      timestamp: message.timestamp,
    });

    console.log("🔍 Full message data:", message.data);
    console.log("🔍 Data available:", data?.available);
    console.log("🔍 Stacks array:", data?.stacks);

    switch (message.type) {
      case "unified_stacks":
        if (data?.available && data.stacks) {
          setStacks(data.stacks);
          setTotalStacks(data.total_stacks || 0);
          setLastUpdated(message.timestamp);
          setConnectionCount(message.connection_count || 0);
          setError(null);

          // ADD THIS DEBUG LOG:
          console.log(
            "🔍 State being set - stacks length:",
            data.stacks.length
          );
          console.log("🔍 First stack name:", data.stacks[0]?.name);

          console.log(`✅ v06-useStacks updated: ${data.stacks.length} stacks`);
        } else if (data?.error) {
          console.error("❌ v06-useStacks data error:", data.error);
          setError(data.error);
        }
        break;

      case "error":
        console.error("❌ v06-useStacks WebSocket error:", message.message);
        setError(message.message || "Unknown WebSocket error");
        break;

      case "config_updated":
        console.log("🔄 v06-useStacks config updated:", message.message);
        // Could trigger a refresh here if needed
        break;

      case "pong":
        console.log("🏓 v06-useStacks ping successful");
        break;

      default:
        console.log("📭 v06-useStacks unknown message type:", message.type);
        break;
    }
  }, []);

  // Actions
  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      setError(null);
      await v06WebSocketService.connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    v06WebSocketService.disconnect();
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
      isSubscribedRef.current = false;
    }
  }, []);

  const ping = useCallback(() => {
    v06WebSocketService.ping();
  }, []);

  const setUpdateIntervalWrapper = useCallback((interval: number) => {
    v06WebSocketService.setUpdateInterval(interval);
  }, []);

  const serviceStats = useCallback(() => {
    return v06WebSocketService.getStats();
  }, []);

  // Set up WebSocket service event handlers and subscription
  useEffect(() => {
    console.log("🔧 v06-useStacks setting up WebSocket subscription");

    // Service event handlers
    const handleConnected = () => {
      console.log("🔗 v06-useStacks: Service connected");
      setConnected(true);
      setConnecting(false);
      setError(null);

      // Subscribe to unified_stacks topic
      if (!isSubscribedRef.current) {
        console.log("📡 v06-useStacks: Subscribing to unified_stacks topic");
        unsubscribeRef.current = v06WebSocketService.subscribe(
          "unified_stacks",
          handleStacksMessage
        );
        isSubscribedRef.current = true;
      }
    };

    const handleDisconnected = () => {
      console.log("🔌 v06-useStacks: Service disconnected");
      setConnected(false);
      setConnecting(false);
    };

    const handleConnecting = () => {
      console.log("⏳ v06-useStacks: Service connecting");
      setConnecting(true);
      setError(null);
    };

    const handleError = (err: Error) => {
      console.error("❌ v06-useStacks: Service error:", err.message);
      setError(err.message);
      setConnecting(false);
      setConnected(false);
    };

    const handleMaxReconnectAttempts = () => {
      console.error("❌ v06-useStacks: Max reconnection attempts reached");
      setError("Max reconnection attempts reached");
      setConnecting(false);
      setConnected(false);
    };

    // Register service event listeners
    v06WebSocketService.on("connected", handleConnected);
    v06WebSocketService.on("disconnected", handleDisconnected);
    v06WebSocketService.on("connecting", handleConnecting);
    v06WebSocketService.on("error", handleError);
    v06WebSocketService.on(
      "maxReconnectAttemptsReached",
      handleMaxReconnectAttempts
    );

    // Set initial state from service
    const stats = v06WebSocketService.getStats();
    setConnected(stats.connected);
    setConnecting(stats.connecting);
    setConnectionCount(stats.connectionCount);

    // Auto-connect if enabled and not already connected
    if (autoConnect && !stats.connected && !stats.connecting) {
      console.log("🚀 v06-useStacks: Auto-connecting");
      connect();
    }

    // Set update interval
    v06WebSocketService.setUpdateInterval(updateInterval);

    return () => {
      console.log("🧹 v06-useStacks: Cleaning up");

      // Remove service event listeners
      v06WebSocketService.off("connected", handleConnected);
      v06WebSocketService.off("disconnected", handleDisconnected);
      v06WebSocketService.off("connecting", handleConnecting);
      v06WebSocketService.off("error", handleError);
      v06WebSocketService.off(
        "maxReconnectAttemptsReached",
        handleMaxReconnectAttempts
      );

      // Unsubscribe from topic
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [autoConnect, connect, updateInterval, handleStacksMessage]);

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
    setUpdateInterval: setUpdateIntervalWrapper,
    ping,
    serviceStats,
  };
};

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Get a specific stack by name
 */
export const useStack = (stackName: string) => {
  const { stacks, connected, connecting, error } = useStacks();

  const stack = stacks.find((s) => s.name === stackName) || null;

  return {
    stack,
    loading: !connected && !error,
    error,
    connected,
    connecting,
  };
};

/**
 * Get containers from a specific stack
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
 * Get aggregated configs from a specific stack
 */
export const useStackAggregatedConfigs = (stackName: string) => {
  const { stack } = useStack(stackName);

  return {
    aggregatedConfigs: stack?.aggregated_configs || null,
    loading: !stack,
    error: stack ? null : "Stack not found",
  };
};

export default useStacks;
