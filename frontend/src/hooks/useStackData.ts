// frontend/src/hooks/useStackData.ts
// Comprehensive hook that combines stack data, aggregated configs, and resource usage

import { useMemo } from "react";
import { useUnifiedStack } from "./useWebSocketUnifiedStacks";
import { useStackAggregatedConfigs } from "./useWebSocketUnifiedStacks";
import type {
  AggregatedPortConfig,
  AggregatedVolumeConfig,
  AggregatedEnvironmentConfig,
  AggregatedNetworkConfig,
} from "@/types/unified";

interface StackResourceUsage {
  cpu: {
    total: number;
    containers: number;
    average: number;
  };
  memory: {
    used: number;
    limit: number;
    percent: number;
    usedMB: number;
    limitMB: number;
  };
  network: {
    totalPorts: number;
    conflictedPorts: number;
  };
  storage: {
    totalVolumes: number;
    sharedVolumes: number;
  };
  runningContainers: number;
  totalContainers: number;
}

interface StackHealthSummary {
  overall: "healthy" | "warning" | "critical" | "unknown";
  issues: Array<{
    type: "port_conflict" | "resource_high" | "container_down" | "security";
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    count?: number;
  }>;
  score: number; // 0-100
}

/**
 * Comprehensive hook that provides everything you need about a stack
 */
