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

// Define the skeleton template separately (not in the store data)
const skeletonTemplate = {
  name: "{{APP_NAME}}",
  description: "{{APP_DESCRIPTION}}",
  services: {
    "{{SERVICE_NAME}}": {
      image: "{{SERVICE_IMAGE}}",
      restart: "unless-stopped",
      expose: ["{{SERVICE_PORT}}"],
      environment: {
        TZ: "${TZ:-UTC}",
      },
      networks: ["{{NETWORK_NAME}}"],
      "x-meta": {
        category: "{{SERVICE_CATEGORY}}",
        description: "{{SERVICE_DESCRIPTION}}",
        tags: ["{{SERVICE_TAGS}}"],
      },
    },
  },
  networks: {
    "{{NETWORK_NAME}}": {
      driver: "bridge",
    },
  },
  volumes: {
    "{{VOLUME_NAME}}": {
      driver: "local",
    },
  },
  secrets: {},
  configs: {},
  environment: {},
  "x-meta": {
    category: "{{APP_CATEGORY}}",
    description: "{{APP_DESCRIPTION}}",
    tags: ["{{APP_TAGS}}"],
    created_by: "en-dash",
    created_at: new Date().toISOString(),
  },
};

// Clean default stack (no placeholders)
const defaultStack: NewStack = {
  name: "",
  description: "",
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

    // Enhanced generateYaml function that merges real data with skeleton template
    generateYaml: () => {
      const stack = get().newStack;

      // Create preview stack by merging real data with skeleton template
      const previewStack = {
        // Start with real data or fall back to template placeholders
        name: stack.name || skeletonTemplate.name,
        description: stack.description || skeletonTemplate.description,

        // Services: use real services if any exist, otherwise show template
        services:
          Object.keys(stack.services).length > 0
            ? stack.services
            : skeletonTemplate.services,

        // Networks: use real networks if any exist, otherwise show template
        networks:
          Object.keys(stack.networks).length > 0
            ? stack.networks
            : skeletonTemplate.networks,

        // Volumes: use real volumes if any exist, otherwise show template
        volumes:
          Object.keys(stack.volumes).length > 0
            ? stack.volumes
            : skeletonTemplate.volumes,

        // Secrets and configs: only show if they exist (no template needed)
        ...(Object.keys(stack.secrets).length > 0 && {
          secrets: stack.secrets,
        }),
        ...(Object.keys(stack.configs).length > 0 && {
          configs: stack.configs,
        }),

        // Environment: only show if exists
        ...(Object.keys(stack.environment).length > 0 && {
          environment: stack.environment,
        }),

        // x-meta: merge real data with template, include description
        "x-meta": {
          ...skeletonTemplate["x-meta"],
          // Only use top-level x-meta, not configs x-meta
          ...stack["x-meta"],
          // Ensure description is included if available
          ...(stack.description && { description: stack.description }),
        },
      };

      // Helper function to transform name to kebab-case for Docker Compose safety
      const toKebabCase = (str: string): string => {
        return str
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      };

      // Build comment header from preview stack
      const appName = previewStack.name || "{{APP_NAME}}";
      const appDescription = previewStack.description || "{{APP_DESCRIPTION}}";
      const services = Object.keys(previewStack.services).join(" + ");
      const networks = Object.keys(previewStack.networks).join(", ");

      const header = `# =========================================================================
# ${appName.toUpperCase()}
# ${appDescription}
# ${services.toUpperCase()}
# Served on ${networks.toUpperCase()}
# =========================================================================

`;

      // Build the compose object from preview stack
      const composeObj: any = {};

      // Add project name (transformed to kebab-case for Docker Compose safety)
      composeObj.name = previewStack.name
        ? toKebabCase(previewStack.name)
        : skeletonTemplate.name;

      // Transform services to use role-based naming
      if (previewStack.services) {
        composeObj.services = {};

        // Track functions for global x-meta
        const functions: Record<string, string> = {};

        Object.entries(previewStack.services).forEach(
          ([originalServiceId, service]) => {
            // Determine the service key (role-based)
            const serviceRole = service["x-meta"]?.role || originalServiceId;
            const serviceName = service.name || originalServiceId;

            // Track this function mapping
            functions[serviceRole] = serviceName;

            // Create the service config with role as key
            const serviceConfig: any = {
              image: service.image,
              restart: service.restart || "unless-stopped",
            };

            // Add ports if they exist
            if (service.ports && service.ports.length > 0) {
              serviceConfig.ports = service.ports;
            }

            // Add expose if they exist
            if (service.expose && service.expose.length > 0) {
              serviceConfig.expose = service.expose;
            }

            // Add environment if exists
            if (
              service.environment &&
              Object.keys(service.environment).length > 0
            ) {
              serviceConfig.environment = service.environment;
            }

            // Add networks if they exist
            if (service.networks) {
              serviceConfig.networks = service.networks;
            }

            // Add volumes if they exist
            if (service.volumes && service.volumes.length > 0) {
              serviceConfig.volumes = service.volumes;
            }

            // Add depends_on if exists
            if (service.depends_on) {
              serviceConfig.depends_on = service.depends_on;
            }

            // Add other common fields
            if (service.command) serviceConfig.command = service.command;
            if (service.working_dir)
              serviceConfig.working_dir = service.working_dir;
            if (service.user) serviceConfig.user = service.user;
            if (service.hostname) serviceConfig.hostname = service.hostname;
            if (service.privileged)
              serviceConfig.privileged = service.privileged;
            if (service.devices) serviceConfig.devices = service.devices;
            if (service.cap_add) serviceConfig.cap_add = service.cap_add;
            if (service.cap_drop) serviceConfig.cap_drop = service.cap_drop;
            if (service.security_opt)
              serviceConfig.security_opt = service.security_opt;
            if (service.labels) serviceConfig.labels = service.labels;
            if (service.logging) serviceConfig.logging = service.logging;
            if (service.healthcheck)
              serviceConfig.healthcheck = service.healthcheck;

            // Add x-meta with provider name and metadata (but not role since key IS the role)
            const xMeta: any = {
              name: serviceName, // The actual service provider name (e.g., "Redis", "PostgreSQL")
            };

            // Add other x-meta fields except role
            if (service["x-meta"]?.category)
              xMeta.category = service["x-meta"].category;
            if (service["x-meta"]?.tags && service["x-meta"].tags.length > 0) {
              xMeta.tags = service["x-meta"].tags;
            }
            if (service["x-meta"]?.description)
              xMeta.description = service["x-meta"].description;
            if (service["x-meta"]?.documentation)
              xMeta.documentation = service["x-meta"].documentation;
            if (service["x-meta"]?.icon) xMeta.icon = service["x-meta"].icon;

            serviceConfig["x-meta"] = xMeta;

            // Use role as the service key
            composeObj.services[serviceRole] = serviceConfig;
          }
        );

        // Update global x-meta with functions mapping
        if (previewStack["x-meta"]) {
          composeObj["x-meta"] = {
            ...previewStack["x-meta"],
            functions: functions, // Add the role -> provider mapping
          };
        }
      }

      // Add networks
      if (
        previewStack.networks &&
        Object.keys(previewStack.networks).length > 0
      ) {
        composeObj.networks = previewStack.networks;
      }

      // Add volumes
      if (
        previewStack.volumes &&
        Object.keys(previewStack.volumes).length > 0
      ) {
        composeObj.volumes = previewStack.volumes;
      }

      // Add secrets if they exist
      if (
        previewStack.secrets &&
        Object.keys(previewStack.secrets).length > 0
      ) {
        composeObj.secrets = previewStack.secrets;
      }

      // Add configs if they exist
      if (
        previewStack.configs &&
        Object.keys(previewStack.configs).length > 0
      ) {
        composeObj.configs = previewStack.configs;
      }

      // Add global environment if exists
      if (
        previewStack.environment &&
        Object.keys(previewStack.environment).length > 0
      ) {
        composeObj.environment = previewStack.environment;
      }

      try {
        const yamlContent = YAML.stringify(composeObj, {
          indent: 2,
          lineWidth: 0,
          minContentWidth: 0,
          doubleQuotedAsJSON: false,
        });

        return header + yamlContent;
      } catch (error) {
        console.error("Error generating YAML:", error);
        return (
          header + "# Error generating YAML\n# Please check your configuration"
        );
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
