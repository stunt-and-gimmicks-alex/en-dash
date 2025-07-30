// src/utils/stackValidation.ts
// Prosumer-grade validation and warnings for Docker stacks

import type { ApiStack, ApiContainer } from "@/services/apiService";
import type { DockerService } from "@/services/api/apiServicesService";

export interface ValidationIssue {
  type: "warning" | "error" | "info" | "suggestion";
  category:
    | "health"
    | "security"
    | "performance"
    | "monitoring"
    | "configuration";
  title: string;
  description: string;
  impact: "low" | "medium" | "high" | "critical";
  fix?: string;
  learnMoreUrl?: string;
}

export interface StackValidationResult {
  score: number; // 0-100, higher is better
  issues: ValidationIssue[];
  healthGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Validates a Docker stack for prosumer-grade best practices
 */
export const validateStack = (
  stack: ApiStack,
  services?: DockerService[]
): StackValidationResult => {
  const issues: ValidationIssue[] = [];

  // Health Monitoring Checks
  validateHealthMonitoring(stack, issues);

  // Security Checks
  validateSecurity(stack, services, issues);

  // Performance Checks
  validatePerformance(stack, services, issues);

  // Configuration Checks
  validateConfiguration(stack, services, issues);

  // Monitoring & Observability
  validateObservability(stack, services, issues);

  // Calculate score and grade
  const summary = {
    critical: issues.filter((i) => i.impact === "critical").length,
    high: issues.filter((i) => i.impact === "high").length,
    medium: issues.filter((i) => i.impact === "medium").length,
    low: issues.filter((i) => i.impact === "low").length,
  };

  const score = calculateScore(summary);
  const healthGrade = getHealthGrade(score);

  return {
    score,
    issues,
    healthGrade,
    summary,
  };
};

/**
 * Health Monitoring Validation
 */
const validateHealthMonitoring = (
  stack: ApiStack,
  issues: ValidationIssue[]
) => {
  const containers = stack.containers || [];

  // Check for missing health checks
  const containersWithoutHealth = containers.filter((container) => {
    const health = (container as any).health || (container as any).Health;
    return !health;
  });

  if (containersWithoutHealth.length > 0) {
    issues.push({
      type: "warning",
      category: "health",
      title: "Missing Health Checks",
      description: `${containersWithoutHealth.length}/${containers.length} containers lack health check configuration`,
      impact: "medium",
      fix: "Add HEALTHCHECK instructions to Dockerfiles or healthcheck configs to compose services",
      learnMoreUrl:
        "https://docs.docker.com/engine/reference/builder/#healthcheck",
    });
  }

  // Check for containers that haven't been restarted recently
  const oldContainers = containers.filter((container) => {
    const started = new Date(container.started_at || 0);
    const daysSinceStart =
      (Date.now() - started.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceStart > 30;
  });

  if (oldContainers.length > 0) {
    issues.push({
      type: "info",
      category: "monitoring",
      title: "Long-Running Containers",
      description: `${oldContainers.length} containers have been running for over 30 days`,
      impact: "low",
      fix: "Consider periodic restarts to apply updates and clear memory leaks",
    });
  }
};

/**
 * Security Validation
 */
const validateSecurity = (
  stack: ApiStack,
  services: DockerService[] | undefined,
  issues: ValidationIssue[]
) => {
  const containers = stack.containers || [];

  // Check for privileged containers
  const privilegedContainers = containers.filter((container) => {
    return (
      container.labels?.["com.docker.compose.privileged"] === "true" ||
      (container as any).privileged === true
    );
  });

  if (privilegedContainers.length > 0) {
    issues.push({
      type: "error",
      category: "security",
      title: "Privileged Containers",
      description: `${privilegedContainers.length} containers running in privileged mode`,
      impact: "critical",
      fix: "Remove privileged: true unless absolutely necessary. Use specific capabilities instead.",
      learnMoreUrl:
        "https://docs.docker.com/engine/reference/run/#runtime-privilege-and-linux-capabilities",
    });
  }

  // Check for containers running as root
  const rootContainers = containers.filter((container) => {
    const env = container.environment || [];
    return !env.some(
      (e) =>
        e.includes("USER=") && !e.includes("USER=root") && !e.includes("USER=0")
    );
  });

  if (rootContainers.length > 0) {
    issues.push({
      type: "warning",
      category: "security",
      title: "Containers Running as Root",
      description: `${rootContainers.length} containers may be running as root user`,
      impact: "high",
      fix: "Add USER instruction in Dockerfile or user: directive in compose file",
    });
  }

  // Check for exposed sensitive ports
  const sensitivePortsExposed = containers.some((container) => {
    const ports = container.ports || [];
    const sensitivePorts = ["22", "3389", "5432", "3306", "6379", "27017"];
    return ports.some((port) =>
      sensitivePorts.some(
        (sensitive) => port.includes(`:${sensitive}`) || port === sensitive
      )
    );
  });

  if (sensitivePortsExposed) {
    issues.push({
      type: "warning",
      category: "security",
      title: "Sensitive Ports Exposed",
      description:
        "Database or admin ports (SSH, RDP, PostgreSQL, MySQL, Redis, MongoDB) are exposed",
      impact: "high",
      fix: "Use internal networks or VPN instead of exposing sensitive ports directly",
    });
  }
};

/**
 * Performance Validation
 */
const validatePerformance = (
  stack: ApiStack,
  services: DockerService[] | undefined,
  issues: ValidationIssue[]
) => {
  const containers = stack.containers || [];

  // Check for missing resource limits
  if (services) {
    const servicesWithoutLimits = services.filter((service) => {
      return !service.mem_limit && !service.cpus && !service.cpu_shares;
    });

    if (servicesWithoutLimits.length > 0) {
      issues.push({
        type: "suggestion",
        category: "performance",
        title: "Missing Resource Limits",
        description: `${servicesWithoutLimits.length} services lack memory or CPU limits`,
        impact: "medium",
        fix: "Add deploy.resources.limits to prevent containers from consuming all system resources",
      });
    }
  }

  // Check for bind mounts (performance concern)
  const bindMounts = containers.filter((container) => {
    const mounts = container.mounts || [];
    return mounts.some((mount) => mount.type === "bind");
  });

  if (bindMounts.length > 0) {
    issues.push({
      type: "info",
      category: "performance",
      title: "Bind Mounts Detected",
      description: `${bindMounts.length} containers use bind mounts which may impact performance`,
      impact: "low",
      fix: "Consider using named volumes for better performance and portability",
    });
  }
};

/**
 * Configuration Validation
 */
const validateConfiguration = (
  stack: ApiStack,
  services: DockerService[] | undefined,
  issues: ValidationIssue[]
) => {
  // Check for missing restart policies
  const containers = stack.containers || [];
  const containersWithoutRestart = containers.filter(
    (container) =>
      !container.restart_policy || container.restart_policy === "no"
  );

  if (containersWithoutRestart.length > 0) {
    issues.push({
      type: "warning",
      category: "configuration",
      title: "Missing Restart Policies",
      description: `${containersWithoutRestart.length} containers lack proper restart policies`,
      impact: "medium",
      fix: "Add restart: unless-stopped or restart: always to compose services",
    });
  }

  // Check for missing compose file version
  if (!stack.compose_content?.includes("version:")) {
    issues.push({
      type: "suggestion",
      category: "configuration",
      title: "Missing Compose Version",
      description: "Compose file doesn't specify a version",
      impact: "low",
      fix: "Add version: '3.8' or higher to your compose file",
    });
  }

  // Check for hardcoded secrets in environment
  if (services) {
    const servicesWithHardcodedSecrets = services.filter((service) => {
      const env = service.environment;
      if (Array.isArray(env)) {
        return env.some(
          (e) =>
            typeof e === "string" &&
            (e.includes("PASSWORD=") ||
              e.includes("SECRET=") ||
              e.includes("KEY="))
        );
      }
      if (typeof env === "object" && env) {
        return Object.keys(env).some(
          (key) =>
            key.includes("PASSWORD") ||
            key.includes("SECRET") ||
            key.includes("KEY")
        );
      }
      return false;
    });

    if (servicesWithHardcodedSecrets.length > 0) {
      issues.push({
        type: "error",
        category: "security",
        title: "Hardcoded Secrets",
        description: `${servicesWithHardcodedSecrets.length} services may have hardcoded passwords or secrets`,
        impact: "critical",
        fix: "Use Docker secrets, .env files, or external secret management",
      });
    }
  }
};

/**
 * Observability Validation
 */
const validateObservability = (
  stack: ApiStack,
  services: DockerService[] | undefined,
  issues: ValidationIssue[]
) => {
  // Check for missing labels
  const containers = stack.containers || [];
  const containersWithoutLabels = containers.filter((container) => {
    const labels = container.labels || {};
    const hasCustomLabels = Object.keys(labels).some(
      (key) =>
        !key.startsWith("com.docker.compose") &&
        !key.startsWith("org.opencontainers.image")
    );
    return !hasCustomLabels;
  });

  if (containersWithoutLabels.length > 0) {
    issues.push({
      type: "suggestion",
      category: "monitoring",
      title: "Missing Custom Labels",
      description: `${containersWithoutLabels.length} containers lack custom labels for monitoring/organization`,
      impact: "low",
      fix: "Add labels for environment, team, version tracking",
    });
  }

  // Check for missing logging configuration
  if (services) {
    const servicesWithoutLogging = services.filter(
      (service) => !service.logging
    );

    if (servicesWithoutLogging.length > 0) {
      issues.push({
        type: "suggestion",
        category: "monitoring",
        title: "Default Logging Configuration",
        description: `${servicesWithoutLogging.length} services use default logging (may consume disk space)`,
        impact: "medium",
        fix: "Configure log rotation: logging.options.max-size and max-file",
      });
    }
  }
};

/**
 * Calculate overall score (0-100)
 */
const calculateScore = (summary: {
  critical: number;
  high: number;
  medium: number;
  low: number;
}) => {
  const totalDeductions =
    summary.critical * 25 +
    summary.high * 15 +
    summary.medium * 8 +
    summary.low * 3;

  return Math.max(0, 100 - totalDeductions);
};

/**
 * Get health grade based on score
 */
const getHealthGrade = (score: number): "A+" | "A" | "B" | "C" | "D" | "F" => {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
};

/**
 * Get color for health grade
 */
export const getGradeColor = (grade: string): string => {
  switch (grade) {
    case "A+":
    case "A":
      return "green";
    case "B":
      return "blue";
    case "C":
      return "yellow";
    case "D":
      return "orange";
    case "F":
      return "red";
    default:
      return "gray";
  }
};

/**
 * Get color for issue impact
 */
export const getImpactColor = (impact: string): string => {
  switch (impact) {
    case "critical":
      return "red";
    case "high":
      return "orange";
    case "medium":
      return "yellow";
    case "low":
      return "blue";
    default:
      return "gray";
  }
};
