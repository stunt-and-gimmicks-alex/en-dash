// utils/generateServiceConfigs.ts
import type { UnifiedService } from "@/types/unified";

export type SyncStatus =
  | "synced"
  | "no_compose"
  | "no_runtime"
  | "value_mismatch";

export type ServiceConfigRow = {
  sync_status: SyncStatus; // Keep this for easy access
  values: string[]; // Array of all column values
};

export type ServiceConfigSection = {
  key: string;
  label: string;
  headers: string[];
  data: ServiceConfigRow[];
};

export type ServiceConfig = ServiceConfigSection[];

export type NetworkConfig = {
  compose_network: string;
  runtime_network: string;
  sync_status: SyncStatus;
};

export type PortConfig = {
  compose_port: string;
  runtime_port: string;
  host_ip: string;
  host_port: string;
  container_port: string;
  protocol: string;
  sync_status: SyncStatus;
};

export type StorageConfig = {
  volume_type: string;
  volume_name: string;
  source: string;
  destination: string;
  mode: string;
  compose_volume: string;
  runtime_volume: string;
  sync_status: SyncStatus;
};

export type EnvironmentConfig = {
  key: string;
  compose_value: string;
  runtime_value: string;
  sync_status: SyncStatus;
};

export type ConfigItem = {
  key: string;
  compose_value: string;
  runtime_value: string;
  sync_status: SyncStatus;
};

export type DependencyConfig = {
  service_name: string;
  compose_dependency: boolean;
  runtime_dependency: boolean;
  sync_status: SyncStatus;
};

