// frontend/src/services/migrationWrapper.ts
// This file provides backward compatibility for your existing components

import { apiService } from "./apiService";

// Types that match your existing interfaces
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

// Wrapper class that mimics your old dockgeApi but uses REST
class DockgeApiWrapper {
  private eventListeners: { [event: string]: Function[] } = {};

  // Connection methods (REST is always "connected")
  isConnected(): boolean {
    return true; // REST API is stateless
  }

  async connect(): Promise<void> {
    // Test connection to API
    try {
      await apiService.healthCheck();
      this.emit("connect");
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  disconnect(): void {
    this.emit("disconnect");
  }

  getConnectionState(): string {
    return "connected";
  }

  // Event system for compatibility
  onConnect(callback: () => void) {
    this.addEventListener("connect", callback);
  }

  offConnect(callback: () => void) {
    this.removeEventListener("connect", callback);
  }

  onDisconnect(callback: () => void) {
    this.addEventListener("disconnect", callback);
  }

  offDisconnect(callback: () => void) {
    this.removeEventListener("disconnect", callback);
  }

  onError(callback: (error: any) => void) {
    this.addEventListener("error", callback);
  }

  offError(callback: (error: any) => void) {
    this.removeEventListener("error", callback);
  }

  onStackList(callback: (stacks: DockgeStack[]) => void) {
    this.addEventListener("stackList", callback);
  }

  offStackList(callback?: (stacks: DockgeStack[]) => void) {
    this.removeEventListener("stackList", callback);
  }

  onStackChanged(callback: (stack: DockgeStack) => void) {
    this.addEventListener("stackChanged", callback);
  }

  offStackChanged(callback?: (stack: DockgeStack) => void) {
    this.removeEventListener("stackChanged", callback);
  }

  onStats(callback: (stats: DockgeStats) => void) {
    this.addEventListener("stats", callback);
  }

  offStats(callback?: (stats: DockgeStats) => void) {
    this.removeEventListener("stats", callback);
  }

  onContainerList(callback: (containers: DockgeContainer[]) => void) {
    this.addEventListener("containerList", callback);
  }

  offContainerList(callback?: (containers: DockgeContainer[]) => void) {
    this.removeEventListener("containerList", callback);
  }

  onContainerChanged(callback: (container: DockgeContainer) => void) {
    this.addEventListener("containerChanged", callback);
  }

  offContainerChanged(callback?: (container: DockgeContainer) => void) {
    this.removeEventListener("containerChanged", callback);
  }

  onSystemInfo(callback: (info: any) => void) {
    this.addEventListener("systemInfo", callback);
  }

  offSystemInfo(callback?: (info: any) => void) {
    this.removeEventListener("systemInfo", callback);
  }

  // Request methods that fetch data and emit events
  async requestStacks() {
    try {
      const apiStacks = await apiService.getStacks();
      const stacks: DockgeStack[] = apiStacks.map((stack) => ({
        name: stack.name,
        status: stack.status as "running" | "stopped" | "error",
        containers: stack.containers.map((container) => ({
          name: container.name,
          status: container.status as any,
          image: container.image,
          ports: container.ports || [],
          created: container.created,
          stack: container.compose_project,
        })),
        path: stack.path,
        composeFile: stack.compose_file,
        lastUpdated: stack.last_modified,
      }));
      this.emit("stackList", stacks);
    } catch (error) {
      this.emit("error", error);
    }
  }

  async requestStats() {
    try {
      const dockerStats = await apiService.getDockerStats();
      const stats: DockgeStats = {
        totalStacks: 0, // Will be calculated when stacks are loaded
        runningStacks: 0,
        stoppedStacks: 0,
        totalContainers: dockerStats.containers.total,
        runningContainers: dockerStats.containers.running,
        exitedContainers: dockerStats.containers.stopped,
        inactiveContainers: dockerStats.containers.paused,
        totalImages: dockerStats.images.total,
        totalVolumes: dockerStats.volumes.total,
        totalNetworks: dockerStats.networks.total,
      };
      this.emit("stats", stats);
    } catch (error) {
      this.emit("error", error);
    }
  }

  async requestContainers() {
    try {
      const apiContainers = await apiService.getContainers();
      const containers: DockgeContainer[] = apiContainers.map((container) => ({
        name: container.name,
        status: container.status as any,
        image: container.image,
        ports: container.ports || [],
        created: container.created,
        stack: container.compose_project,
      }));
      this.emit("containerList", containers);
    } catch (error) {
      this.emit("error", error);
    }
  }

  async requestSystemInfo() {
    try {
      const info = await apiService.getSystemInfo();
      this.emit("systemInfo", info);
    } catch (error) {
      this.emit("error", error);
    }
  }

  // Stack operations - these now actually work!
  async startStack(stackName: string) {
    try {
      await apiService.startStack(stackName);
      // Emit stack changed event
      this.emit("stackChanged", { name: stackName, status: "starting" });
      // Refresh stacks after a delay
      setTimeout(() => this.requestStacks(), 2000);
    } catch (error) {
      this.emit("error", error);
    }
  }

  async stopStack(stackName: string) {
    try {
      await apiService.stopStack(stackName);
      this.emit("stackChanged", { name: stackName, status: "stopping" });
      setTimeout(() => this.requestStacks(), 2000);
    } catch (error) {
      this.emit("error", error);
    }
  }

  async restartStack(stackName: string) {
    try {
      await apiService.restartStack(stackName);
      this.emit("stackChanged", { name: stackName, status: "starting" });
      setTimeout(() => this.requestStacks(), 3000);
    } catch (error) {
      this.emit("error", error);
    }
  }

  updateStack(stackName: string) {
    console.log(`Update stack ${stackName} - not implemented yet`);
  }

  deleteStack(stackName: string) {
    console.log(`Delete stack ${stackName} - not implemented yet`);
  }

  startContainer(containerName: string) {
    console.log(`Start container ${containerName} - not implemented yet`);
  }

  stopContainer(containerName: string) {
    console.log(`Stop container ${containerName} - not implemented yet`);
  }

  restartContainer(containerName: string) {
    console.log(`Restart container ${containerName} - not implemented yet`);
  }

  // Event system implementation
  private addEventListener(event: string, callback: Function) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  private removeEventListener(event: string, callback?: Function) {
    if (this.eventListeners[event]) {
      if (callback) {
        this.eventListeners[event] = this.eventListeners[event].filter(
          (cb) => cb !== callback
        );
      } else {
        this.eventListeners[event] = [];
      }
    }
  }

  private emit(event: string, ...args: any[]) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((callback) => callback(...args));
    }
  }
}

// Create singleton instance
export const dockgeApi = new DockgeApiWrapper();

// Also export types and service for new code
export { apiService } from "./apiService";
export type { ApiContainer, ApiStack, ApiSystemStats } from "./apiService";
