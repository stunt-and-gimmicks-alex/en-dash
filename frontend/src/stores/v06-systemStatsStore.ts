// frontend/src/stores/v06-systemStatsStore.ts
// Single source of truth for all system stats data using Zustand + WebSocket
// Follows the same pattern as v06-stackStore for consistency

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import v06WebSocketService from "@/services/v06-unifiedWebSocketService";

interface SystemStatsData {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
  network_bytes_sent: number;
  network_bytes_recv: number;
  timestamp: string;
  container_resources?: {
    total_containers: number;
    total_cpu_usage: number;
    total_memory_usage_mb: number;
    total_memory_limit_mb: number;
    containers: Array<{
      id: string;
      name: string;
      stack_name?: string;
      service_name?: string;
      cpu_percent: number;
      memory_usage_mb: number;
      memory_limit_mb: number;
      memory_percent: number;
      network_rx_bytes: number;
      network_tx_bytes: number;
      block_read_bytes: number;
      block_write_bytes: number;
    }>;
  };
}

interface SystemStatsQueue {
  data: SystemStatsData[];
  currentIndex: number;
  isPlaying: boolean;
  intervalId: NodeJS.Timeout | null;
}

interface SystemStatsStore {
  // WebSocket Connection State
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastUpdated: string | null;
  connectionCount: number;

  // System Stats Data
  currentStats: SystemStatsData | null;
  statsHistory: SystemStatsData[];
  maxHistorySize: number;

  // Smooth Update System (5-second batches → 1/2 second playback)
  statsQueue: SystemStatsQueue;
  lastRealStats: SystemStatsData | null;
  tweenFactor: number;

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

  // Utility Actions
  clearHistory: () => void;
  setMaxHistorySize: (size: number) => void;

  // Getters (computed values)
  getContainersByStack: (stackName: string) => Array<{
    id: string;
    name: string;
    stack_name?: string;
    service_name?: string;
    cpu_percent: number;
    memory_usage_mb: number;
    memory_limit_mb: number;
    memory_percent: number;
    network_rx_bytes: number;
    network_tx_bytes: number;
    block_read_bytes: number;
    block_write_bytes: number;
  }>;
  getStackResourceSummary: (stackName: string) => {
    total_containers: number;
    total_cpu_usage: number;
    total_memory_usage_mb: number;
    avg_cpu_usage: number;
    avg_memory_percent: number;
  };
  getQueueInfo: () => {
    queueLength: number;
    currentIndex: number;
    isPlaying: boolean;
    hasRealData: boolean;
  };

  // Helper functions for smooth animations (internal)
  _applyTweening: (
    newStat: SystemStatsData,
    currentStat: SystemStatsData,
    factor: number
  ) => SystemStatsData;
  _generateInterpolatedStats: (lastStats: SystemStatsData) => SystemStatsData;

  // Internal state setters (called by WebSocket handlers)
  _setConnectionState: (
    connected: boolean,
    connecting: boolean,
    error?: string | null
  ) => void;
  _setStatsData: (
    stats: SystemStatsData | SystemStatsData[],
    timestamp: string,
    connectionCount: number
  ) => void;
  _setError: (error: string) => void;

  // Internal queue management
  _addStatsToQueue: (newStats: SystemStatsData[]) => void;
  _startQueue: () => void;
  _stopQueue: () => void;
  _processQueueItem: () => void;
}

