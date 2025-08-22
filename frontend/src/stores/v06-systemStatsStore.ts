// frontend/src/stores/v06-systemStatsStore.ts
// Single source of truth for all system stats data using Zustand + WebSocket
// UPDATED: Now supports batched system stats for smooth performance

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
  // New batching properties
  playbackStartTime: number | null;
  totalPlaybackDuration: number; // milliseconds
  playbackInterval: number; // milliseconds between updates
  isBatched: boolean; // true when playing back a received batch
}

// New interface for batched stats message
interface SystemStatsBatch {
  batch: SystemStatsData[];
  batch_size: number;
  latest: SystemStatsData;
  oldest: SystemStatsData;
  timespan_seconds: number;
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

  // Enhanced Smooth Update System (30-second batches → 500ms playback)
  statsQueue: SystemStatsQueue;
  lastRealStats: SystemStatsData | null;
  tweenFactor: number;

  // New batching state
  lastBatchReceived: SystemStatsBatch | null;
  batchPlaybackInfo: {
    totalDuration: number;
    updateInterval: number;
    smoothTweening: boolean;
  };

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
    isBatched: boolean;
    playbackProgress: number; // 0-100 percentage
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
  _setBatchedStatsData: (
    batch: SystemStatsBatch,
    timestamp: string,
    connectionCount: number,
    playbackInfo?: any
  ) => void;
  _setError: (error: string) => void;

