// Docker Port Normalizer - Converts all port formats to consistent objects

// Standard normalized port object
export interface NormalizedPort {
  published?: string;
  target: string;
  host_ip?: string;
  protocol: string;
  name?: string;
  app_protocol?: string;
  mode?: "host" | "ingress";
}

// Input port type (from Docker Compose spec)
type DockerPort =
  | string
  | {
      name?: string;
      target: string;
      published?: string;
      host_ip?: string;
      protocol?: string;
      app_protocol?: string;
      mode?: "host" | "ingress";
    };

/**
 * Normalizes a single port from any Docker Compose format to a consistent object
 */
export const normalizePort = (port: DockerPort): NormalizedPort => {
  if (typeof port === "string") {
    return parsePortString(port);
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
};

/**
 * Normalizes an array of ports from any Docker Compose format
 */
export const normalizePorts = (
  ports: DockerPort[] | undefined
): NormalizedPort[] => {
  if (!ports || !Array.isArray(ports)) {
    return [];
  }

  return ports.map(normalizePort);
};

/**
 * Parses Docker Compose port string formats into normalized objects
 * Handles all these formats:
 * - "80" → container port only
 * - "8080:80" → host:container
 * - "8080:80/tcp" → host:container/protocol
 * - "127.0.0.1:8080:80" → ip:host:container
 * - "127.0.0.1:8080:80/udp" → ip:host:container/protocol
 * - "80/udp" → container port with protocol
 */
const parsePortString = (portString: string): NormalizedPort => {
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
};

/**
 * Converts normalized ports back to Docker Compose string format
 * Useful for saving cleaned up compose files
 */
export const portToString = (port: NormalizedPort): string => {
  let result = "";

  // Add host IP if present
  if (port.host_ip) {
    result += `${port.host_ip}:`;
  }

  // Add host port if different from target
  if (port.published && port.published !== port.target) {
    result += `${port.published}:`;
  }

  // Add target port
  result += port.target;

  // Add protocol if not TCP
  if (port.protocol && port.protocol !== "tcp") {
    result += `/${port.protocol}`;
  }

  return result;
};

/**
 * Converts normalized ports back to Docker Compose object format
 * Useful for generating clean compose files
 */
export const portToObject = (port: NormalizedPort): object => {
  const obj: any = {
    target: port.target,
  };

  if (port.published) obj.published = port.published;
  if (port.host_ip) obj.host_ip = port.host_ip;
  if (port.protocol && port.protocol !== "tcp") obj.protocol = port.protocol;
  if (port.name) obj.name = port.name;
  if (port.app_protocol) obj.app_protocol = port.app_protocol;
  if (port.mode) obj.mode = port.mode;

  return obj;
};

/**
 * Utility to get all unique protocols from a list of ports
 */
export const getUniqueProtocols = (ports: NormalizedPort[]): string[] => {
  const protocols = new Set(ports.map((p) => p.protocol));
  return Array.from(protocols);
};

/**
 * Utility to group ports by protocol
 */
export const groupPortsByProtocol = (
  ports: NormalizedPort[]
): Record<string, NormalizedPort[]> => {
  return ports.reduce((groups, port) => {
    const protocol = port.protocol;
    if (!groups[protocol]) {
      groups[protocol] = [];
    }
    groups[protocol].push(port);
    return groups;
  }, {} as Record<string, NormalizedPort[]>);
};

/**
 * Utility to find port conflicts (same published port)
 */
export const findPortConflicts = (
  ports: NormalizedPort[]
): NormalizedPort[][] => {
  const publishedPorts = new Map<string, NormalizedPort[]>();

  ports.forEach((port) => {
    if (port.published) {
      const key = `${port.host_ip || "*"}:${port.published}`;
      if (!publishedPorts.has(key)) {
        publishedPorts.set(key, []);
      }
      publishedPorts.get(key)!.push(port);
    }
  });

  // Return only groups with conflicts (more than 1 port)
  return Array.from(publishedPorts.values()).filter(
    (group) => group.length > 1
  );
};

// Usage Examples:

// 1. Normalize service ports for editing:
// const service = parseServices(composeContent)[0];
// const normalizedPorts = normalizePorts(service.ports);
// console.log(normalizedPorts); // Clean array of NormalizedPort objects

// 2. Process all ports in a service:
// const cleanPorts = normalizePorts([
//   "80",
//   "8080:80/tcp",
//   "127.0.0.1:443:443",
//   { target: "3000", published: "3000", protocol: "tcp" }
// ]);

// 3. Convert back to strings for display:
// const portStrings = cleanPorts.map(portToString);

// 4. Convert back to objects for YAML export:
// const portObjects = cleanPorts.map(portToObject);

// 5. Find issues:
// const conflicts = findPortConflicts(cleanPorts);
// const protocols = getUniqueProtocols(cleanPorts);

// 6. Group for display:
// const grouped = groupPortsByProtocol(cleanPorts);
