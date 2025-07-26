// frontend/src/utils/composeParser.ts
// Simple YAML parser specifically for Docker Compose files
// This avoids the js-yaml dependency and TypeScript issues

export interface ParsedService {
  name: string;
  image: string;
  ports: string[];
  volumes: string[];
  environment: Record<string, string>;
  depends_on: string[];
  restart?: string;
  labels: Record<string, string>;
  networks: string[];
  command?: string;
  working_dir?: string;
  privileged?: boolean;
  devices: string[];
  cap_add: string[];
  extra_hosts: string[];
}

export interface ParsedCompose {
  version?: string;
  services: ParsedService[];
  networks: Record<string, any>;
  volumes: Record<string, any>;
  secrets: Record<string, any>;
  configs: Record<string, any>;
}

class SimpleYamlParser {
  private lines: string[];
  private currentLine: number;
  private indentLevel: number;

  constructor(yamlContent: string) {
    this.lines = yamlContent
      .split("\n")
      .map((line) => line.replace(/\t/g, "  "));
    this.currentLine = 0;
    this.indentLevel = 0;
  }

  parse(): any {
    return this.parseObject(0);
  }

  private parseObject(baseIndent: number): any {
    const obj: any = {};

    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        this.currentLine++;
        continue;
      }

      const indent = line.length - line.trimStart().length;

      // If we've dedented, we're done with this object
      if (indent < baseIndent) {
        break;
      }

      // Skip if we're more indented than expected (we'll handle this recursively)
      if (indent > baseIndent) {
        this.currentLine++;
        continue;
      }

      // Parse key-value pair
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) {
        this.currentLine++;
        continue;
      }

      const key = trimmed.substring(0, colonIndex).trim();
      const valueStr = trimmed.substring(colonIndex + 1).trim();

      this.currentLine++;

      if (!valueStr) {
        // Multi-line value - parse nested object or array
        const nextIndent = this.getNextIndent();
        if (nextIndent > indent) {
          if (this.isNextLineArray(nextIndent)) {
            obj[key] = this.parseArray(nextIndent);
          } else {
            obj[key] = this.parseObject(nextIndent);
          }
        } else {
          obj[key] = null;
        }
      } else {
        // Single-line value
        obj[key] = this.parseValue(valueStr);
      }
    }

    return obj;
  }

  private parseArray(baseIndent: number): any[] {
    const arr: any[] = [];

    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        this.currentLine++;
        continue;
      }

      const indent = line.length - line.trimStart().length;

      if (indent < baseIndent) {
        break;
      }

      if (trimmed.startsWith("-")) {
        const valueStr = trimmed.substring(1).trim();
        this.currentLine++;

        if (!valueStr) {
          // Multi-line array item
          const nextIndent = this.getNextIndent();
          if (nextIndent > indent) {
            arr.push(this.parseObject(nextIndent));
          } else {
            arr.push(null);
          }
        } else {
          arr.push(this.parseValue(valueStr));
        }
      } else {
        this.currentLine++;
      }
    }

    return arr;
  }

  private parseValue(valueStr: string): any {
    // Remove quotes
    if (
      (valueStr.startsWith('"') && valueStr.endsWith('"')) ||
      (valueStr.startsWith("'") && valueStr.endsWith("'"))
    ) {
      return valueStr.slice(1, -1);
    }

    // Parse numbers
    if (/^\d+$/.test(valueStr)) {
      return parseInt(valueStr, 10);
    }

    if (/^\d+\.\d+$/.test(valueStr)) {
      return parseFloat(valueStr);
    }

    // Parse booleans
    if (valueStr === "true") return true;
    if (valueStr === "false") return false;
    if (valueStr === "null") return null;

    return valueStr;
  }

  private getNextIndent(): number {
    for (let i = this.currentLine; i < this.lines.length; i++) {
      const line = this.lines[i];
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        return line.length - line.trimStart().length;
      }
    }
    return 0;
  }

  private isNextLineArray(indent: number): boolean {
    for (let i = this.currentLine; i < this.lines.length; i++) {
      const line = this.lines[i];
      const trimmed = line.trim();
      const lineIndent = line.length - line.trimStart().length;

      if (trimmed && !trimmed.startsWith("#") && lineIndent === indent) {
        return trimmed.startsWith("-");
      }
    }
    return false;
  }
}

export function parseCompose(composeContent: string): ParsedCompose | null {
  try {
    const parser = new SimpleYamlParser(composeContent);
    const data = parser.parse();

    if (!data || typeof data !== "object") {
      return null;
    }

    const services: ParsedService[] = [];
    const servicesData = data.services || {};

    for (const [serviceName, serviceConfig] of Object.entries(servicesData)) {
      const config = serviceConfig as any;

      // Parse ports
      const ports: string[] = [];
      if (config.ports) {
        for (const port of Array.isArray(config.ports) ? config.ports : []) {
          if (typeof port === "object" && port.target && port.published) {
            ports.push(`${port.published}:${port.target}`);
          } else {
            ports.push(String(port));
          }
        }
      }

      // Parse volumes
      const volumes: string[] = [];
      if (config.volumes) {
        for (const volume of Array.isArray(config.volumes)
          ? config.volumes
          : []) {
          if (typeof volume === "object" && volume.source && volume.target) {
            volumes.push(`${volume.source}:${volume.target}`);
          } else {
            volumes.push(String(volume));
          }
        }
      }

      // Parse environment
      const environment: Record<string, string> = {};
      if (config.environment) {
        if (Array.isArray(config.environment)) {
          for (const env of config.environment) {
            const [key, ...valueParts] = String(env).split("=");
            if (key) {
              environment[key] = valueParts.join("=");
            }
          }
        } else if (typeof config.environment === "object") {
          for (const [key, value] of Object.entries(config.environment)) {
            environment[key] = String(value);
          }
        }
      }

      // Parse depends_on
      let depends_on: string[] = [];
      if (config.depends_on) {
        if (Array.isArray(config.depends_on)) {
          depends_on = config.depends_on.map(String);
        } else if (typeof config.depends_on === "object") {
          depends_on = Object.keys(config.depends_on);
        }
      }

      // Parse networks
      let networks: string[] = [];
      if (config.networks) {
        if (Array.isArray(config.networks)) {
          networks = config.networks.map(String);
        } else if (typeof config.networks === "object") {
          networks = Object.keys(config.networks);
        }
      }

      services.push({
        name: serviceName,
        image: String(config.image || ""),
        ports,
        volumes,
        environment,
        depends_on,
        restart: config.restart ? String(config.restart) : undefined,
        labels: config.labels || {},
        networks,
        command: config.command ? String(config.command) : undefined,
        working_dir: config.working_dir
          ? String(config.working_dir)
          : undefined,
        privileged: Boolean(config.privileged),
        devices: Array.isArray(config.devices)
          ? config.devices.map(String)
          : [],
        cap_add: Array.isArray(config.cap_add)
          ? config.cap_add.map(String)
          : [],
        extra_hosts: Array.isArray(config.extra_hosts)
          ? config.extra_hosts.map(String)
          : [],
      });
    }

    return {
      version: data.version ? String(data.version) : undefined,
      services,
      networks: data.networks || {},
      volumes: data.volumes || {},
      secrets: data.secrets || {},
      configs: data.configs || {},
    };
  } catch (error) {
    console.error("Error parsing compose file:", error);
    return null;
  }
}
