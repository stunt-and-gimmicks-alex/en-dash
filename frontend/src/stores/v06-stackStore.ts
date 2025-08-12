// frontend/src/stores/v06-stackStore.ts
// Single source of truth for all stack data and actions using Zustand + WebSocket
// Eliminates race conditions and provides clean, shared state management

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  EnhancedUnifiedStack,
  StackActionResponse,
} from "@/types/unified";
import v06WebSocketService from "@/services/v06-unifiedWebSocketService";

interface StackAction {
  stackName: string;
  action: "start" | "stop" | "restart";
  timestamp: Date;
  success: boolean;
  error?: string;
}

interface StackStore {
  // WebSocket Connection State
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastUpdated: string | null;
  connectionCount: number;

  // Stack Data
  stacks: EnhancedUnifiedStack[];
  totalStacks: number;

  // Action State
  isPerformingAction: boolean;
  lastAction: StackAction | null;
  actionHistory: StackAction[];

  // Private subscription management
  _isSubscribed: boolean;
  _unsubscribe: (() => void) | null;

  // WebSocket Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: () => void;
  unsubscribe: () => void;
  ping: () => void;
  setUpdateInterval: (interval: number) => void;

  // Stack Actions (REST API)
  startStack: (stackName: string) => Promise<boolean>;
  stopStack: (stackName: string) => Promise<boolean>;
  restartStack: (stackName: string) => Promise<boolean>;

  // Internal action performer
  _performStackAction: (
    stackName: string,
    action: "start" | "stop" | "restart"
  ) => Promise<boolean>;

  // Utility Actions
  clearActionHistory: () => void;

  // Getters (computed values)
  getStack: (stackName: string) => EnhancedUnifiedStack | null;
  getStackContainers: (stackName: string) => any[];
  getStackActionHistory: (stackName: string) => StackAction[];
  getRunningStacks: () => EnhancedUnifiedStack[];
  getStoppedStacks: () => EnhancedUnifiedStack[];
  getPartialStacks: () => EnhancedUnifiedStack[];

  // Internal state setters (called by WebSocket handlers)
  _setConnectionState: (
    connected: boolean,
    connecting: boolean,
    error?: string
  ) => void;
  _setStackData: (
    stacks: EnhancedUnifiedStack[],
    totalStacks: number,
    timestamp: string,
    connectionCount: number
  ) => void;
  _setError: (error: string) => void;
}

