// src/services/api/apiServicesService.ts
import * as yaml from "js-yaml";
import { BaseApiService } from "./baseApiService";
import { type ApiContainer } from "./apiContainerService";
import {
  getServiceHealthStatus,
  type ServiceHealthStatus,
  type HealthcheckResult,
  type ContainerHealth,
} from "../../utils/healthcheckUtils";

export type ServiceParseLevel = "short" | "intermediate" | "full";

// Import port normalizer types and healthcheck types
export interface NormalizedPort {
  published?: string;
  target: string;
  host_ip?: string;
  protocol: string;
  name?: string;
  app_protocol?: string;
  mode?: "host" | "ingress";
}

// Re-export healthcheck types from utils
export type {
  ServiceHealthStatus,
  HealthcheckResult,
  ContainerHealth,
} from "../../utils/healthcheckUtils";

export interface DockerService {
  // Essential identification
  name: string;
  annotations?: {
    note?: string | null;
  };
  attach?: boolean;

  // Build configuration (leave as blob for now)
  build?: string | any;

  // Block I/O configuration
  blkio_config?: {
    weight?: number;
    weight_device?: Array<{
      path: string;
      weight: number;
    }>;
    device_read_bps?: Array<{
      path: string;
      rate: number | string;
    }>;
    device_write_bps?: Array<{
      path: string;
      rate: number | string;
    }>;
    device_read_iops?: Array<{
      path: string;
      rate: number;
    }>;
    device_write_iops?: Array<{
      path: string;
      rate: number;
    }>;
  };

  // CPU configuration
  cpu_count?: number;
  cpu_percent?: number;
  cpu_shares?: number;
  cpu_period?: number;
  cpu_quota?: number;
  cpu_rt_runtime?: string;
  cpu_rt_period?: string;
  cpus?: number;
  cpuset?: string;

  // Capabilities
  cap_add?: string[];
  cap_drop?: string[];

  // Control groups
  cgroup?: "host" | "private";
  cgroup_parent?: string;

  // Command and entrypoint
  command?: string | string[] | null;
  entrypoint?: string | string[];

  // Configs
  configs?: Array<
    | string
    | {
        source: string;
        target: string;
        uid?: string;
        gid?: string;
        mode?: number;
      }
  >;

  // Container name
  container_name?: string;

  // Credentials
  credential_spec?: {
    file?: string;
    registry?: string;
  };

  // Dependencies
  depends_on?: Array<
    | string
    | {
        service: string;
        condition:
          | "service_started"
          | "service_healthy"
          | "service_complete_successfully";
        restart?: boolean;
        required?: boolean;
      }
  >;

  // Deployment (leave as blob for now)
  deploy?: any;
  develop?: any;

  // Device configuration
  device_cgroup_rules?: string[];
  devices?: Array<
    | string
    | {
        host_path: string;
        container_path: string;
        cgroup_perms?: string;
      }
  >;

  // DNS configuration
  dns?: string[];
  dns_opt?: string[];
  dns_search?: string | string[];
  domainname?: string;

  // Driver options
  driver_opts?: any;

  // Environment configuration
  env_file?:
    | string
    | Array<
        | string
        | {
            path: string;
            required?: boolean;
            format?: null | "raw" | string;
          }
      >;
  environment?: string[] | { [key: string]: string };

  // Network exposure
  expose?: string[];

  // Extension
  extends?: {
    file: string;
    service: string;
  };

  // External links
  external_links?: string[];

  // Host configuration
  extra_hosts?: string[] | { [host: string]: string };

  // GPU configuration
  gpus?:
    | "all"
    | Array<{
        driver?: string;
        count?: number;
      }>;

  // Groups
  group_add?: string[];

  // Health check
  healthcheck?: {
    test: string | string[];
    interval?: string;
    timeout?: string;
    retries?: number;
    start_period?: string;
    start_interval?: string;
  };

  // Hostname
  hostname?: string;

  // Image
  image?: string;

  // Initialization
  init?: boolean;

  // IPC
  ipc?: string;

  // Isolation
  isolation?: string;

  // Labels
  labels?: string[] | { [key: string]: string };
  label_file?: string | string[];

  // Links
  links?: string[];

  // Logging
  logging?: {
    driver: string;
    options?: { [key: string]: string };
  };

