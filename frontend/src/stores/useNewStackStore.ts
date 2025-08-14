import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import YAML from "yaml";

// Enhanced interfaces for full Docker Compose support
interface VolumeMount {
  type: "bind" | "volume" | "tmpfs";
  source: string;
  target: string;
  read_only?: boolean;
  bind?: {
    propagation?:
      | "shared"
      | "slave"
      | "private"
      | "rshared"
      | "rslave"
      | "rprivate";
  };
  volume?: {
    nocopy?: boolean;
  };
  tmpfs?: {
    size?: string;
  };
}

interface PortMapping {
  target: number;
  published?: number;
  protocol?: "tcp" | "udp";
  mode?: "host" | "ingress";
}

interface HealthCheck {
  test: string | string[];
  interval?: string;
  timeout?: string;
  retries?: number;
  start_period?: string;
  start_interval?: string;
}

interface DeployConfig {
  mode?: "replicated" | "global";
  replicas?: number;
  labels?: Record<string, string>;
  update_config?: {
    parallelism?: number;
    delay?: string;
    failure_action?: "continue" | "rollback" | "pause";
    monitor?: string;
    max_failure_ratio?: number;
    order?: "start-first" | "stop-first";
  };
  rollback_config?: {
    parallelism?: number;
    delay?: string;
    failure_action?: "continue" | "pause";
    monitor?: string;
    max_failure_ratio?: number;
    order?: "start-first" | "stop-first";
  };
  resources?: {
    limits?: {
      cpus?: string;
      memory?: string;
      pids?: number;
    };
    reservations?: {
      cpus?: string;
      memory?: string;
      generic_resources?: Array<{
        discrete_resource_spec?: {
          kind: string;
          value: number;
        };
      }>;
    };
  };
  restart_policy?: {
    condition?: "none" | "on-failure" | "any";
    delay?: string;
    max_attempts?: number;
    window?: string;
  };
  placement?: {
    constraints?: string[];
    preferences?: Array<{
      spread: string;
    }>;
    max_replicas_per_node?: number;
  };
}

interface ServiceConfig {
  // Basic service properties
  name?: string;
  image?: string;
  build?:
    | string
    | {
        context: string;
        dockerfile?: string;
        args?: Record<string, string>;
        target?: string;
        cache_from?: string[];
        cache_to?: string[];
        additional_contexts?: Record<string, string>;
      };

  // Runtime configuration
  command?: string | string[];
  entrypoint?: string | string[];
  working_dir?: string;
  user?: string;

  // Environment
  environment?: Record<string, string>;
  env_file?: string | string[];

  // Networking
  ports?: (string | number | PortMapping)[];
  expose?: (string | number)[];
  networks?:
    | string[]
    | Record<
        string,
        {
          aliases?: string[];
          ipv4_address?: string;
          ipv6_address?: string;
          link_local_ips?: string[];
          priority?: number;
        }
      >;
  external_links?: string[];
  links?: string[];
  hostname?: string;
  domainname?: string;
  mac_address?: string;
  extra_hosts?: string[] | Record<string, string>;

  // Storage
  volumes?: (string | VolumeMount)[];
  tmpfs?: string | string[];

  // Dependencies
  depends_on?:
    | string[]
    | Record<
        string,
        {
          condition?:
            | "service_started"
            | "service_healthy"
            | "service_completed_successfully";
          restart?: boolean;
        }
      >;

  // Resource management
  deploy?: DeployConfig;
  cpus?: string;
  cpu_shares?: number;
  cpu_quota?: number;
  cpu_period?: number;
  cpu_rt_runtime?: number;
  cpu_rt_period?: number;
  cpuset?: string;
  mem_limit?: string;
  memswap_limit?: string;
  mem_reservation?: string;
  oom_kill_disable?: boolean;
  oom_score_adj?: number;

  // Security
  privileged?: boolean;
  user_ns_mode?: string;
  userns_mode?: string;
  pid?: string;
  ipc?: string;
  security_opt?: string[];
  cap_add?: string[];
  cap_drop?: string[];
  cgroup_parent?: string;
  devices?: string[];
  device_cgroup_rules?: string[];

  // Lifecycle
  restart?: "no" | "always" | "on-failure" | "unless-stopped";
  init?: boolean;
  stop_grace_period?: string;
  stop_signal?: string;
  healthcheck?: HealthCheck;

  // Labels and metadata
  labels?: Record<string, string>;
  logging?: {
    driver?: string;
    options?: Record<string, string>;
  };

  // Platform specific
  platform?: string;
  isolation?: string;

