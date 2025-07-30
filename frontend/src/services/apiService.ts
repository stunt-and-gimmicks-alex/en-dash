// src/services/apiService.ts - Main orchestrator
import { ApiStackService } from "./api/apiStackService";
import { ApiServicesService } from "./api/apiServicesService";
import { ApiContainerService } from "./api/apiContainerService";
import { BaseApiService } from "./api/baseApiService";

// Smart API URL detection function
const getApiBaseUrl = (): string => {
  // Check for environment variable first
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Auto-detect based on current window location
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;

    // If accessing via server IP, use same IP for API
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:8001/api`;
    }
  }

  // Default fallback for localhost development
  return "http://localhost:8001/api";
};

const API_BASE_URL = getApiBaseUrl();

// Log the detected URL for debugging
console.log("🔗 API Base URL detected:", API_BASE_URL);

// System stats interfaces
export interface ApiSystemStats {
  cpu: {
    percent: number;
    per_cpu: number[];
    count: number;
    frequency: number;
    load_average: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percent: number;
    available?: number;
    cached?: number;
    buffers?: number;
    raw_used?: number;
    raw_percent?: number;
  };
  swap: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  disk: Array<{
    device: string;
    mountpoint: string;
    fstype: string;
    total: number;
    used: number;
    free: number;
    percent: number;
  }>;
  network: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
    interfaces: Array<{
      name: string;
      ip_addresses: string[];
      is_up: boolean;
      speed: number;
      mtu: number;
    }>;
  };
  uptime: number;
  timestamp: string;
}

// Main API Service Orchestrator
class ApiService extends BaseApiService {
  // Sub-services
  public readonly stacks: ApiStackService;
  public readonly services: ApiServicesService;
  public readonly containers: ApiContainerService;

  constructor(baseUrl: string = API_BASE_URL) {
    super(baseUrl);
    console.log("🚀 ApiService initialized with URL:", this.baseUrl);

    // Initialize sub-services
    this.stacks = new ApiStackService(baseUrl);
    this.services = new ApiServicesService(baseUrl);
    this.containers = new ApiContainerService(baseUrl);
  }

  // =============================================================================
  // SYSTEM MONITORING
  // =============================================================================

  async getSystemStats(): Promise<ApiSystemStats> {
    return this.fetchApi("/system/stats");
  }

  async getSystemInfo(): Promise<any> {
    return this.fetchApi("/system/info");
  }

  // =============================================================================
  // FILESYSTEM OPERATIONS
  // =============================================================================

  async browseFilesystem(path: string = "/"): Promise<any> {
    const encodedPath = encodeURIComponent(path);
    return this.fetchApi(`/system/filesystem/browse?path=${encodedPath}`);
  }

  async getDiskUsage(): Promise<
    Array<{
      device: string;
      mountpoint: string;
      total: number;
      used: number;
      free: number;
      percent: number;
    }>
  > {
    return this.fetchApi("/system/filesystem/disk-usage");
  }

  // =============================================================================
  // CONVENIENCE METHODS - High-level operations using sub-services
  // =============================================================================

  // Get stacks with parsed services
  async getStacksWithServices(serviceLevel = "intermediate" as const) {
    return this.stacks.getStacksWithServices(this.services, serviceLevel);
  }

  // Get single stack with parsed services
  async getStackWithServices(
    stackName: string,
    serviceLevel = "intermediate" as const
  ) {
    return this.stacks.getStackWithServices(
      stackName,
      this.services,
      serviceLevel
    );
  }

  // Get services for a specific stack
  getServicesForStack(stack: any, level = "intermediate" as const) {
    return this.services.parseServices(
      stack.compose_content,
      stack.containers,
      level
    );
  }

  // =============================================================================
  // PORT NORMALIZATION UTILITIES
  // =============================================================================

  // Normalize ports from any service
  normalizePorts(ports: any[] | undefined) {
    return this.services.normalizeServicePorts(ports);
  }

  // Normalize single port
  normalizePort(port: any) {
    return this.services.normalizeServicePort(port);
  }

  // Complete stack management with services
  async startStackAndRefresh(stackName: string) {
    await this.stacks.startStack(stackName);
    return this.getStackWithServices(stackName);
  }

  async stopStackAndRefresh(stackName: string) {
    await this.stacks.stopStack(stackName);
    return this.getStackWithServices(stackName);
  }

  async restartStackAndRefresh(stackName: string) {
    await this.stacks.restartStack(stackName);
    return this.getStackWithServices(stackName);
  }

  // Service-level operations
  async startServiceAndRefresh(stackName: string, serviceName: string) {
    await this.services.startService(stackName, serviceName);
    return this.getStackWithServices(stackName);
  }

  async stopServiceAndRefresh(stackName: string, serviceName: string) {
    await this.services.stopService(stackName, serviceName);
    return this.getStackWithServices(stackName);
  }

  async restartServiceAndRefresh(stackName: string, serviceName: string) {
    await this.services.restartService(stackName, serviceName);
    return this.getStackWithServices(stackName);
  }

  // Container-level operations
  async startContainerAndRefresh(stackName: string, containerId: string) {
    await this.containers.startContainer(containerId);
    return this.getStackWithServices(stackName);
  }

  async stopContainerAndRefresh(stackName: string, containerId: string) {
    await this.containers.stopContainer(containerId);
    return this.getStackWithServices(stackName);
  }

  async restartContainerAndRefresh(stackName: string, containerId: string) {
    await this.containers.restartContainer(containerId);
    return this.getStackWithServices(stackName);
  }
}

// =============================================================================
// EXPORT ALL TYPES AND SERVICES
// =============================================================================

// Re-export types from sub-services for convenience
export type { ApiStack, ApiDockerStats } from "./api/apiStackService";
export type {
  DockerService,
  DockerServiceShort,
  DockerServiceIntermediate,
  ServiceParseLevel,
  NormalizedPort,
} from "./api/apiServicesService";
export type { ApiContainer, StackContainer } from "./api/apiContainerService";

// Re-export utility functions for backwards compatibility
export const mapToStackContainer = (apiContainer: any) =>
  apiService.containers.mapToStackContainer(apiContainer);
export const mapToStackContainers = (apiContainers: any[]) =>
  apiService.containers.mapToStackContainers(apiContainers);

// Create and export singleton instance
export const apiService = new ApiService();

// Export class for testing/custom instances
export default ApiService;

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*
// Basic usage - access sub-services directly:
const stacks = await apiService.stacks.getStacks();
const containers = await apiService.containers.getContainers();

// High-level convenience methods:
const stacksWithServices = await apiService.getStacksWithServices("short");
const fullStackDetail = await apiService.getStackWithServices("my-app", "full");

// Operations with automatic refresh:
await apiService.startStackAndRefresh("my-app");
await apiService.restartServiceAndRefresh("my-app", "web");
await apiService.stopContainerAndRefresh("my-app", "container-id");

// Different service levels based on use case:
// - "short": Service list views, quick overviews
// - "intermediate": Service detail panels, configuration views  
// - "full": Advanced configuration, debugging, complete compose editing
*/
