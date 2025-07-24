// src/services/dockgeApi.ts - Service to connect to Dockge backend via Socket.IO
import { io, Socket } from "socket.io-client";
import { config } from "@/config";

// Types for Dockge data structures
export interface DockgeStack {
    name: string;
    status: "running" | "stopped" | "error" | "starting" | "stopping";
    containers: DockgeContainer[];
    path: string;
    composeFile?: string;
    lastUpdated?: string;
}

export interface DockgeContainer {
    name: string;
    status:
        | "running"
        | "exited"
        | "created"
        | "restarting"
        | "removing"
        | "paused"
        | "dead";
    image: string;
    ports: string[];
    created: string;
    stack?: string;
}

export interface DockgeStats {
    totalStacks: number;
    runningStacks: number;
    stoppedStacks: number;
    totalContainers: number;
    runningContainers: number;
    exitedContainers: number;
    inactiveContainers: number;
    totalImages: number;
    totalVolumes: number;
    totalNetworks: number;
}

export interface DockgeSystemInfo {
    version: string;
    dockerVersion?: string;
    composeVersion?: string;
    platform: string;
    architecture?: string;
    apiVersion: string;
    containers: number;
    images: number;
    volumes: number;
    networks: number;
}

// Event callback types - simplified to avoid Socket.IO typing conflicts
export type StackListCallback = (stacks: DockgeStack[]) => void;
export type StackChangedCallback = (stack: DockgeStack) => void;
export type StackProgressCallback = (data: {
    stackName: string;
    progress: string;
    status: string;
}) => void;
export type ContainerListCallback = (containers: DockgeContainer[]) => void;
export type ContainerChangedCallback = (container: DockgeContainer) => void;
export type StatsCallback = (stats: DockgeStats) => void;
export type SystemInfoCallback = (info: DockgeSystemInfo) => void;
export type ConnectCallback = () => void;
export type DisconnectCallback = () => void;
export type ErrorCallback = (error: any) => void;

class DockgeApiService {
    private socket: Socket | null = null;
    private baseUrl: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    constructor(baseUrl?: string) {
        // Fix: Use optional parameter and fallback to getDockgeUrl
        this.baseUrl = baseUrl || getDockgeUrl();
        console.log(`DockgeApiService initialized with URL: ${this.baseUrl}`);
    }

    // Initialize connection to Dockge Socket.IO
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log(
                    `Attempting to connect to Dockge at: ${this.baseUrl}`
                );

                this.socket = io(this.baseUrl, {
                    transports: ["websocket", "polling"],
                    timeout: 10000, // Increased timeout
                    forceNew: true,
                    autoConnect: true,
                });

                // Add more detailed event logging
                this.socket.on("connect", () => {
                    console.log("✅ Connected to Dockge backend successfully");
                    this.reconnectAttempts = 0;
                    resolve();
                });

                this.socket.on("connect_error", (error) => {
                    console.error(
                        "❌ Failed to connect to Dockge backend:",
                        error
                    );
                    console.log("🔍 Trying alternative connection methods...");
                    this.handleReconnect();
                    reject(error);
                });

                this.socket.on("disconnect", (reason) => {
                    console.warn(
                        "⚠️ Disconnected from Dockge backend:",
                        reason
                    );
                    if (reason === "io server disconnect") {
                        // Server initiated disconnect, try to reconnect
                        this.handleReconnect();
                    }
                });

                this.socket.on("error", (error) => {
                    console.error("🚨 Socket.IO error:", error);
                });

                // Test if the URL is even reachable
                this.testConnection();