  // MAC address
  mac_address?: string;

  // Memory configuration
  mem_limit?: string;
  mem_reservation?: string;
  mem_swappiness?: number;
  memswap_limit?: string;

  // Models (AI/ML)
  models?:
    | string[]
    | Array<{
        name: string;
        endpoint_var: string;
        model_var: string;
      }>;

  // Network configuration
  network_mode?: string;
  networks?:
    | string[]
    | {
        [networkName: string]: {
          aliases?: string[];
          interface_name?: string;
          ipv4_address?: string;
          ipv6_address?: string;
          link_local_ips?: string[];
          mac_address?: string;
          gw_priority?: number;
          priority?: number;
        };
      };

  // OOM configuration
  oom_kill_disable?: boolean;
  oom_score_adj?: number;

  // Process configuration
  pid?: string;
  pids_limit?: number;

  // Platform
  platform?: string;

  // Port configuration
  ports?:
    | string[]
    | Array<{
        name?: string;
        target: string;
        published?: string;
        host_ip?: string;
        protocol?: string;
        app_protocol?: string;
        mode?: "host" | "ingress";
      }>;

  // Lifecycle hooks
  post_start?: Array<{
    command: string;
    user?: string;
    privileged?: boolean;
    working_dir?: string;
    environment?: string[];
  }>;
  pre_stop?: Array<{
    command: string;
    user?: string;
    privileged?: boolean;
    working_dir?: string;
    environment?: string[];
  }>;

  // Privileges
  privileged?: boolean;

  // Profiles
  profiles?: string[];

  // Provider
  provider?: {
    type: string;
    options?: { [key: string]: any };
  };

  // Pull policy
  pull_policy?: string;

  // Read only
  read_only?: boolean;

  // Restart policy
  restart?: string;

  // Runtime
  runtime?: string;

  // Scale
  scale?: number;

  // Secrets
  secrets?:
    | string[]
    | Array<{
        source: string;
        target?: string;
        uid?: string;
        gid?: string;
        mode?: number;
      }>;

  // Security
  security_opt?: string[];

  // Shared memory
  shm_size?: string;

  // Standard input
  stdin_open?: boolean;

  // Stop configuration
  stop_grace_period?: string;
  stop_signal?: string;

  // Storage
  storage_opt?: {
    size?: string;
  };

  // System controls
  sysctls?: string[] | { [key: string]: number };

  // Temporary filesystem
  tmpfs?: string | string[];

  // TTY
  tty?: boolean;

  // User limits
  ulimits?: { [name: string]: number | { soft: number; hard: number } };

  // API socket
  use_api_socket?: boolean;

  // User
  user?: string;

  // User namespace
  userns_mode?: string;

  // UTS namespace
  uts?: string;

  // Volumes
  volumes?:
    | string[]
    | Array<{
        type: "volume" | "bind" | "tmpfs" | "image" | "npipe" | "cluster";
        source?: string;
        target: string;
        read_only?: boolean;
        bind?: {
          nocopy?: boolean;
          subpath?: string;
        };
        volume?: {
          nocopy?: boolean;
          subpath?: string;
        };
        tmpfs?: {
          size?: number | string;
          mode?: number;
        };
        image?: {
          subpath?: string;
        };
        consistency?: string;
      }>;

  // Volumes from
  volumes_from?: string[];

  // Working directory
  working_dir?: string;

  // Runtime data (not from compose file)
  containers?: ApiContainer[];
  status?: "running" | "stopped" | "partial";
  normalizedPorts?: NormalizedPort[]; // Always include normalized ports
  healthStatus?: ServiceHealthStatus; // Always include health status
}

export interface DockerServiceShort {
  name: string;
  image?: string;
  status?: "running" | "stopped" | "partial";
  ports?:
    | string[]
    | Array<{ target: string; published?: string; protocol?: string }>;
  containers?: ApiContainer[];
  normalizedPorts?: NormalizedPort[]; // Always include normalized ports
  healthStatus?: ServiceHealthStatus; // Always include health status
}

