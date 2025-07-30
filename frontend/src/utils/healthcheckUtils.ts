// src/utils/healthcheckUtils.ts
// Healthcheck status utilities for Docker services

import type { ApiContainer } from "@/services/apiService";

// Healthcheck result interface (based on Docker API)
export interface HealthcheckResult {
  start: string; // ISO timestamp when check started
  end: string; // ISO timestamp when check ended
  exitCode: number; // 0 = healthy, 1 = unhealthy
  output: string; // Command output/logs
}

// Container health status
export interface ContainerHealth {
  status: "starting" | "healthy" | "unhealthy" | "none";
  failingStreak: number;
  log: HealthcheckResult[];
}

// Service-level health summary
export interface ServiceHealthStatus {
  overall: "healthy" | "unhealthy" | "starting" | "degraded" | "unknown";
  healthyContainers: number;
  unhealthyContainers: number;
  startingContainers: number;
  totalContainers: number;
  lastCheck?: HealthcheckResult;
  containerHealth: Record<string, ContainerHealth>;
}

/**
 * Gets the health status for a service based on its containers
 */
export const getServiceHealthStatus = (
  containers: ApiContainer[]
): ServiceHealthStatus => {
  if (!containers || containers.length === 0) {
    return {
      overall: "unknown",
      healthyContainers: 0,
      unhealthyContainers: 0,
      startingContainers: 0,
      totalContainers: 0,
      containerHealth: {},
    };
  }

  let healthyCount = 0;
  let unhealthyCount = 0;
  let startingCount = 0;
  let lastCheck: HealthcheckResult | undefined;
  const containerHealth: Record<string, ContainerHealth> = {};

  containers.forEach((container) => {
    const health = extractContainerHealth(container);
    containerHealth[container.id] = health;

    // Count container statuses
    switch (health.status) {
      case "healthy":
        healthyCount++;
        break;
      case "unhealthy":
        unhealthyCount++;
        break;
      case "starting":
        startingCount++;
        break;
    }

    // Find the most recent healthcheck across all containers
    if (health.log && health.log.length > 0) {
      const containerLastCheck = health.log[health.log.length - 1];
      if (
        !lastCheck ||
        new Date(containerLastCheck.end) > new Date(lastCheck.end)
      ) {
        lastCheck = containerLastCheck;
      }
    }
  });

  // Determine overall service health
  let overall: ServiceHealthStatus["overall"];
  if (unhealthyCount > 0) {
    overall = healthyCount > 0 ? "degraded" : "unhealthy";
  } else if (healthyCount > 0) {
    overall = startingCount > 0 ? "degraded" : "healthy";
  } else if (startingCount > 0) {
    overall = "starting";
  } else {
    overall = "unknown";
  }

  return {
    overall,
    healthyContainers: healthyCount,
    unhealthyContainers: unhealthyCount,
    startingContainers: startingCount,
    totalContainers: containers.length,
    lastCheck,
    containerHealth,
  };
};

/**
 * Extracts health information from a container's API data
 */
const extractContainerHealth = (container: ApiContainer): ContainerHealth => {
  // This depends on your container API structure
  // Adjust these paths based on your actual container object
  const health = (container as any).health || (container as any).Health;

  if (!health) {
    return {
      status: "none",
      failingStreak: 0,
      log: [],
    };
  }

  return {
    status: health.Status?.toLowerCase() || "none",
    failingStreak: health.FailingStreak || 0,
    log: health.Log || [],
  };
};

/**
 * Gets the last healthcheck result from a specific container
 */
export const getContainerLastHealthcheck = (
  container: ApiContainer
): HealthcheckResult | null => {
  const health = extractContainerHealth(container);
  return health.log && health.log.length > 0
    ? health.log[health.log.length - 1]
    : null;
};

/**
 * Formats healthcheck timestamp for display
 */
export const formatHealthcheckTime = (timestamp: string): string => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

/**
 * Gets health status color for UI components
 */
export const getHealthStatusColor = (
  status: ServiceHealthStatus["overall"]
): string => {
  switch (status) {
    case "healthy":
      return "green";
    case "unhealthy":
      return "red";
    case "degraded":
      return "yellow";
    case "starting":
      return "blue";
    default:
      return "gray";
  }
};

/**
 * Formats healthcheck output for display (truncated)
 */
export const formatHealthcheckOutput = (
  output: string,
  maxLength = 100
): string => {
  if (!output) return "No output";
  return output.length > maxLength
    ? `${output.substring(0, maxLength)}...`
    : output;
};
