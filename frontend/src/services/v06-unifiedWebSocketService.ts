// frontend/src/services/v06-unifiedWebSocketService.ts
// Single WebSocket orchestrator that handles binary frames and topic subscriptions
// Fixes "[object Blob]" parsing errors and consolidates all WebSocket connections

// Simple browser-compatible event emitter
class SimpleEventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);
    return this;
  }

  off(event: string, listener: Function): this {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  once(event: string, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };
    return this.on(event, onceWrapper);
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener.apply(this, args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
      return true;
    }
    return false;
  }
}

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp: string;
  connection_count?: number;
  topic?: string;
}

interface SubscriptionCallback {
  (data: any, message: WebSocketMessage): void;
}

interface ConnectionOptions {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  updateInterval?: number;
}

interface ServiceStats {
  connected: boolean;
  connecting: boolean;
  connectionCount: number;
  lastConnected: Date | null;
  reconnectAttempts: number;
  subscriptions: string[];
  totalMessages: number;
  errors: number;
}

class UnifiedWebSocketService extends SimpleEventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<ConnectionOptions>;
  private subscriptions = new Map<string, Set<SubscriptionCallback>>();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private stats: ServiceStats = {
    connected: false,
    connecting: false,
    connectionCount: 0,
    lastConnected: null,
    reconnectAttempts: 0,
    subscriptions: [],
    totalMessages: 0,
    errors: 0,
  };

  constructor(options: ConnectionOptions = {}) {
    super();
    this.options = {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      updateInterval: 3,
      ...options,
    };

    // Dynamic URL based on environment
    this.url = this.getWebSocketUrl();
  }

  private getWebSocketUrl(): string {
    if (typeof window !== "undefined") {
      const { hostname } = window.location;
      const wsPort = "8002"; // Picows server port
      if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        return `ws://${hostname}:${wsPort}/`;
      }
    }
    return "ws://localhost:8002/";
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.stats.connecting) {
        // Wait for current connection attempt
        this.once("connected", resolve);
        this.once("error", reject);
        return;
      }

      this.stats.connecting = true;
      this.emit("connecting");

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("🔗 v06 Unified WebSocket connected");
          this.stats.connected = true;
          this.stats.connecting = false;
          this.stats.lastConnected = new Date();
          this.stats.reconnectAttempts = 0;

          // Clear any pending reconnect
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }

          // Send initial setup
          this.sendMessage({
            type: "set_update_interval",
            interval: this.options.updateInterval,
          });

          // Resubscribe to topics
          this.resubscribeToTopics();

          this.emit("connected");
          resolve();
        };

        this.ws.onmessage = async (event) => {
          try {
            // 🔧 CRITICAL FIX: Handle binary frames from picows
            let messageText: string;
            if (event.data instanceof Blob) {
              messageText = await event.data.text();
            } else {
              messageText = event.data;
            }

            const message: WebSocketMessage = JSON.parse(messageText);
            this.stats.totalMessages++;

            console.log(`📨 v06 WebSocket message:`, {
              type: message.type,
              topic: message.topic,
              timestamp: message.timestamp,
              dataSize: message.data ? Object.keys(message.data).length : 0,
            });

            // Handle system messages
            switch (message.type) {
              case "error":
                console.error("WebSocket error message:", message.message);
                this.stats.errors++;
                this.emit(
                  "error",
                  new Error(message.message || "Unknown WebSocket error")
                );
                break;

              case "pong":
                this.emit("pong");
                break;

              case "connected":
                this.stats.connectionCount = message.connection_count || 0;
                break;

              default:
                // Dispatch to topic subscribers
                this.dispatchToSubscribers(message);
                break;
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
            this.stats.errors++;
            this.emit("error", new Error("Failed to parse WebSocket message"));
          }
        };

        this.ws.onerror = (event) => {
          console.error("v06 WebSocket connection error:", event);
          this.stats.errors++;
          this.stats.connecting = false;
          this.emit("error", new Error("WebSocket connection error"));

          if (this.stats.reconnectAttempts === 0) {
            reject(new Error("Initial WebSocket connection failed"));
          }
        };

        this.ws.onclose = (event) => {
          console.log(`v06 WebSocket closed: ${event.code} ${event.reason}`);
          this.stats.connected = false;
          this.stats.connecting = false;
          this.emit("disconnected", event.code, event.reason);

          // Auto-reconnect if enabled and not intentionally closed
          if (this.options.autoReconnect && event.code !== 1000) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.stats.connecting = false;
        this.stats.errors++;
        console.error("Failed to create WebSocket:", error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }

    this.stats.connected = false;
    this.stats.connecting = false;
  }

  /**
   * Subscribe to a specific topic
   */
  public subscribe(topic: string, callback: SubscriptionCallback): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());

      console.log(`📡 v06 Subscribing to topic: ${topic}`);

      // Send subscription message to server
      this.sendMessage({
        type: "subscribe",
        topic: topic,
      });
    }

    this.subscriptions.get(topic)!.add(callback);
    this.updateSubscriptionStats();

    // Return unsubscribe function
    return () => this.unsubscribe(topic, callback);
  }

  /**
   * Unsubscribe from a topic
   */
  public unsubscribe(topic: string, callback: SubscriptionCallback): void {
    const subscribers = this.subscriptions.get(topic);
    if (subscribers) {
      subscribers.delete(callback);

      if (subscribers.size === 0) {
        this.subscriptions.delete(topic);

        console.log(`📡 v06 Unsubscribing from topic: ${topic}`);

        // Send unsubscribe message to server
        this.sendMessage({
          type: "unsubscribe",
          topic: topic,
        });
      }
    }
    this.updateSubscriptionStats();
  }

  /**
   * Send ping to server
   */
  public ping(): void {
    this.sendMessage({ type: "ping" });
  }

  /**
   * Update subscription interval
   */
  public setUpdateInterval(interval: number): void {
    this.options.updateInterval = interval;
    this.sendMessage({
      type: "set_update_interval",
      interval: interval,
    });
  }

  /**
   * Get service statistics
   */
  public getStats(): ServiceStats {
    return { ...this.stats };
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.stats.connected;
  }

  /**
   * Send message to server
   */
  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("v06 Cannot send message: WebSocket not connected", message);
    }
  }

  /**
   * Dispatch message to topic subscribers
   */
  private dispatchToSubscribers(message: WebSocketMessage): void {
    // Try direct topic match first
    if (message.topic) {
      const subscribers = this.subscriptions.get(message.topic);
      if (subscribers) {
        console.log(
          `📤 v06 Dispatching to ${subscribers.size} subscribers for topic: ${message.topic}`
        );
        subscribers.forEach((callback) => {
          try {
            callback(message.data, message);
          } catch (err) {
            console.error(`Error in ${message.topic} subscriber:`, err);
          }
        });
        return;
      }
    }

    // Fallback: dispatch by message type
    const subscribers = this.subscriptions.get(message.type);
    if (subscribers) {
      console.log(
        `📤 v06 Dispatching to ${subscribers.size} subscribers for type: ${message.type}`
      );
      subscribers.forEach((callback) => {
        try {
          callback(message.data, message);
        } catch (err) {
          console.error(`Error in ${message.type} subscriber:`, err);
        }
      });
    } else {
      console.log(`📭 v06 No subscribers for message type: ${message.type}`);
    }
  }

  /**
   * Resubscribe to all topics on reconnect
   */
  private resubscribeToTopics(): void {
    for (const topic of this.subscriptions.keys()) {
      console.log(`🔄 v06 Resubscribing to topic: ${topic}`);
      this.sendMessage({
        type: "subscribe",
        topic: topic,
      });
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.stats.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error("v06 Max reconnection attempts reached");
      this.emit("maxReconnectAttemptsReached");
      return;
    }

    this.stats.reconnectAttempts++;
    const delay =
      this.options.reconnectDelay *
      Math.pow(2, this.stats.reconnectAttempts - 1);

    console.log(
      `⏳ v06 Scheduling reconnect attempt ${this.stats.reconnectAttempts}/${this.options.maxReconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimeout = setTimeout(() => {
      console.log(
        `🔄 v06 Reconnection attempt ${this.stats.reconnectAttempts}/${this.options.maxReconnectAttempts}`
      );
      this.connect().catch((err) => {
        console.error("v06 Reconnection failed:", err);
      });
    }, delay);
  }

  /**
   * Update subscription statistics
   */
  private updateSubscriptionStats(): void {
    this.stats.subscriptions = Array.from(this.subscriptions.keys());
  }
}

// Create singleton instance
export const v06WebSocketService = new UnifiedWebSocketService();

// Export class for testing or multiple instances if needed
export { UnifiedWebSocketService };

export default v06WebSocketService;