export const useSystemStatsStore = create<SystemStatsStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    connected: false,
    connecting: false,
    error: null,
    lastUpdated: null,
    connectionCount: 0,
    currentStats: null,
    statsHistory: [],
    maxHistorySize: 100, // Keep last 100 stats entries
    statsQueue: {
      data: [],
      currentIndex: 0,
      isPlaying: false,
      intervalId: null,
    },
    lastRealStats: null,
    tweenFactor: 0.3, // How much to blend new values for smoothness
    _isSubscribed: false,
    _unsubscribe: null,

    // WebSocket Actions
    connect: async () => {
      const state = get();
      if (state.connected || state.connecting) return;

      try {
        set({ connecting: true, error: null });
        console.log("🔗 v06-systemStatsStore: Connecting to WebSocket");

        await v06WebSocketService.connect();

        // Auto-subscribe after connection
        get().subscribe();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Connection failed";
        console.error(
          "❌ v06-systemStatsStore: Connection failed:",
          errorMessage
        );
        set({ error: errorMessage, connecting: false });
      }
    },

    disconnect: () => {
      console.log("🔌 v06-systemStatsStore: Disconnecting");
      get().unsubscribe();
      v06WebSocketService.disconnect();
      set({ connected: false, connecting: false });
    },

    subscribe: () => {
      const state = get();
      if (state._isSubscribed) {
        console.log("📡 v06-systemStatsStore: Already subscribed");
        return;
      }

      console.log("📡 v06-systemStatsStore: Subscribing to system_stats topic");

      // Single WebSocket message handler
      const handleStatsMessage = (data: any, message: any) => {
        console.log("📊 v06-systemStatsStore received:", {
          type: message.type,
          timestamp: message.timestamp,
          isArray: Array.isArray(data),
          dataLength: Array.isArray(data) ? data.length : 1,
        });

        switch (message.type) {
          case "system_stats":
            get()._setStatsData(
              data,
              message.timestamp,
              message.connection_count || 0
            );
            break;

          default:
            console.log(
              "🔍 v06-systemStatsStore: Unknown message type:",
              message.type
            );
        }
      };

      // Connection state handlers
      const handleConnected = () => {
        console.log("✅ v06-systemStatsStore: WebSocket connected");
        get()._setConnectionState(true, false);
      };

      const handleDisconnected = () => {
        console.log("🔌 v06-systemStatsStore: WebSocket disconnected");
        get()._setConnectionState(false, false);
        get()._stopQueue();
      };

      const handleConnecting = () => {
        console.log("🔄 v06-systemStatsStore: WebSocket connecting");
        get()._setConnectionState(false, true);
      };

      const handleError = (error: Error) => {
        console.error(
          "❌ v06-systemStatsStore: WebSocket error:",
          error.message
        );
        get()._setError(error.message);
      };

      // Register event listeners
      v06WebSocketService.on("connected", handleConnected);
      v06WebSocketService.on("disconnected", handleDisconnected);
      v06WebSocketService.on("connecting", handleConnecting);
      v06WebSocketService.on("error", handleError);

      // Subscribe to system_stats topic
      const unsubscribeFromTopic = v06WebSocketService.subscribe(
        "system_stats",
        handleStatsMessage
      );

      // Create composite unsubscribe function
      const unsubscribeAll = () => {
        console.log("🔇 v06-systemStatsStore: Unsubscribing from all events");

        // Unsubscribe from topic
        if (unsubscribeFromTopic) {
          unsubscribeFromTopic();
        }

        // Remove event listeners
        v06WebSocketService.off("connected", handleConnected);
        v06WebSocketService.off("disconnected", handleDisconnected);
        v06WebSocketService.off("connecting", handleConnecting);
        v06WebSocketService.off("error", handleError);

        // Stop the queue
        get()._stopQueue();
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
          "📭 v06-systemStatsStore: Not subscribed, nothing to unsubscribe"
        );
        return;
      }

      state._unsubscribe();
      set({ _isSubscribed: false, _unsubscribe: null });
    },

    ping: () => {
      console.log("🏓 v06-systemStatsStore: Sending ping");
      v06WebSocketService.ping();
    },

    setUpdateInterval: (interval: number) => {
      console.log(
        `⏰ v06-systemStatsStore: Setting update interval to ${interval}s`
      );
      v06WebSocketService.setUpdateInterval(interval);
    },

    // Utility Actions
    clearHistory: () => {
      console.log("🗑️ v06-systemStatsStore: Clearing stats history");
      set({ statsHistory: [] });
    },

    setMaxHistorySize: (size: number) => {
      console.log(
        `📊 v06-systemStatsStore: Setting max history size to ${size}`
      );
      const state = get();
      const newHistory = state.statsHistory.slice(-size);
      set({ maxHistorySize: size, statsHistory: newHistory });
    },

    // Getters (computed values)
    getContainersByStack: (stackName: string) => {
      const state = get();
      const containers = state.currentStats?.container_resources?.containers;
      return containers?.filter((c) => c.stack_name === stackName) || [];
    },

    getStackResourceSummary: (stackName: string) => {
      const containers = get().getContainersByStack(stackName);

      if (containers.length === 0) {
        return {
          total_containers: 0,
          total_cpu_usage: 0,
          total_memory_usage_mb: 0,
          avg_cpu_usage: 0,
          avg_memory_percent: 0,
        };
      }

      const totalCpu = containers.reduce(
        (sum: number, c: any) => sum + c.cpu_percent,
        0
      );
      const totalMemoryUsage = containers.reduce(
        (sum: number, c: any) => sum + c.memory_usage_mb,
        0
      );
      const avgMemoryPercent =
        containers.reduce((sum: number, c: any) => sum + c.memory_percent, 0) /
        containers.length;

      return {
        total_containers: containers.length,
        total_cpu_usage: totalCpu,
        total_memory_usage_mb: totalMemoryUsage,
        avg_cpu_usage: totalCpu / containers.length,
        avg_memory_percent: avgMemoryPercent,
      };
    },

    getQueueInfo: () => {
      const state = get();
      return {
        queueLength: state.statsQueue.data.length,
        currentIndex: state.statsQueue.currentIndex,
        isPlaying: state.statsQueue.isPlaying,
        hasRealData: !!state.lastRealStats,
      };
    },

    // Internal state setters (called by WebSocket handlers)
    _setConnectionState: (
      connected: boolean,
      connecting: boolean,
      error: string | null = null
    ) => {
      set({ connected, connecting, error });
    },

    _setStatsData: (
      stats: SystemStatsData | SystemStatsData[],
      timestamp: string,
      connectionCount: number
    ) => {
      const statsArray = Array.isArray(stats) ? stats : [stats];

      // Update last real stats
      const lastRealStats = statsArray[statsArray.length - 1];

      // Add to queue for smooth playback
      get()._addStatsToQueue(statsArray);

      // Update immediate state
      set({
        lastUpdated: timestamp,
        connectionCount,
        lastRealStats,
        error: null,
      });

      console.log(
        `✅ v06-systemStatsStore: Updated with ${statsArray.length} stats entries`
      );
    },

    _setError: (error: string) => {
      set({ error, connecting: false });
    },

    // Internal queue management
    _addStatsToQueue: (newStats: SystemStatsData[]) => {
      const state = get();

      // Add new stats to queue
      const updatedQueue = {
        ...state.statsQueue,
        data: [...state.statsQueue.data, ...newStats],
      };

      // Keep queue reasonable size (max 50 entries)
      if (updatedQueue.data.length > 50) {
        const overflow = updatedQueue.data.length - 50;
        updatedQueue.data = updatedQueue.data.slice(overflow);
        updatedQueue.currentIndex = Math.max(
          0,
          updatedQueue.currentIndex - overflow
        );
      }

      set({ statsQueue: updatedQueue });

      // Start playing if not already
      if (!state.statsQueue.isPlaying) {
        get()._startQueue();
      }
    },

    _startQueue: () => {
      const state = get();
      if (state.statsQueue.isPlaying) return;

      console.log(
        "🎬 v06-systemStatsStore: Starting buttery smooth 1/2 second updates!"
      );

      const intervalId = setInterval(() => {
        get()._processQueueItem();
      }, 500); // 500ms = 1/2 second updates

      set({
        statsQueue: {
          ...state.statsQueue,
          isPlaying: true,
          intervalId,
        },
      });
    },

    _stopQueue: () => {
      const state = get();
      if (state.statsQueue.intervalId) {
        clearInterval(state.statsQueue.intervalId);
      }

      set({
        statsQueue: {
          ...state.statsQueue,
          isPlaying: false,
          intervalId: null,
        },
      });
    },

    _processQueueItem: () => {
      const state = get();

      if (state.statsQueue.currentIndex < state.statsQueue.data.length) {
        // Process next item in queue
        const currentStat =
          state.statsQueue.data[state.statsQueue.currentIndex];

        // Apply tweening if we have previous stats
        const tweenedStat = state.currentStats
          ? state._applyTweening(
              currentStat,
              state.currentStats,
              state.tweenFactor
            )
          : currentStat;

        // Update current stats and add to history
        const newHistory = [...state.statsHistory, tweenedStat].slice(
          -state.maxHistorySize
        );

        set({
          currentStats: tweenedStat,
          statsHistory: newHistory,
          statsQueue: {
            ...state.statsQueue,
            currentIndex: state.statsQueue.currentIndex + 1,
          },
        });
      } else if (state.lastRealStats) {
        // Queue is empty, generate interpolated data for smoothness
        const interpolatedStat = state._generateInterpolatedStats(
          state.lastRealStats
        );

        const newHistory = [...state.statsHistory, interpolatedStat].slice(
          -state.maxHistorySize
        );

        set({
          currentStats: interpolatedStat,
          statsHistory: newHistory,
        });
      }
    },

    // Helper functions for smooth animations
    _applyTweening: (
      newStat: SystemStatsData,
      currentStat: SystemStatsData,
      factor: number
    ): SystemStatsData => {
      const lerp = (start: number, end: number, t: number) =>
        start + (end - start) * t;

      return {
        ...newStat,
        cpu_percent: lerp(currentStat.cpu_percent, newStat.cpu_percent, factor),
        memory_percent: lerp(
          currentStat.memory_percent,
          newStat.memory_percent,
          factor
        ),
        disk_percent: lerp(
          currentStat.disk_percent,
          newStat.disk_percent,
          factor
        ),
      };
    },

    _generateInterpolatedStats: (
      lastStats: SystemStatsData
    ): SystemStatsData => {
      const addVariance = (value: number, variance: number = 0.02) => {
        const maxChange = value * variance;
        const change = (Math.random() - 0.5) * 2 * maxChange;
        return Math.max(0, Math.min(100, value + change));
      };

      return {
        ...lastStats,
        cpu_percent: addVariance(lastStats.cpu_percent),
        memory_percent: addVariance(lastStats.memory_percent),
        timestamp: new Date().toISOString(),
      };
    },
  }))
);

