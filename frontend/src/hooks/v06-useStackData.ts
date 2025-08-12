// frontend/src/hooks/useStackData.ts
// Comprehensive hook that combines stack data, aggregated configs, and resource usage
// FIXED: Updated to use new v06 hooks instead of old useWebSocketUnifiedStacks

import { useMemo } from "react";
import {
  useUnifiedStack,
  useStackAggregatedConfigs,
} from "@/hooks/v06-stackHooks";
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
 * FIXED: Now uses v06 hooks instead of old useWebSocketUnifiedStacks
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

        // CPU calculation
        if (stats.cpu_percent !== undefined) {
          acc.cpu.total += stats.cpu_percent;
          acc.cpu.containers++;
        }

        // Memory calculation
        if (stats.memory && stats.memory.usage && stats.memory.limit) {
          acc.memory.used += stats.memory.usage;
          acc.memory.limit += stats.memory.limit;
        }

        return acc;
      },
      {
        cpu: { total: 0, containers: 0 },
        memory: { used: 0, limit: 0 },
      }
    );

    return {
      cpu: {
        total: resourceTotals.cpu.total,
        containers: resourceTotals.cpu.containers,
        average:
          resourceTotals.cpu.containers > 0
            ? resourceTotals.cpu.total / resourceTotals.cpu.containers
            : 0,
      },
      memory: {
        used: resourceTotals.memory.used,
        limit: resourceTotals.memory.limit,
        percent:
          resourceTotals.memory.limit > 0
            ? (resourceTotals.memory.used / resourceTotals.memory.limit) * 100
            : 0,
        usedMB: resourceTotals.memory.used / (1024 * 1024),
        limitMB: resourceTotals.memory.limit / (1024 * 1024),
      },
      network: {
        totalPorts: analysis.ports.totalPorts,
        conflictedPorts: analysis.ports.conflicted.length,
      },
      storage: {
        totalVolumes: analysis.volumes.totalVolumes,
        sharedVolumes: analysis.volumes.shared.length,
      },
      runningContainers: stack.stats?.containers?.running || 0,
      totalContainers: stack.stats?.containers?.total || 0,
    };
  }, [stack, analysis]);

  // Calculate health summary
  const healthSummary = useMemo((): StackHealthSummary => {
    const issues = [];
    let score = 100;

    // Check for port conflicts
    if (analysis.ports.hasConflicts) {
      issues.push({
        type: "port_conflict" as const,
        severity: "high" as const,
        message: `${analysis.ports.conflicted.length} port conflicts detected`,
        count: analysis.ports.conflicted.length,
      });
      score -= 20;
    }

    // Check container health
    const containerHealth = stack?.health?.overall_health;
    if (containerHealth === "degraded" || containerHealth === "unknown") {
      issues.push({
        type: "container_down" as const,
        severity: "critical" as const,
        message: "Container health issues detected",
      });
      score -= 30;
    }

    // Check resource usage
    if (resourceUsage.memory.percent > 90) {
      issues.push({
        type: "resource_high" as const,
        severity: "medium" as const,
        message: "High memory usage detected",
      });
      score -= 10;
    }

    // Check for secrets in environment
    if (analysis.environment.hasSecrets) {
      issues.push({
        type: "security" as const,
        severity: "low" as const,
        message: `${analysis.environment.secretCount} secrets in environment`,
        count: analysis.environment.secretCount,
      });
      score -= 5;
    }

    const overall =
      score >= 80 ? "healthy" : score >= 60 ? "warning" : "critical";

    return {
      overall,
      issues,
      score: Math.max(0, score),
    };
  }, [analysis, stack, resourceUsage]);

  // Convenience computed values
  const isHealthy = healthSummary.overall === "healthy";
  const hasIssues = healthSummary.issues.length > 0;
  const containerRatio =
    resourceUsage.totalContainers > 0
      ? resourceUsage.runningContainers / resourceUsage.totalContainers
      : 0;

  return {
    // Core data
    stack,
    loading,
    error,
    connected,

    // Enhanced analytics
    resourceUsage,
    healthSummary,
    analysis,
    configs: aggregatedConfigs,

    // Convenience flags
    isHealthy,
    hasIssues,
    containerRatio,
  };
};