// API configuration
const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:8001/api`;
    }
  }
  return "http://localhost:8001/api";
};

export const useStackStore = create<StackStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    connected: false,
    connecting: false,
    error: null,
    lastUpdated: null,
    connectionCount: 0,
    stacks: [],
    totalStacks: 0,
    isPerformingAction: false,
    lastAction: null,
    actionHistory: [],
    _isSubscribed: false,
    _unsubscribe: null,

    // WebSocket Actions
    connect: async () => {
      const state = get();
      if (state.connected || state.connecting) return;

      try {
        set({ connecting: true, error: null });
        console.log("🔗 v06-stackStore: Connecting to WebSocket");

        await v06WebSocketService.connect();

        // Auto-subscribe after connection
        get().subscribe();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Connection failed";
        console.error("❌ v06-stackStore: Connection failed:", errorMessage);
        set({ error: errorMessage, connecting: false });
      }
    },

    disconnect: () => {
      console.log("🔌 v06-stackStore: Disconnecting");
      get().unsubscribe();
      v06WebSocketService.disconnect();
      set({ connected: false, connecting: false });
    },

    subscribe: () => {
      const state = get();
      if (state._isSubscribed) {
        console.log("📡 v06-stackStore: Already subscribed");
        return;
      }

      console.log("📡 v06-stackStore: Subscribing to unified_stacks topic");

      // Single WebSocket message handler
      const handleStacksMessage = (data: any, message: any) => {
        console.log("📦 v06-stackStore received:", {
          type: message.type,
          stackCount: data?.stacks?.length,
          timestamp: message.timestamp,
        });

        // DEBUG: Add detailed logging to understand the data structure
        console.log("🔍 v06-stackStore - Full message:", message);
        console.log("🔍 v06-stackStore - Data parameter:", data);
        console.log("🔍 v06-stackStore - message.data:", message.data);

        switch (message.type) {
          case "unified_stacks":
            // Try both data patterns since there might be inconsistency
            const stacksData = data || message.data;
            console.log("🔍 v06-stackStore - Using stacksData:", stacksData);
            console.log(
              "🔍 v06-stackStore - stacksData.available:",
              stacksData?.available
            );
            console.log(
              "🔍 v06-stackStore - stacksData.stacks:",
              stacksData?.stacks
            );

            if (stacksData?.available && stacksData.stacks) {
              // FIXED: Just pass through the data - backend already provides status field
              get()._setStackData(
                stacksData.stacks,
                stacksData.total_stacks || 0,
                message.timestamp,
                message.connection_count || 0
              );
              console.log(
                `✅ v06-stackStore: Updated ${stacksData.stacks.length} stacks (backend provides status field)`
              );
            } else if (stacksData?.error) {
              console.error("❌ v06-stackStore: Data error:", stacksData.error);
              get()._setError(stacksData.error);
            } else {
              console.warn("❌ v06-stackStore: No valid stacks data found:", {
                hasData: !!data,
                hasMessageData: !!message.data,
                available: stacksData?.available,
                hasStacks: !!stacksData?.stacks,
                stacksLength: stacksData?.stacks?.length,
              });
            }
            break;

          case "error":
            console.error(
              "❌ v06-stackStore: WebSocket error:",
              message.message
            );
            get()._setError(message.message || "Unknown WebSocket error");
            break;

          case "config_updated":
            console.log("🔄 v06-stackStore: Config updated:", message.message);
            break;

          case "pong":
            console.log("🏓 v06-stackStore: Ping successful");
            break;

          default:
            console.log(
              "📭 v06-stackStore: Unknown message type:",
              message.type
            );
            break;
        }
      };

      // Subscribe to WebSocket service events
      const handleConnected = () => {
        console.log("🔗 v06-stackStore: WebSocket connected");
        get()._setConnectionState(true, false);
      };

      const handleDisconnected = () => {
        console.log("🔌 v06-stackStore: WebSocket disconnected");
        get()._setConnectionState(false, false);
      };

      const handleConnecting = () => {
        console.log("⏳ v06-stackStore: WebSocket connecting");
        get()._setConnectionState(false, true);
      };

      const handleError = (err: Error) => {
        console.error("❌ v06-stackStore: WebSocket error:", err.message);
        get()._setConnectionState(false, false, err.message);
      };

      // Register all event listeners
      v06WebSocketService.on("connected", handleConnected);
      v06WebSocketService.on("disconnected", handleDisconnected);
      v06WebSocketService.on("connecting", handleConnecting);
      v06WebSocketService.on("error", handleError);

      // Subscribe to unified_stacks topic
      const unsubscribeFromTopic = v06WebSocketService.subscribe(
        "unified_stacks",
        handleStacksMessage
      );

      // Create composite unsubscribe function
      const unsubscribeAll = () => {
        console.log("🔇 v06-stackStore: Unsubscribing from all events");

        // Unsubscribe from topic
        if (unsubscribeFromTopic) {
          unsubscribeFromTopic();
        }

        // Remove event listeners
        v06WebSocketService.off("connected", handleConnected);
        v06WebSocketService.off("disconnected", handleDisconnected);
        v06WebSocketService.off("connecting", handleConnecting);
        v06WebSocketService.off("error", handleError);
      };

      // Store the unsubscribe function and mark as subscribed
      set({
        _isSubscribed: true,
        _unsubscribe: unsubscribeAll,
      });
    },

    unsubscribe: () => {
      const state = get();
      if (!state._isSubscribed || !state._unsubscribe) {
        console.log(
          "📭 v06-stackStore: Not subscribed, nothing to unsubscribe"
        );
        return;
      }

      state._unsubscribe();
      set({ _isSubscribed: false, _unsubscribe: null });
    },

    ping: () => {
      console.log("🏓 v06-stackStore: Sending ping");
      v06WebSocketService.ping();
    },

    setUpdateInterval: (interval: number) => {
      console.log(`⏰ v06-stackStore: Setting update interval to ${interval}s`);
      v06WebSocketService.setUpdateInterval(interval);
    },

    // Stack Actions
    startStack: (stackName: string) =>
      get()._performStackAction(stackName, "start"),

    stopStack: (stackName: string) =>
      get()._performStackAction(stackName, "stop"),

    restartStack: (stackName: string) =>
      get()._performStackAction(stackName, "restart"),

    // Generic action performer
    _performStackAction: async (
      stackName: string,
      action: "start" | "stop" | "restart"
    ): Promise<boolean> => {
      const state = get();
      if (state.isPerformingAction) {
        console.warn(
          `v06-stackStore: Action already in progress, skipping ${action} for ${stackName}`
        );
        return false;
      }

      set({ isPerformingAction: true });

      const actionRecord: StackAction = {
        stackName,
        action,
        timestamp: new Date(),
        success: false,
      };

      try {
        console.log(`🎬 v06-stackStore: ${action} ${stackName}`);

        const response = await fetch(
          `${getApiBaseUrl()}/docker/stacks/${stackName}/${action}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: StackActionResponse = await response.json();

        if (result.success) {
          actionRecord.success = true;
          console.log(`✅ v06-stackStore: ${action} ${stackName} succeeded`);
        } else {
          actionRecord.error = result.message || `${action} operation failed`;
          console.error(
            `❌ v06-stackStore: ${action} ${stackName} failed:`,
            actionRecord.error
          );
        }

        return result.success;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : `Failed to ${action} stack`;
        actionRecord.error = errorMessage;
        console.error(
          `❌ v06-stackStore: ${action} ${stackName} error:`,
          errorMessage
        );
        return false;
      } finally {
        // Update action state
        set((state) => ({
          isPerformingAction: false,
          lastAction: actionRecord,
          actionHistory: [...state.actionHistory, actionRecord],
        }));

        console.log(`🏁 v06-stackStore: ${action} ${stackName} completed`, {
          success: actionRecord.success,
          error: actionRecord.error,
        });
      }
    },

    // Utility Actions
    clearActionHistory: () => {
      console.log("🧹 v06-stackStore: Clearing action history");
      set({ actionHistory: [], lastAction: null });
    },

    // Getters
    getStack: (stackName: string) => {
      const state = get();
      return state.stacks.find((stack) => stack.name === stackName) || null;
    },

    getStackContainers: (stackName: string) => {
      const stack = get().getStack(stackName);
      return stack?.containers?.containers || [];
    },

    getStackActionHistory: (stackName: string) => {
      const state = get();
      return state.actionHistory.filter(
        (action) => action.stackName === stackName
      );
    },

    getRunningStacks: () => {
      const state = get();
      return state.stacks.filter((stack) => {
        const running = stack.stats?.containers?.running || 0;
        const total = stack.stats?.containers?.total || 0;
        return running > 0 && running === total;
      });
    },

    getStoppedStacks: () => {
      const state = get();
      return state.stacks.filter((stack) => {
        const running = stack.stats?.containers?.running || 0;
        return running === 0;
      });
    },

    getPartialStacks: () => {
      const state = get();
      return state.stacks.filter((stack) => {
        const running = stack.stats?.containers?.running || 0;
        const total = stack.stats?.containers?.total || 0;
        return running > 0 && running < total;
      });
    },

    // Internal State Setters
    _setConnectionState: (
      connected: boolean,
      connecting: boolean,
      error?: string
    ) => {
      set({
        connected,
        connecting,
        error: error || null,
      });
    },

    _setStackData: (
      stacks: EnhancedUnifiedStack[],
      totalStacks: number,
      timestamp: string,
      connectionCount: number
    ) => {
      set({
        stacks,
        totalStacks,
        lastUpdated: timestamp,
        connectionCount,
        error: null,
      });
    },

    _setError: (error: string) => {
      set({ error });
    },
  }))
);