export interface DockerServiceIntermediate extends DockerServiceShort {
  environment?: string[] | { [key: string]: string };
  volumes?:
    | string[]
    | Array<{ source?: string; target: string; type?: string }>;
  command?: string | string[] | null;
  entrypoint?: string | string[];
  depends_on?: Array<string | { service: string; condition: string }>;
  restart?: string;
  healthcheck?: {
    test: string | string[];
    interval?: string;
    timeout?: string;
    retries?: number;
  };
  labels?: string[] | { [key: string]: string };
  networks?: string[] | { [key: string]: any };
  normalizedPorts?: NormalizedPort[]; // Always include normalized ports
  healthStatus?: ServiceHealthStatus; // Always include health status
}

export class ApiServicesService extends BaseApiService {
  // =============================================================================
  // PORT NORMALIZATION UTILITIES
  // =============================================================================

  /**
   * Normalizes a single port from any Docker Compose format to a consistent object
   */
  private normalizePort(port: any): NormalizedPort {
    if (typeof port === "string") {
      return this.parsePortString(port);
    }

    // Already an object, just ensure defaults
    return {
      published: port.published,
      target: port.target,
      host_ip: port.host_ip,
      protocol: port.protocol || "tcp",
      name: port.name,
      app_protocol: port.app_protocol,
      mode: port.mode,
    };
  }

  /**
   * Normalizes an array of ports from any Docker Compose format
   */
  private normalizePorts(ports: any[] | undefined): NormalizedPort[] {
    if (!ports || !Array.isArray(ports)) {
      return [];
    }

    return ports.map((port) => this.normalizePort(port));
  }

  /**
   * Parses Docker Compose port string formats into normalized objects
   */
  private parsePortString(portString: string): NormalizedPort {
    // Split by '/' to separate protocol
    const [portPart, protocol = "tcp"] = portString.split("/");

    // Split by ':' to get IP, host port, and container port
    const parts = portPart.split(":");

    if (parts.length === 1) {
      // "80" or "80/udp" → just container port
      return {
        target: parts[0],
        protocol,
        name: undefined,
        published: undefined,
        host_ip: undefined,
        app_protocol: undefined,
        mode: undefined,
      };
    } else if (parts.length === 2) {
      // "8080:80" → host:container
      return {
        published: parts[0],
        target: parts[1],
        protocol,
        name: undefined,
        host_ip: undefined,
        app_protocol: undefined,
        mode: undefined,
      };
    } else if (parts.length === 3) {
      // "127.0.0.1:8080:80" → ip:host:container
      return {
        host_ip: parts[0],
        published: parts[1],
        target: parts[2],
        protocol,
        name: undefined,
        app_protocol: undefined,
        mode: undefined,
      };
    } else {
      // Fallback for malformed strings
      return {
        target: portString,
        protocol: "tcp",
        name: undefined,
        published: undefined,
        host_ip: undefined,
        app_protocol: undefined,
        mode: undefined,
      };
    }
  }

  // =============================================================================
  // SERVICE PARSING AND MANAGEMENT
  // =============================================================================

  parseServices(
    composeContent: string | null,
    containers: ApiContainer[] = [],
    level: ServiceParseLevel = "intermediate"
  ): DockerService[] | DockerServiceShort[] | DockerServiceIntermediate[] {
    if (!composeContent) {
      return this.createServicesFromContainers(containers, level);
    }

    try {
      const compose = yaml.load(composeContent) as any;
      const services = compose?.services || {};

      return Object.entries(services).map(([name, config]: [string, any]) => {
        const serviceContainers = containers.filter(
          (c) => c.compose_service === name
        );

        const runningContainers = serviceContainers.filter(
          (c) => c.status === "running"
        );
        const status: "running" | "stopped" | "partial" =
          serviceContainers.length === 0
            ? "stopped"
            : runningContainers.length === serviceContainers.length
            ? "running"
            : runningContainers.length > 0
            ? "partial"
            : "stopped";

        if (level === "short") {
          return {
            name,
            image: config.image,
            status,
            ports: config.ports || [],
            containers: serviceContainers,
            normalizedPorts: this.normalizePorts(config.ports),
            healthStatus: this.getServiceHealthStatus(serviceContainers),
          } as DockerServiceShort;
        }

        if (level === "intermediate") {
          return {
            name,
            image: config.image,
            status,
            ports: config.ports || [],
            containers: serviceContainers,
            environment: config.environment || [],
            volumes: config.volumes || [],
            command: config.command,
            entrypoint: config.entrypoint,
            depends_on: config.depends_on || [],
            restart: config.restart,
            healthcheck: config.healthcheck,
            labels: config.labels || {},
            networks: config.networks || [],
            normalizedPorts: this.normalizePorts(config.ports),
            healthStatus: this.getServiceHealthStatus(serviceContainers),
          } as DockerServiceIntermediate;
        }

        // Full level - map all properties
        return {
          name,
          ...config,
          containers: serviceContainers,
          status,
          normalizedPorts: this.normalizePorts(config.ports),
          healthStatus: this.getServiceHealthStatus(serviceContainers),
        } as DockerService;
      });
    } catch (error) {
      console.error("Error parsing compose content:", error);
      return this.createServicesFromContainers(containers, level);
    }
  }