// Selectors for efficient component subscriptions
export const systemStatsSelectors = {
  // Connection state - use primitive selectors to avoid object recreation
  useConnected: () => useSystemStatsStore((state) => state.connected),
  useConnecting: () => useSystemStatsStore((state) => state.connecting),
  useError: () => useSystemStatsStore((state) => state.error),
  useLastUpdated: () => useSystemStatsStore((state) => state.lastUpdated),
  useConnectionCount: () =>
    useSystemStatsStore((state) => state.connectionCount),

  // Stats data - use primitive selectors
  useCurrentStats: () => useSystemStatsStore((state) => state.currentStats),
  useStatsHistory: () => useSystemStatsStore((state) => state.statsHistory),
  useLastRealStats: () => useSystemStatsStore((state) => state.lastRealStats),

  // Queue info - computed selector
  useQueueInfo: () => useSystemStatsStore((state) => state.getQueueInfo()),

  // Container resources - computed selectors
  useContainerResources: () =>
    useSystemStatsStore((state) => state.currentStats?.container_resources),
  useContainersByStack: (stackName: string) =>
    useSystemStatsStore((state) => state.getContainersByStack(stackName)),
  useStackResourceSummary: (stackName: string) =>
    useSystemStatsStore((state) => state.getStackResourceSummary(stackName)),

  // Action methods - stable references
  useConnect: () => useSystemStatsStore((state) => state.connect),
  useDisconnect: () => useSystemStatsStore((state) => state.disconnect),
  usePing: () => useSystemStatsStore((state) => state.ping),
  useSetUpdateInterval: () =>
    useSystemStatsStore((state) => state.setUpdateInterval),
  useClearHistory: () => useSystemStatsStore((state) => state.clearHistory),
};

// Store initialization function (follows v06-stackStore pattern)
export const initializeSystemStatsStore = async (): Promise<void> => {
  console.log("🚀 Initializing v06-systemStatsStore...");

  try {
    const store = useSystemStatsStore.getState();
    await store.connect();
    store.setUpdateInterval(5);
    console.log("✅ v06-systemStatsStore initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize v06-systemStatsStore:", error);
    throw error;
  }
};

export default useSystemStatsStore;
