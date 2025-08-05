/**
 * TypeScript interfaces for unified stack objects
 * These match the backend unified processing exactly
 */

// =============================================================================
// UNIFIED STACK TYPES
// =============================================================================

export interface UnifiedStack {
  description?: string;
  name: string;
  path: string;
  compose_file: string;
  compose_content: Record<string, any>;
  last_modified: string;
  status: "running" | "stopped" | "partial" | "empty" | "error";

  services: Record<string, UnifiedService>;
  networks: UnifiedNetworks;
  volumes: UnifiedVolumes;
  containers: ContainerSummary;
  stats: StackStats;
  environment: EnvironmentInfo;
  health: HealthSummary;

  // Optional error info
  error?: string;
}

export interface UnifiedService {
  name: string;
  config: Record<string, any>;
  image: string;
  build?: any;
  environment: Record<string, any>;
  ports: any[];
  volumes: any[];
  networks: Record<string, any>;
  depends_on: string[];
  restart: string;
  command?: string;
  labels: Record<string, string>;

  // Container information - NO MAPPING NEEDED!
  containers: DetailedContainer[];
  container_count: number;
  running_containers: number;

  // Service status
  status: "running" | "stopped" | "partial" | "no_containers";

  // Rollup information - actual runtime data
  actual_ports: ActualPort[];
  actual_networks: string[];
  actual_volumes: ActualVolume[];

  // Health
  health_summary: ServiceHealthSummary;

  // Frontend-ready additions (from frontend-ready endpoint)
  displayName?: string;
  statusColor?: string;
  networkList?: string[];
  volumeList?: string[];
  portList?: string[];
}

export interface DetailedContainer {
  id: string;
  short_id: string;
  name: string;
  status: string;
  state: string;
  image: string;
  image_id: string;
  created: string;
  started_at?: string;
  finished_at?: string;
  labels: Record<string, string>;
  environment: string[];
  restart_policy: string;

  // Compose metadata
  compose: {
    project?: string;
    service?: string;
    container_number?: string;
    config_hash?: string;
    version?: string;
  };

  // Runtime information
  networks: Record<string, NetworkConnection>;
  mounts: Mount[];
  ports: Record<string, PortBinding[]>;
  resources: ResourceConstraints;
  health: ContainerHealth;

  // Live stats (only present if container is running)
  live_stats?: {
    cpu_percent: number;
    memory: {
      usage: number;
      limit: number;
      percent: number;
    };
  };
}

// =============================================================================
// NETWORK TYPES - Unified with rollup data
// =============================================================================

export interface UnifiedNetworks {
  compose: Record<string, ComposeNetwork>;
  services: Record<string, ServiceNetwork>;
  containers: Record<string, ContainerNetwork>;
  docker: Record<string, DockerNetwork>;
  all: UnifiedNetworkItem[];
}

export interface ComposeNetwork {
  name: string;
  config: Record<string, any>;
  driver: string;
  external: boolean;
  source: "compose";
}

export interface ServiceNetwork {
  name: string;
  services: string[];
  source: "service";
}

export interface ContainerNetwork {
  name: string;
  containers: Array<{
    container_id: string;
    container_name: string;
    service?: string;
    ip_address?: string;
    mac_address?: string;
  }>;
  source: "container";
}

export interface DockerNetwork {
  name: string;
  id: string;
  driver: string;
  scope: string;
  created: string;
  labels: Record<string, string>;
  config: Record<string, any>;
  containers_connected: number;
  source: "docker";
}

export interface UnifiedNetworkItem {
  network: string;
  sources: ("compose" | "containers" | "docker")[];
  details: {
    compose?: ComposeNetwork;
    containers?: ContainerNetwork;
    docker?: DockerNetwork;
  };
  status: "active" | "defined";
}

// =============================================================================
// VOLUME TYPES - Unified with rollup data
// =============================================================================

export interface UnifiedVolumes {
  compose: Record<string, ComposeVolume>;
  services: Record<string, ServiceVolume>;
  containers: Record<string, ContainerVolume>;
  docker: Record<string, DockerVolume>;
  all: UnifiedVolumeItem[];
}