// Auto-connect and subscribe when store is first used
let hasInitialized = false;
let isInitializing = false;
let initCallCount = 0;

export const initializeStackStore = async () => {
  initCallCount++;
  console.log(`🔍 initializeStackStore called #${initCallCount}`);

  // FIXED: Stronger protection against React StrictMode double effects
  if (hasInitialized) {
    console.log("📡 v06-stackStore: Already initialized, skipping");
    return;
  }

  if (isInitializing) {
    console.log("📡 v06-stackStore: Already initializing, skipping");
    return;
  }

  isInitializing = true;

  console.log("🚀 v06-stackStore: Initializing (ONCE)");

  try {
    const store = useStackStore.getState();

    // FIXED: Only connect if not already connected
    if (!store.connected && !store.connecting) {
      await store.connect();
    } else {
      console.log("📡 v06-stackStore: Already connected, skipping connection");
    }

    // Set default update interval
    store.setUpdateInterval(3);

    hasInitialized = true;
    console.log("✅ v06-stackStore: Initialization complete");
  } catch (error) {
    console.error("❌ v06-stackStore: Initialization failed:", error);
  } finally {
    isInitializing = false;
  }
};

// FIXED: Convenience selectors that maintain referential equality
export const stackSelectors = {
  // Connection state - use primitive selectors
  useConnected: () => useStackStore((state) => state.connected),
  useConnecting: () => useStackStore((state) => state.connecting),
  useError: () => useStackStore((state) => state.error),

  // Stack data - use primitive selectors
  useStacks: () => useStackStore((state) => state.stacks),
  useStack: (stackName: string) =>
    useStackStore((state) => state.getStack(stackName)),
  useStackContainers: (stackName: string) =>
    useStackStore((state) => state.getStackContainers(stackName)),

  // Stack categories - these functions return new arrays, so they're ok
  useRunningStacks: () => useStackStore((state) => state.getRunningStacks()),
  useStoppedStacks: () => useStackStore((state) => state.getStoppedStacks()),
  usePartialStacks: () => useStackStore((state) => state.getPartialStacks()),

  // Action state - use primitive selectors
  useIsPerformingAction: () =>
    useStackStore((state) => state.isPerformingAction),
  useLastAction: () => useStackStore((state) => state.lastAction),

  // Stats - use primitive selectors
  useTotalStacks: () => useStackStore((state) => state.totalStacks),
  useLastUpdated: () => useStackStore((state) => state.lastUpdated),
  useConnectionCount: () => useStackStore((state) => state.connectionCount),

  // Action methods - stable references
  useStartStack: () => useStackStore((state) => state.startStack),
  useStopStack: () => useStackStore((state) => state.stopStack),
  useRestartStack: () => useStackStore((state) => state.restartStack),
  useClearActionHistory: () =>
    useStackStore((state) => state.clearActionHistory),
};

export default useStackStore;