export const useStackData = (stackName: string) => {
  const { stack, loading, error, connected } = useUnifiedStack(stackName);
  const { aggregatedConfigs } = useStackAggregatedConfigs(stackName);

  // Create analysis from aggregatedConfigs
  const analysis = useMemo(() => {
    if (!aggregatedConfigs) {
      return {
        ports: { hasConflicts: false, totalPorts: 0, conflicted: [] },
        volumes: { hasSharedVolumes: false, totalVolumes: 0, shared: [] },
        environment: { hasSecrets: false, secretCount: 0 },
        networks: { hasConflicts: false, totalNetworks: 0 },
      };
    }

    return {
      ports: {
        hasConflicts:
          aggregatedConfigs.ports?.some(
            (p: AggregatedPortConfig) => p.conflicts
          ) || false,
        totalPorts: aggregatedConfigs.ports?.length || 0,
        conflicted:
          aggregatedConfigs.ports?.filter(
            (p: AggregatedPortConfig) => p.conflicts
          ) || [],
      },
      volumes: {
        hasSharedVolumes:
          aggregatedConfigs.volumes?.some(
            (v: AggregatedVolumeConfig) => v.shared_by?.length > 1
          ) || false,
        totalVolumes: aggregatedConfigs.volumes?.length || 0,
        shared:
          aggregatedConfigs.volumes?.filter(
            (v: AggregatedVolumeConfig) => v.shared_by?.length > 1
          ) || [],
      },
      environment: {
        hasSecrets:
          aggregatedConfigs.environment?.some(
            (e: AggregatedEnvironmentConfig) => e.is_secret
          ) || false,
        secretCount:
          aggregatedConfigs.environment?.filter(
            (e: AggregatedEnvironmentConfig) => e.is_secret
          )?.length || 0,
      },
      networks: {
        hasConflicts:
          aggregatedConfigs.networks?.some(
            (n: AggregatedNetworkConfig) => n.conflicts
          ) || false,
        totalNetworks: aggregatedConfigs.networks?.length || 0,
      },
    };
  }, [aggregatedConfigs]);

  // Calculate comprehensive resource usage
  const resourceUsage = useMemo((): StackResourceUsage => {
    if (!stack?.containers?.containers) {
      return {
        cpu: { total: 0, containers: 0, average: 0 },
        memory: { used: 0, limit: 0, percent: 0, usedMB: 0, limitMB: 0 },
        network: { totalPorts: 0, conflictedPorts: 0 },
        storage: { totalVolumes: 0, sharedVolumes: 0 },
        runningContainers: 0,
        totalContainers: 0,
      };
    }

    const runningContainers = stack.containers.containers.filter(
      (c) => c.state === "running" && c.live_stats
    );

    const resourceTotals = runningContainers.reduce(
      (acc, container) => {
        const stats = container.live_stats!;
        acc.cpu.total += stats.cpu_percent || 0;
        acc.memory.used += stats.memory.usage || 0; // Fixed: usage instead of usage_bytes
        acc.memory.limit += stats.memory.limit || 0; // Fixed: limit instead of limit_bytes
        return acc;
      },
      {
        cpu: { total: 0, containers: runningContainers.length, average: 0 },
        memory: { used: 0, limit: 0, percent: 0, usedMB: 0, limitMB: 0 },
        network: {
          totalPorts: analysis.ports.totalPorts,
          conflictedPorts: analysis.ports.conflicted.length,
        },
        storage: {
          totalVolumes: analysis.volumes.totalVolumes,
          sharedVolumes: analysis.volumes.shared.length,
        },
        runningContainers: runningContainers.length,
        totalContainers: stack.containers.containers.length,
      }
    );

    // Calculate derived values
    resourceTotals.cpu.average =
      resourceTotals.cpu.containers > 0
        ? resourceTotals.cpu.total / resourceTotals.cpu.containers
        : 0;

    resourceTotals.memory.percent =
      resourceTotals.memory.limit > 0
        ? (resourceTotals.memory.used / resourceTotals.memory.limit) * 100
        : 0;

    resourceTotals.memory.usedMB = resourceTotals.memory.used / 1024 / 1024;
    resourceTotals.memory.limitMB = resourceTotals.memory.limit / 1024 / 1024;

    return resourceTotals;
  }, [stack?.containers?.containers, analysis]);

  // Calculate health summary
  const healthSummary = useMemo((): StackHealthSummary => {
    const issues: StackHealthSummary["issues"] = [];
    let score = 100;

    // Port conflicts
    if (analysis.ports.hasConflicts) {
      issues.push({
        type: "port_conflict",
        severity: "high",
        message: `${analysis.ports.conflicted.length} port conflicts detected`,
        count: analysis.ports.conflicted.length,
      });
      score -= 20;
    }

    // High resource usage
    if (resourceUsage.cpu.total > 80) {
      issues.push({
        type: "resource_high",
        severity: "medium",
        message: `High CPU usage: ${resourceUsage.cpu.total.toFixed(1)}%`,
      });
      score -= 10;
    }

    if (resourceUsage.memory.percent > 90) {
      issues.push({
        type: "resource_high",
        severity: "high",
        message: `High memory usage: ${resourceUsage.memory.percent.toFixed(
          1
        )}%`,
      });
      score -= 15;
    }

    // Container health
    const downContainers =
      resourceUsage.totalContainers - resourceUsage.runningContainers;
    if (downContainers > 0) {
      issues.push({
        type: "container_down",
        severity: "critical",
        message: `${downContainers} containers not running`,
        count: downContainers,
      });
      score -= 30;
    }

    // Security warnings
    if (analysis.environment.hasSecrets) {
      issues.push({
        type: "security",
        severity: "medium",
        message: `${analysis.environment.secretCount} potential secrets found`,
        count: analysis.environment.secretCount,
      });
      score -= 5;
    }

    // Determine overall health
    let overall: StackHealthSummary["overall"] = "healthy";
    if (score < 50) overall = "critical";
    else if (score < 70) overall = "warning";
    else if (issues.length > 0) overall = "warning";

    return {
      overall,
      issues,
      score: Math.max(0, score),
    };
  }, [analysis, resourceUsage]);

  return {
    // Core data
    stack,
    loading,
    error,
    connected,

    // Enhanced aggregated configs
    configs: aggregatedConfigs,
    analysis,

    // Resource calculations
    resourceUsage,

    // Health summary
    healthSummary,

    // Quick access helpers
    isHealthy: healthSummary.overall === "healthy",
    hasIssues: healthSummary.issues.length > 0,
    isRunning: stack?.status === "running",
    containerRatio: `${resourceUsage.runningContainers}/${resourceUsage.totalContainers}`,
  };
};

// Note: Remove the circular import - define the function locally if needed