  // Advanced
  stdin_open?: boolean;
  tty?: boolean;
  read_only?: boolean;
  shm_size?: string | number;
  sysctls?: Record<string, string> | string[];
  ulimits?: Record<
    string,
    | number
    | {
        soft: number;
        hard: number;
      }
  >;

  // Secrets and configs
  secrets?:
    | string[]
    | Array<{
        source: string;
        target?: string;
        uid?: string;
        gid?: string;
        mode?: number;
      }>;
  configs?:
    | string[]
    | Array<{
        source: string;
        target?: string;
        uid?: string;
        gid?: string;
        mode?: number;
      }>;

  // Extensions (x-meta for our app)
  "x-meta"?: {
    category?: string;
    tags?: string[];
    description?: string;
    documentation?: string;
    icon?: string;
  };
}

interface NetworkConfig {
  name?: string;
  driver?: "bridge" | "host" | "overlay" | "macvlan" | "none";
  driver_opts?: Record<string, string>;
  attachable?: boolean;
  enable_ipv6?: boolean;
  external?:
    | boolean
    | {
        name: string;
      };
  internal?: boolean;
  labels?: Record<string, string>;
  ipam?: {
    driver?: string;
    config?: Array<{
      subnet?: string;
      ip_range?: string;
      gateway?: string;
      aux_addresses?: Record<string, string>;
    }>;
    options?: Record<string, string>;
  };
}

interface VolumeConfig {
  name?: string;
  driver?: string;
  driver_opts?: Record<string, string>;
  external?:
    | boolean
    | {
        name: string;
      };
  labels?: Record<string, string>;
}

interface SecretConfig {
  name?: string;
  file?: string;
  external?:
    | boolean
    | {
        name: string;
      };
  labels?: Record<string, string>;
  driver?: string;
  driver_opts?: Record<string, string>;
  template_driver?: string;
}

interface ConfigItemConfig {
  name?: string;
  file?: string;
  external?:
    | boolean
    | {
        name: string;
      };
  labels?: Record<string, string>;
  template_driver?: string;
}

interface NewStack {
  // Basic stack info
  name: string;
  description: string;
  version?: string;

  // Main sections
  services: Record<string, ServiceConfig>;
  networks: Record<string, NetworkConfig>;
  volumes: Record<string, VolumeConfig>;
  secrets: Record<string, SecretConfig>;
  configs: Record<string, ConfigItemConfig>;

  // Global environment and extensions
  environment: Record<string, string>;
  "x-meta"?: {
    category?: string;
    tags?: string[];
    created_by?: string;
    created_at?: string;
    template?: string;
  };
}

interface NewStackStore {
  newStack: NewStack;
  setNewStack: (updater: (stack: NewStack) => void) => void;
  resetStack: () => void;

  // Helper methods for YAML generation
  generateYaml: () => string;
  validateStack: () => {
    errors: string[];
    warnings: string[];
  };

  // Convenience methods for adding/removing items
  addService: (serviceId: string, config?: Partial<ServiceConfig>) => void;
  removeService: (serviceId: string) => void;
  addNetwork: (networkId: string, config?: Partial<NetworkConfig>) => void;
  removeNetwork: (networkId: string) => void;
  addVolume: (volumeId: string, config?: Partial<VolumeConfig>) => void;
  removeVolume: (volumeId: string) => void;
}

const defaultStack: NewStack = {
  name: "",
  description: "",
  version: "3.8",
  services: {},
  networks: {},
  volumes: {},
  secrets: {},
  configs: {},
  environment: {},
};