                // Set up event listeners for common events
                this.setupEventListeners();
            } catch (error) {
                console.error("💥 Error creating socket connection:", error);
                reject(error);
            }
        });
    }

    // Test if Dockge is reachable at all
    private async testConnection() {
        try {
            console.log("🔍 Testing if Dockge is reachable...");
            const response = await fetch(this.baseUrl, {
                method: "GET",
                mode: "no-cors", // Avoid CORS issues for basic connectivity test
            });
            console.log("✅ Dockge server is reachable");
        } catch (error) {
            console.error("❌ Dockge server is not reachable:", error);
            console.log("💡 Suggestions:");
            console.log(
                "   1. Check if Dockge is running: docker ps | grep dockge"
            );
            console.log(
                "   2. Verify port 5001 is exposed: docker port <container-name>"
            );
            console.log("   3. Check firewall/network settings");
            console.log(
                `   4. Try accessing ${this.baseUrl} directly in browser`
            );
        }
    }

    private setupEventListeners() {
        if (!this.socket) return;

        // Request initial data when connected
        this.socket.on("connect", () => {
            this.requestStacks();
            this.requestStats();
            this.requestSystemInfo();
        });
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(
                `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
            );

            setTimeout(() => {
                this.connect().catch(() => {
                    // Retry will be handled by the next attempt
                });
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error("Max reconnection attempts reached");
        }
    }

    // Subscribe to specific events with proper typing and connection guards
    onStackList(callback: StackListCallback) {
        if (!this.socket) {
            console.warn(
                "Socket not initialized. Event listener will be set up after connection."
            );
            return;
        }
        this.socket.on("stackList", callback);
    }

    onStackChanged(callback: StackChangedCallback) {
        if (!this.socket) {
            console.warn(
                "Socket not initialized. Event listener will be set up after connection."
            );
            return;
        }
        this.socket.on("stackChanged", callback);
    }

    onStackProgress(callback: StackProgressCallback) {
        if (!this.socket) {
            console.warn(
                "Socket not initialized. Event listener will be set up after connection."
            );
            return;
        }
        this.socket.on("stackProgress", callback);
    }

    onContainerList(callback: ContainerListCallback) {
        if (!this.socket) {
            console.warn(
                "Socket not initialized. Event listener will be set up after connection."
            );
            return;
        }
        this.socket.on("containerList", callback);
    }

    onContainerChanged(callback: ContainerChangedCallback) {
        if (!this.socket) {
            console.warn(
                "Socket not initialized. Event listener will be set up after connection."
            );
            return;
        }
        this.socket.on("containerChanged", callback);
    }

    onStats(callback: StatsCallback) {
        if (!this.socket) {
            console.warn(
                "Socket not initialized. Event listener will be set up after connection."
            );
            return;
        }
        this.socket.on("stats", callback);
    }

    onSystemInfo(callback: SystemInfoCallback) {
        if (!this.socket) {
            console.warn(
                "Socket not initialized. Event listener will be set up after connection."
            );
            return;
        }
        this.socket.on("systemInfo", callback);
    }

    onConnect(callback: ConnectCallback) {
        if (!this.socket) {
            console.warn(
                "Socket not initialized. Event listener will be set up after connection."
            );
            return;
        }
        this.socket.on("connect", callback);
    }

    onDisconnect(callback: DisconnectCallback) {
        if (!this.socket) {
            console.warn(
                "Socket not initialized. Event listener will be set up after connection."
            );
            return;
        }
        this.socket.on("disconnect", callback);
    }

    onError(callback: ErrorCallback) {
        if (!this.socket) {
            console.warn(
                "Socket not initialized. Event listener will be set up after connection."
            );
            return;
        }
        this.socket.on("error", callback);
    }

    // Remove event listeners
    offStackList(callback?: StackListCallback) {
        if (this.socket) {
            this.socket.off("stackList", callback);
        }
    }

    offStackChanged(callback?: StackChangedCallback) {
        if (this.socket) {
            this.socket.off("stackChanged", callback);
        }
    }

    offStackProgress(callback?: StackProgressCallback) {
        if (this.socket) {
            this.socket.off("stackProgress", callback);
        }
    }

    offContainerList(callback?: ContainerListCallback) {
        if (this.socket) {
            this.socket.off("containerList", callback);
        }
    }

    offContainerChanged(callback?: ContainerChangedCallback) {
        if (this.socket) {
            this.socket.off("containerChanged", callback);
        }
    }

    offStats(callback?: StatsCallback) {
        if (this.socket) {
            this.socket.off("stats", callback);
        }
    }

    offSystemInfo(callback?: SystemInfoCallback) {
        if (this.socket) {
            this.socket.off("systemInfo", callback);
        }
    }

    offConnect(callback?: ConnectCallback) {
        if (this.socket) {
            this.socket.off("connect", callback);
        }
    }

    offDisconnect(callback?: DisconnectCallback) {
        if (this.socket) {
            this.socket.off("disconnect", callback);
        }
    }

    offError(callback?: ErrorCallback) {
        if (this.socket) {
            this.socket.off("error", callback);
        }
    }

    // Request data from Dockge backend
    requestStacks() {
        this.emit("getStackList");
    }

    requestStats() {
        this.emit("getStats");
    }

    requestSystemInfo() {
        this.emit("getSystemInfo");
    }

    requestContainers() {
        this.emit("getContainerList");
    }

    // Stack operations
    startStack(stackName: string) {
        this.emit("stackStart", { stackName });
    }

    stopStack(stackName: string) {
        this.emit("stackStop", { stackName });
    }

    restartStack(stackName: string) {
        this.emit("stackRestart", { stackName });
    }

    updateStack(stackName: string) {
        this.emit("stackUpdate", { stackName });
    }

    deleteStack(stackName: string) {
        this.emit("stackDelete", { stackName });
    }

    // Container operations
    startContainer(containerName: string) {
        this.emit("containerStart", { containerName });
    }

    stopContainer(containerName: string) {
        this.emit("containerStop", { containerName });
    }

    restartContainer(containerName: string) {
        this.emit("containerRestart", { containerName });
    }

    // Generic emit method
    private emit(event: string, data?: any) {
        if (!this.socket || !this.socket.connected) {
            console.warn(`Cannot emit '${event}': Socket not connected`);
            return;
        }
        this.socket.emit(event, data);
    }

    // Disconnect
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Check connection status
    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    // Get connection status
    getConnectionState(): string {
        if (!this.socket) return "disconnected";
        return this.socket.connected ? "connected" : "connecting";
    }
}

// Helper function to get the Dockge URL
const getDockgeUrl = (): string => {
    // Check if we're in the browser
    if (typeof window === "undefined") {
        return "http://localhost:5001"; // Default for SSR
    }

    // Try to get from config if available
    try {
        if (config?.dockge?.url) {
            return config.dockge.url;
        }
    } catch (error) {
        console.warn("Config not available, using auto-detection");
    }

    // Try to get from window (set by Next.js)
    const envUrl = (window as any).__NEXT_DATA__?.props?.pageProps?.DOCKGE_URL;
    if (envUrl) return envUrl;

    // Auto-detect based on current hostname
    const hostname = window.location.hostname;

    // If we're not on localhost, assume containerized setup
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        return `http://${hostname}:5001`;
    }

    // Default to localhost
    return "http://localhost:5001";
};

// Create singleton instance
export const dockgeApi = new DockgeApiService();

export default DockgeApiService;