export interface ComposeVolume {
  name: string;
  config: Record<string, any>;
  driver: string;
  external: boolean;
  source: "compose";
}

export interface ServiceVolume {
  name: string;
  services: string[];
  source: "service";
}

export interface ContainerVolume {
  name: string;
  containers: Array<{
    container_id: string;
    container_name: string;
    service?: string;
    destination: string;
    mode: string;
  }>;
  source: "container";
}

export interface DockerVolume {
  name: string;
  id: string;
  driver: string;
  mountpoint: string;
  created: string;
  labels: Record<string, string>;
  options: Record<string, any>;
  scope: string;
  source: "docker";
}

export interface UnifiedVolumeItem {
  volume: string;
  sources: ("compose" | "containers" | "docker")[];
  details: {
    compose?: ComposeVolume;
    containers?: ContainerVolume;
    docker?: DockerVolume;
  };
  status: "active" | "defined";
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

export interface ContainerSummary {
  total: number;
  running: number;
  stopped: number;
  paused: number;
  containers: DetailedContainer[];
}

export interface StackStats {
  containers: {
    total: number;
    running: number;
    stopped: number;
  };
  networks: {
    total: number;
    external: number;
  };
  volumes: {
    total: number;
    external: number;
  };
}

export interface EnvironmentInfo {
  compose_version: string;
  env_files: string[];
  secrets: string[];
  configs: string[];
}

export interface HealthSummary {
  total_containers: number;
  healthy: number;
  unhealthy: number;
  no_health_check: number;
  overall_health: "healthy" | "degraded" | "unknown";
}

export interface ServiceHealthSummary {
  status: "healthy" | "unhealthy" | "unknown" | "no_containers";
  healthy: number;
  unhealthy: number;
  total: number;
}

export interface NetworkConnection {
  network_id?: string;
  ip_address?: string;
  mac_address?: string;
  gateway?: string;
}

export interface Mount {
  type: string;
  name?: string;
  source?: string;
  destination: string;
  mode?: string;
  rw: boolean;
}

export interface PortBinding {
  host_ip: string;
  host_port: string;
}

export interface ResourceConstraints {
  memory: number;
  memory_swap: number;
  cpu_shares: number;
  cpu_quota: number;
  cpu_period: number;
  cpuset_cpus: string;
}

export interface ContainerHealth {
  status?: string;
  failing_streak: number;
  log: any[];
}

export interface ActualPort {
  container: string;
  container_port: string;
  host_port: string;
  host_ip: string;
}

export interface ActualVolume {
  container: string;
  volume: string;
  destination: string;
  mode: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface StackActionResponse {
  success: boolean;
  message: string;
  output: string;
  stack: UnifiedStack;
}

export interface StacksSummary {
  total_stacks: number;
  running_stacks: number;
  stopped_stacks: number;
  error_stacks: number;
  stacks: Array<{
    name: string;
    status: string;
    container_count: number;
    running_containers: number;
    error?: string;
  }>;
}

export interface FrontendReadyStack extends UnifiedStack {
  services: Record<
    string,
    UnifiedService & {
      displayName?: string;
      statusColor?: string;
      networkList?: string[];
      volumeList?: string[];
      portList?: string[];
    }
  >;
  ui_helpers: {
    total_services: number;
    healthy_services: number;
    network_count: number;
    volume_count: number;
    port_count: number;
  };
}

// =============================================================================
// HOOKS AND COMPONENT PROPS TYPES
// =============================================================================

export interface UseUnifiedStackResult {
  stack: UnifiedStack | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseUnifiedStacksResult {
  stacks: UnifiedStack[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Component props that no longer need transformations
export interface ServiceComponentProps {
  service: UnifiedService; // Direct use, no mapping!
  stackName: string;
  onAction?: (action: string, serviceName: string) => void;
}

export interface ContainerBlockProps {
  containers: DetailedContainer[]; // Direct use, no mapToStackContainers!
  showActions?: boolean;
}

export interface NetworkListProps {
  networks: UnifiedNetworkItem[]; // Direct use from stack.networks.all
  showSources?: boolean;
}

export interface VolumeListProps {
  volumes: UnifiedVolumeItem[]; // Direct use from stack.volumes.all
  showSources?: boolean;
}