export const useNewStackStore = create<NewStackStore>()(
  immer((set, get) => ({
    newStack: defaultStack,

    setNewStack: (updater) =>
      set((state) => {
        updater(state.newStack);
      }),

    resetStack: () => set(() => ({ newStack: { ...defaultStack } })),

    // Generate YAML from current stack
    generateYaml: () => {
      const stack = get().newStack;

      // Build the compose object
      const composeObj: any = {};

      // Add version if specified
      if (stack.version) {
        composeObj.version = stack.version;
      }

      // Add services
      if (Object.keys(stack.services).length > 0) {
        composeObj.services = {};
        Object.entries(stack.services).forEach(([serviceId, service]) => {
          // Clean up the service config for YAML output
          const cleanService = { ...service };
          delete cleanService.name; // name is the key, not a property

          // Only include non-empty properties
          Object.keys(cleanService).forEach((key) => {
            const value = cleanService[key as keyof ServiceConfig];
            if (
              value === undefined ||
              value === null ||
              (Array.isArray(value) && value.length === 0) ||
              (typeof value === "object" && Object.keys(value).length === 0) ||
              value === ""
            ) {
              delete cleanService[key as keyof ServiceConfig];
            }
          });

          composeObj.services[serviceId] = cleanService;
        });
      }

      // Add networks
      if (Object.keys(stack.networks).length > 0) {
        composeObj.networks = {};
        Object.entries(stack.networks).forEach(([networkId, network]) => {
          const cleanNetwork = { ...network };
          delete cleanNetwork.name;

          // Clean up empty properties
          Object.keys(cleanNetwork).forEach((key) => {
            const value = cleanNetwork[key as keyof NetworkConfig];
            if (
              value === undefined ||
              value === null ||
              (Array.isArray(value) && value.length === 0) ||
              (typeof value === "object" && Object.keys(value).length === 0) ||
              value === ""
            ) {
              delete cleanNetwork[key as keyof NetworkConfig];
            }
          });

          composeObj.networks[networkId] = cleanNetwork;
        });
      }

      // Add volumes
      if (Object.keys(stack.volumes).length > 0) {
        composeObj.volumes = {};
        Object.entries(stack.volumes).forEach(([volumeId, volume]) => {
          const cleanVolume = { ...volume };
          delete cleanVolume.name;

          Object.keys(cleanVolume).forEach((key) => {
            const value = cleanVolume[key as keyof VolumeConfig];
            if (
              value === undefined ||
              value === null ||
              (Array.isArray(value) && value.length === 0) ||
              (typeof value === "object" && Object.keys(value).length === 0) ||
              value === ""
            ) {
              delete cleanVolume[key as keyof VolumeConfig];
            }
          });

          composeObj.volumes[volumeId] = cleanVolume;
        });
      }

      // Add secrets
      if (Object.keys(stack.secrets).length > 0) {
        composeObj.secrets = {};
        Object.entries(stack.secrets).forEach(([secretId, secret]) => {
          const cleanSecret = { ...secret };
          delete cleanSecret.name;
          composeObj.secrets[secretId] = cleanSecret;
        });
      }

      // Add configs
      if (Object.keys(stack.configs).length > 0) {
        composeObj.configs = {};
        Object.entries(stack.configs).forEach(([configId, config]) => {
          const cleanConfig = { ...config };
          delete cleanConfig.name;
          composeObj.configs[configId] = cleanConfig;
        });
      }

      try {
        return YAML.stringify(composeObj, {
          indent: 2,
          lineWidth: 0, // Disable line wrapping
          minContentWidth: 0,
          doubleQuotedAsJSON: false,
        });
      } catch (error) {
        console.error("Error generating YAML:", error);
        return "# Error generating YAML\n# Please check your configuration";
      }
    },

    // Validate the current stack configuration
    validateStack: () => {
      const stack = get().newStack;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic validation
      if (!stack.name.trim()) {
        errors.push("Stack name is required");
      }

      if (Object.keys(stack.services).length === 0) {
        warnings.push("No services defined");
      }

      // Service validation
      Object.entries(stack.services).forEach(([serviceId, service]) => {
        if (!service.image && !service.build) {
          errors.push(
            `Service "${serviceId}" must have either an image or build configuration`
          );
        }

        // Port validation
        if (service.ports) {
          service.ports.forEach((port, index) => {
            if (typeof port === "string" && !port.includes(":")) {
              warnings.push(
                `Service "${serviceId}" port ${
                  index + 1
                } should specify host:container mapping`
              );
            }
          });
        }
      });

      // Network validation
      Object.entries(stack.networks).forEach(([networkId, network]) => {
        if (network.external && !network.driver) {
          warnings.push(
            `External network "${networkId}" should specify a driver`
          );
        }
      });

      return { errors, warnings };
    },

    // Convenience methods
    addService: (serviceId, config = {}) =>
      set((state) => {
        state.newStack.services[serviceId] = {
          image: "",
          restart: "unless-stopped",
          ...config,
        };
      }),

    removeService: (serviceId) =>
      set((state) => {
        delete state.newStack.services[serviceId];
      }),

    addNetwork: (networkId, config = {}) =>
      set((state) => {
        state.newStack.networks[networkId] = {
          driver: "bridge",
          ...config,
        };
      }),

    removeNetwork: (networkId) =>
      set((state) => {
        delete state.newStack.networks[networkId];
      }),

    addVolume: (volumeId, config = {}) =>
      set((state) => {
        state.newStack.volumes[volumeId] = {
          driver: "local",
          ...config,
        };
      }),

    removeVolume: (volumeId) =>
      set((state) => {
        delete state.newStack.volumes[volumeId];
      }),
  }))
);

export type {
  ServiceConfig,
  NetworkConfig,
  VolumeConfig,
  NewStack,
  VolumeMount,
  PortMapping,
  HealthCheck,
  DeployConfig,
};