export function generateServiceConfigs(s: UnifiedService): ServiceConfig {
  // Helper function to normalize port strings
  function parsePortString(portStr: string) {
    const parts = portStr.split(":");
    if (parts.length === 2) {
      return {
        host_port: parts[0],
        container_port: parts[1].split("/")[0],
        protocol: parts[1].includes("/") ? parts[1].split("/")[1] : "tcp",
      };
    }
    return {
      host_port: "",
      container_port: portStr.split("/")[0],
      protocol: portStr.includes("/") ? portStr.split("/")[1] : "tcp",
    };
  }

  // Helper function to normalize ports for comparison
  function normalizePortForComparison(port: string): string {
    // Remove protocol if it's tcp (default)
    if (port.endsWith("/tcp")) {
      return port.slice(0, -4);
    }
    return port;
  }

  // Networks
  const networks: NetworkConfig[] = [];
  // Handle both array format and object format for networks
  const composeNetworks = new Set(
    Array.isArray(s.networks)
      ? s.networks
      : s.networks
      ? Object.keys(s.networks)
      : []
  );
  const runtimeNetworks = new Set(s.actual_networks || []);
  const allNetworks = new Set([...composeNetworks, ...runtimeNetworks]);

  allNetworks.forEach((network) => {
    const hasCompose = composeNetworks.has(network);
    const hasRuntime = runtimeNetworks.has(network);

    networks.push({
      compose_network: hasCompose ? network : "",
      runtime_network: hasRuntime ? network : "",
      sync_status:
        hasCompose && hasRuntime
          ? "synced"
          : hasRuntime
          ? "no_compose"
          : "no_runtime",
    });
  });

  // Ports
  const ports: PortConfig[] = [];
  const composePorts = s.ports || [];
  const runtimePorts = s.actual_ports || [];

  // Process compose ports
  composePorts.forEach((port) => {
    const portStr = typeof port === "string" ? port : JSON.stringify(port);
    const parsed = parsePortString(portStr);

    // Find matching runtime port - normalize both for comparison
    const runtimeMatch = runtimePorts.find((rp) => {
      const normalizedRuntime = normalizePortForComparison(rp.container_port);
      const normalizedCompose = normalizePortForComparison(
        parsed.container_port
      );
      return normalizedRuntime === normalizedCompose;
    });

    ports.push({
      compose_port: portStr,
      runtime_port: runtimeMatch
        ? `${runtimeMatch.host_port}:${runtimeMatch.container_port}`
        : "",
      host_ip: runtimeMatch?.host_ip || "",
      host_port: runtimeMatch?.host_port || parsed.host_port,
      container_port: parsed.container_port,
      protocol: parsed.protocol,
      sync_status: runtimeMatch ? "synced" : "no_runtime",
    });
  });

  // Process runtime-only ports
  runtimePorts.forEach((runtimePort) => {
    const hasCompose = composePorts.some((cp) => {
      const portStr = typeof cp === "string" ? cp : JSON.stringify(cp);
      const parsed = parsePortString(portStr);
      const normalizedRuntime = normalizePortForComparison(
        runtimePort.container_port
      );
      const normalizedCompose = normalizePortForComparison(
        parsed.container_port
      );
      return normalizedRuntime === normalizedCompose;
    });

    if (!hasCompose) {
      ports.push({
        compose_port: "",
        runtime_port: `${runtimePort.host_port}:${runtimePort.container_port}`,
        host_ip: runtimePort.host_ip,
        host_port: runtimePort.host_port,
        container_port: runtimePort.container_port,
        protocol: "tcp", // Default, could be enhanced
        sync_status: "no_compose",
      });
    }
  });

  // Helper function to resolve relative paths to absolute paths
  function resolveVolumePath(path: string): string {
    if (path.startsWith("./")) {
      // Convert relative path to absolute path
      // This assumes your stacks are in /opt/stacks/<stack_name>/
      // You might need to adjust this based on your actual structure
      return path.replace("./", "/opt/stacks/caddy/"); // You might want to pass stack name as parameter
    }
    return path;
  }

  // Helper function to normalize volume strings for comparison
  function normalizeVolumeForComparison(volStr: string): {
    source: string;
    destination: string;
    mode: string;
  } {
    const parts = volStr.split(":");
    const source = resolveVolumePath(parts[0] || "");
    const destination = parts[1] || "";
    const mode = parts[2] || "rw";

    return { source, destination, mode };
  }

  // Storage (combining volumes and mounts)
  const storage: StorageConfig[] = [];
  const composeVolumes = s.volumes || [];
  const runtimeVolumes = s.actual_volumes || [];
  const allMounts = s.containers.flatMap((c) => c.mounts);

  // Process compose volumes
  composeVolumes.forEach((vol) => {
    const volStr = typeof vol === "string" ? vol : JSON.stringify(vol);
    const normalizedCompose = normalizeVolumeForComparison(volStr);

    // Find matching runtime volume by comparing normalized paths
    const runtimeMatch = runtimeVolumes.find((rv) => {
      const runtimeSource = resolveVolumePath(rv.volume);
      return (
        runtimeSource === normalizedCompose.source ||
        rv.destination === normalizedCompose.destination
      );
    });

    // Also check bind mounts for matches
    const mountMatch = allMounts.find((mount) => {
      if (mount.type !== "bind") return false;
      const mountSource = resolveVolumePath(mount.source || "");
      return (
        mountSource === normalizedCompose.source ||
        mount.destination === normalizedCompose.destination
      );
    });

    const match = runtimeMatch || mountMatch;

    storage.push({
      volume_type: runtimeMatch ? "volume" : mountMatch ? "bind" : "volume",
      volume_name: volStr.split(":")[0] || "",
      source: normalizedCompose.source,
      destination: normalizedCompose.destination,
      mode: normalizedCompose.mode,
      compose_volume: volStr,
      runtime_volume: match
        ? runtimeMatch
          ? `${runtimeMatch.volume}:${runtimeMatch.destination}:${runtimeMatch.mode}`
          : `${mountMatch?.source}:${mountMatch?.destination}:${
              mountMatch?.mode || "rw"
            }`
        : "",
      sync_status: match ? "synced" : "no_runtime",
    });
  });

  // Process runtime-only volumes and mounts
  runtimeVolumes.forEach((runtimeVol) => {
    const runtimeSource = resolveVolumePath(runtimeVol.volume);

    const hasCompose = composeVolumes.some((cv) => {
      const volStr = typeof cv === "string" ? cv : JSON.stringify(cv);
      const normalizedCompose = normalizeVolumeForComparison(volStr);
      return (
        runtimeSource === normalizedCompose.source ||
        runtimeVol.destination === normalizedCompose.destination
      );
    });

    if (!hasCompose) {
      storage.push({
        volume_type: "volume",
        volume_name: runtimeVol.volume,
        source: runtimeVol.volume,
        destination: runtimeVol.destination,
        mode: runtimeVol.mode,
        compose_volume: "",
        runtime_volume: `${runtimeVol.volume}:${runtimeVol.destination}:${runtimeVol.mode}`,
        sync_status: "no_compose",
      });
    }
  });

  // Process other mounts (bind, tmpfs, etc.) that aren't already matched
  allMounts
    .filter((mount) => mount.type !== "volume")
    .forEach((mount) => {
      const mountSource = resolveVolumePath(mount.source || "");

      // Check if this mount is already accounted for in compose volumes
      const hasCompose = composeVolumes.some((cv) => {
        const volStr = typeof cv === "string" ? cv : JSON.stringify(cv);
        const normalizedCompose = normalizeVolumeForComparison(volStr);
        return (
          mountSource === normalizedCompose.source ||
          mount.destination === normalizedCompose.destination
        );
      });

      if (!hasCompose) {
        storage.push({
          volume_type: mount.type,
          volume_name: mount.name || "",
          source: mount.source || "",
          destination: mount.destination,
          mode: mount.mode || "",
          compose_volume: "",
          runtime_volume: `${mount.source || "N/A"}:${mount.destination}:${
            mount.mode || "rw"
          }`,
          sync_status: "no_compose",
        });
      }
    });

  // Environment
  const environment: EnvironmentConfig[] = [];
  const composeEnv = s.environment || {};
  const allRuntimeEnv = new Map<string, string>();

  // Parse compose environment - handle both object and array formats
  const parsedComposeEnv = new Map<string, string>();

  if (Array.isArray(composeEnv)) {
    // Handle array format: ["KEY=value", "KEY2=value2"]
    composeEnv.forEach((envStr: string) => {
      const [key, ...valueParts] = envStr.split("=");
      const value = valueParts.join("=");
      parsedComposeEnv.set(key, value);
    });
  } else if (typeof composeEnv === "object") {
    // Handle object format: { KEY: "value", KEY2: "value2" }
    Object.entries(composeEnv).forEach(([key, value]) => {
      parsedComposeEnv.set(key, String(value));
    });
  }

  // Collect all runtime environment variables
  s.containers.forEach((container) => {
    container.environment.forEach((env) => {
      const [key, ...valueParts] = env.split("=");
      const value = valueParts.join("=");
      allRuntimeEnv.set(key, value);
    });
  });

  // Process all environment variables
  const allEnvKeys = new Set([
    ...parsedComposeEnv.keys(),
    ...allRuntimeEnv.keys(),
  ]);

  allEnvKeys.forEach((key) => {
    const composeValue = parsedComposeEnv.get(key);
    const runtimeValue = allRuntimeEnv.get(key);

    let sync_status: EnvironmentConfig["sync_status"];

    // Normalize empty/undefined values to empty string for comparison
    const normalizedComposeValue = composeValue || "";
    const normalizedRuntimeValue = runtimeValue || "";

    if (parsedComposeEnv.has(key) && allRuntimeEnv.has(key)) {
      // Both exist - compare normalized values (empty string = empty string)
      sync_status =
        normalizedComposeValue === normalizedRuntimeValue
          ? "synced"
          : "value_mismatch";
    } else if (allRuntimeEnv.has(key)) {
      sync_status = "no_compose";
    } else {
      sync_status = "no_runtime";
    }

    environment.push({
      key,
      compose_value: normalizedComposeValue,
      runtime_value: normalizedRuntimeValue,
      sync_status,
    });
  });

  // Configs
  const configs: ConfigItem[] = [
    {
      key: "image",
      compose_value: s.image,
      runtime_value: s.containers[0]?.image || "",
      sync_status:
        s.image === (s.containers[0]?.image || "")
          ? "synced"
          : "value_mismatch",
    },
    {
      key: "restart_policy",
      compose_value: s.restart,
      runtime_value: s.containers[0]?.restart_policy || "",
      sync_status:
        s.restart === (s.containers[0]?.restart_policy || "")
          ? "synced"
          : "value_mismatch",
    },
  ];

  // Add command if it exists
  if (s.command) {
    configs.push({
      key: "command",
      compose_value: s.command,
      runtime_value: "", // Hard to get runtime command
      sync_status: "no_runtime",
    });
  }

  // Add non-compose labels
  Object.entries(s.labels || {})
    .filter(([key]) => !key.startsWith("com.docker.compose"))
    .forEach(([key, value]) => {
      configs.push({
        key: `label.${key}`,
        compose_value: value,
        runtime_value: s.containers[0]?.labels[key] || "",
        sync_status:
          value === (s.containers[0]?.labels[key] || "")
            ? "synced"
            : "value_mismatch",
      });
    });

  // Dependencies
  const dependencies: DependencyConfig[] = s.depends_on.map((dep) => ({
    service_name: dep,
    compose_dependency: true,
    runtime_dependency: true, // Hard to determine from runtime
    sync_status: "synced", // Assume synced for now
  }));

  return [
    {
      key: "networks",
      label: "Networks",
      headers: ["Sync Status", "Compose", "Runtime"],
      data: networks.map((net) => ({
        sync_status: net.sync_status,
        values: [net.sync_status, net.compose_network, net.runtime_network],
      })),
    },
    {
      key: "ports",
      label: "Ports",
      headers: [
        "Sync Status",
        "Compose Port",
        "Runtime Port",
        "Host IP",
        "Host Port",
        "Container Port",
        "Protocol",
      ],
      data: ports.map((port) => ({
        sync_status: port.sync_status,
        values: [
          port.sync_status,
          port.compose_port,
          port.runtime_port,
          port.host_ip,
          port.host_port,
          port.container_port,
          port.protocol,
        ],
      })),
    },
    {
      key: "storage",
      label: "Storage",
      headers: [
        "Sync Status",
        "Compose Volume",
        "Runtime Volume",
        "Source",
        "Destination",
        "Mode",
      ],
      data: storage.map((stor) => ({
        sync_status: stor.sync_status,
        values: [
          stor.sync_status,
          stor.compose_volume,
          stor.runtime_volume,
          stor.source,
          stor.destination,
          stor.mode,
        ],
      })),
    },
    {
      key: "environment",
      label: "Environment",
      headers: ["Sync Status", "Key", "Compose ENV", "Runtime ENV"],
      data: environment.map((env) => ({
        sync_status: env.sync_status,
        values: [
          env.sync_status,
          env.key,
          env.compose_value,
          env.runtime_value,
        ],
      })),
    },
    {
      key: "configs",
      label: "Configuration",
      headers: ["Sync Status", "Key", "Compose Config", "Runtime Config"],
      data: configs.map((config) => ({
        sync_status: config.sync_status,
        values: [
          config.sync_status,
          config.key,
          config.compose_value,
          config.runtime_value,
        ],
      })),
    },
    {
      key: "dependencies",
      label: "Dependencies",
      headers: ["Sync Status", "Service", "Compose", "Runtime"],
      data: dependencies.map((dep) => ({
        sync_status: dep.sync_status,
        values: [
          dep.sync_status,
          dep.service_name,
          dep.compose_dependency.toString(),
          dep.runtime_dependency.toString(),
        ],
      })),
    },
  ];
}