  private createServicesFromContainers(
    containers: ApiContainer[],
    level: ServiceParseLevel
  ): DockerService[] | DockerServiceShort[] | DockerServiceIntermediate[] {
    const serviceGroups = containers.reduce((groups, container) => {
      const serviceName = container.compose_service || container.name;
      if (!groups[serviceName]) {
        groups[serviceName] = [];
      }
      groups[serviceName].push(container);
      return groups;
    }, {} as { [key: string]: ApiContainer[] });

    return Object.entries(serviceGroups).map(([name, serviceContainers]) => {
      const runningContainers = serviceContainers.filter(
        (c) => c.status === "running"
      );
      const status: "running" | "stopped" | "partial" =
        runningContainers.length === serviceContainers.length
          ? "running"
          : runningContainers.length > 0
          ? "partial"
          : "stopped";

      const firstContainer = serviceContainers[0];

      if (level === "short") {
        return {
          name,
          image: firstContainer?.image,
          status,
          ports: firstContainer?.ports || [],
          containers: serviceContainers,
          normalizedPorts: this.normalizePorts(firstContainer?.ports),
        } as DockerServiceShort;
      }

      if (level === "intermediate") {
        return {
          name,
          image: firstContainer?.image,
          status,
          ports: firstContainer?.ports || [],
          containers: serviceContainers,
          environment: firstContainer?.environment || [],
          volumes: [],
          restart: firstContainer?.restart_policy,
          labels: firstContainer?.labels || {},
          normalizedPorts: this.normalizePorts(firstContainer?.ports),
        } as DockerServiceIntermediate;
      }

      // Full level
      return {
        name,
        image: firstContainer?.image,
        status,
        ports: firstContainer?.ports || [],
        containers: serviceContainers,
        environment: firstContainer?.environment || [],
        restart: firstContainer?.restart_policy,
        labels: firstContainer?.labels || {},
        normalizedPorts: this.normalizePorts(firstContainer?.ports),
      } as DockerService;
    });
  }

  // =============================================================================
  // PUBLIC PORT NORMALIZATION METHODS
  // =============================================================================

  /**
   * Public method to normalize ports (for external use)
   */
  public normalizeServicePorts(ports: any[] | undefined): NormalizedPort[] {
    return this.normalizePorts(ports);
  }

  /**
   * Gets the health status for a service based on its containers
   */
  private getServiceHealthStatus(
    containers: ApiContainer[]
  ): ServiceHealthStatus {
    return getServiceHealthStatus(containers);
  }

  // =============================================================================
  // SERVICE OPERATIONS
  // =============================================================================

  async startService(
    stackName: string,
    serviceName: string
  ): Promise<{ message: string }> {
    return this.fetchApi(`/stacks/${stackName}/services/${serviceName}/start`, {
      method: "POST",
    });
  }

  async stopService(
    stackName: string,
    serviceName: string
  ): Promise<{ message: string }> {
    return this.fetchApi(`/stacks/${stackName}/services/${serviceName}/stop`, {
      method: "POST",
    });
  }

  async restartService(
    stackName: string,
    serviceName: string
  ): Promise<{ message: string }> {
    return this.fetchApi(
      `/stacks/${stackName}/services/${serviceName}/restart`,
      {
        method: "POST",
      }
    );
  }

  async scaleService(
    stackName: string,
    serviceName: string,
    replicas: number
  ): Promise<{ message: string }> {
    return this.fetchApi(`/stacks/${stackName}/services/${serviceName}/scale`, {
      method: "POST",
      body: JSON.stringify({ replicas }),
    });
  }
}