  // Internal queue management - ENHANCED FOR BATCHING
  _addStatsToQueue: (newStats: SystemStatsData[], isBatched?: boolean) => void;
  _startQueue: (playbackDuration?: number, updateInterval?: number) => void;
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
      // New batching properties
      playbackStartTime: null,
      totalPlaybackDuration: 30000, // 30 seconds default
      playbackInterval: 500, // 500ms updates
      isBatched: false,
    },
    lastRealStats: null,
    tweenFactor: 0.3, // How much to blend new values for smoothness
    _isSubscribed: false,
    _unsubscribe: null,

    // New batching state
    lastBatchReceived: null,
    batchPlaybackInfo: {
      totalDuration: 30000, // 30 seconds
      updateInterval: 500, // 500ms
      smoothTweening: true,
    },

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

      // Enhanced WebSocket message handler for batching
      const handleStatsMessage = (data: any, message: any) => {
        console.log("📊 v06-systemStatsStore received:", {
          type: message.type,
          timestamp: message.timestamp,
          isArray: Array.isArray(data),
          dataLength: Array.isArray(data) ? data.length : 1,
          isBatch: message.type === "system_stats_batch",
          batchSize:
            message.type === "system_stats_batch"
              ? data?.batch_size
              : undefined,
        });

        switch (message.type) {
          case "system_stats_batch":
            // NEW: Handle batched stats
            get()._setBatchedStatsData(
              data,
              message.timestamp,
              message.connection_count || 0,
              message.playback_info
            );
            break;

          case "system_stats":
            // Legacy: Handle individual stats (backwards compatibility)
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

      // Calculate playback progress for batched mode
      let playbackProgress = 0;
      if (state.statsQueue.isBatched && state.statsQueue.playbackStartTime) {
        const elapsed = Date.now() - state.statsQueue.playbackStartTime;
        playbackProgress = Math.min(
          100,
          (elapsed / state.statsQueue.totalPlaybackDuration) * 100
        );
      }

      return {
        queueLength: state.statsQueue.data.length,
        currentIndex: state.statsQueue.currentIndex,
        isPlaying: state.statsQueue.isPlaying,
        hasRealData: !!state.lastRealStats,
        isBatched: state.statsQueue.isBatched,
        playbackProgress,
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

    // Legacy method for individual stats (backwards compatibility)
    _setStatsData: (
      stats: SystemStatsData | SystemStatsData[],
      timestamp: string,
      connectionCount: number
    ) => {
      const statsArray = Array.isArray(stats) ? stats : [stats];

      // Update last real stats
      const lastRealStats = statsArray[statsArray.length - 1];

      // Add to queue for smooth playback (not batched)
      get()._addStatsToQueue(statsArray, false);

      // Update immediate state
      set({
        lastUpdated: timestamp,
        connectionCount,
        lastRealStats,
        error: null,
      });

      console.log(
        `✅ v06-systemStatsStore: Updated with ${statsArray.length} stats entries (legacy mode)`
      );
    },

    // NEW: Enhanced method for batched stats
    _setBatchedStatsData: (
      batch: SystemStatsBatch,
      timestamp: string,
      connectionCount: number,
      playbackInfo?: any
    ) => {
      console.log(
        `📦 v06-systemStatsStore: Received batch of ${batch.batch_size} stats for smooth playback`
      );

      // Update batch information
      const updatedPlaybackInfo = {
        ...get().batchPlaybackInfo,
        ...(playbackInfo || {}),
      };

      // Store the batch data
      set({
        lastBatchReceived: batch,
        batchPlaybackInfo: updatedPlaybackInfo,
        lastUpdated: timestamp,
        connectionCount,
        lastRealStats: batch.latest,
        error: null,
      });

      // Add batch to queue for smooth playback
      get()._addStatsToQueue(
        batch.batch,
        true // This is a batched update
      );

      console.log(
        `✅ v06-systemStatsStore: Started batched playback of ${batch.batch_size} stats over ${updatedPlaybackInfo.totalDuration}ms`
      );
    },

    _setError: (error: string) => {
      set({ error, connecting: false });
    },

    // ENHANCED: Internal queue management for batching
    _addStatsToQueue: (
      newStats: SystemStatsData[],
      isBatched: boolean = false
    ) => {
      const state = get();

      // Reset queue for new batch
      if (isBatched) {
        get()._stopQueue(); // Stop any existing playback

        const updatedQueue = {
          ...state.statsQueue,
          data: [...newStats], // Replace queue with new batch
          currentIndex: 0,
          isBatched: true,
          playbackStartTime: Date.now(),
          totalPlaybackDuration: state.batchPlaybackInfo.totalDuration,
          playbackInterval: state.batchPlaybackInfo.updateInterval,
        };

        set({ statsQueue: updatedQueue });

        // Start playback with batched settings
        get()._startQueue(
          state.batchPlaybackInfo.totalDuration,
          state.batchPlaybackInfo.updateInterval
        );
      } else {
        // Legacy mode: add to existing queue
        const updatedQueue = {
          ...state.statsQueue,
          data: [...state.statsQueue.data, ...newStats],
          isBatched: false,
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
      }
    },

    _startQueue: (playbackDuration?: number, updateInterval?: number) => {
      const state = get();
      if (state.statsQueue.isPlaying) return;

      const interval = updateInterval || 500; // Default 500ms
      const duration = playbackDuration || 30000; // Default 30s

      console.log(
        `🎬 v06-systemStatsStore: Starting ${
          state.statsQueue.isBatched ? "batched" : "legacy"
        } playback (${interval}ms intervals)`
      );

      const intervalId = setInterval(() => {
        get()._processQueueItem();
      }, interval);

      set({
        statsQueue: {
          ...state.statsQueue,
          isPlaying: true,
          intervalId,
          playbackStartTime: state.statsQueue.isBatched ? Date.now() : null,
          totalPlaybackDuration: duration,
          playbackInterval: interval,
        },
      });
    },

    _stopQueue: () => {
      const state = get();
      if (state.statsQueue.intervalId) {
        clearInterval(state.statsQueue.intervalId);
      }

      console.log("⏹️ v06-systemStatsStore: Stopped queue playback");

      set({
        statsQueue: {
          ...state.statsQueue,
          isPlaying: false,
          intervalId: null,
          playbackStartTime: null,
        },
      });
    },

    _processQueueItem: () => {
      const state = get();

      // Check if batched playback should stop based on time
      if (state.statsQueue.isBatched && state.statsQueue.playbackStartTime) {
        const elapsed = Date.now() - state.statsQueue.playbackStartTime;
        if (elapsed >= state.statsQueue.totalPlaybackDuration) {
          console.log(
            "⏰ v06-systemStatsStore: Batched playback duration reached, stopping"
          );
          get()._stopQueue();
          return;
        }
      }

      if (state.statsQueue.currentIndex < state.statsQueue.data.length) {
        // Process next item in queue
        const currentStat =
          state.statsQueue.data[state.statsQueue.currentIndex];

        // Apply tweening if we have previous stats and tweening is enabled
        const tweenedStat =
          state.currentStats && state.batchPlaybackInfo.smoothTweening
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

        // Log progress for batched mode
        if (state.statsQueue.isBatched) {
          const progress =
            ((state.statsQueue.currentIndex + 1) /
              state.statsQueue.data.length) *
            100;
          console.log(
            `📊 v06-systemStatsStore: Batched playback progress: ${progress.toFixed(
              1
            )}% (${state.statsQueue.currentIndex + 1}/${
              state.statsQueue.data.length
            })`
          );
        }
      } else if (state.lastRealStats && !state.statsQueue.isBatched) {
        // Legacy mode: Queue is empty, generate interpolated data for smoothness
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
      } else {
        // Batched mode: Queue is empty, stop playback
        if (state.statsQueue.isBatched) {
          console.log("✅ v06-systemStatsStore: Batched playback completed");
          get()._stopQueue();
        }
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

  // NEW: Batching selectors
  useLastBatchReceived: () =>
    useSystemStatsStore((state) => state.lastBatchReceived),
  useBatchPlaybackInfo: () =>
    useSystemStatsStore((state) => state.batchPlaybackInfo),

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
  console.log("🚀 Initializing v06-systemStatsStore with batching support...");

  try {
    const store = useSystemStatsStore.getState();
    await store.connect();
    // Updated interval to match backend batching (30s)
    store.setUpdateInterval(30);
    console.log(
      "✅ v06-systemStatsStore initialized successfully with batching"
    );
  } catch (error) {
    console.error("❌ Failed to initialize v06-systemStatsStore:", error);
    throw error;
  }
};

export default useSystemStatsStore;
