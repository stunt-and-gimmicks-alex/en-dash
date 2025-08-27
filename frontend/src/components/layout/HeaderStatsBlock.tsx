// frontend/src/components/layout/HeaderStatsBlock.tsx
// UPDATED - Modern system stats using SurrealDB livequeries

import React, { useState, useEffect } from "react";
import {
  AbsoluteCenter,
  Badge,
  Container,
  Flex,
  Group,
  Heading,
  HStack,
  Icon,
  Progress,
  ProgressCircle,
  Stack,
  Text,
} from "@chakra-ui/react";
import { systemStatsSelectors } from "@/stores/v06-systemStatsStore";
import { Chart, useChart } from "@chakra-ui/charts";
import { Bar, BarChart, Cell } from "recharts";

import {
  PiCpu,
  PiMemory,
  PiHardDrive,
  PiNetwork,
  PiCloudArrowDownFill,
  PiCloudArrowUpFill,
  PiChartBar,
} from "react-icons/pi";
import { useSystemStats } from "@/hooks/v06-systemStatsHooks";
import type { IconType } from "react-icons";
import { CPUSparkline } from "../ui/small/headercharts/HeaderCPUChart";
import { MemorySparkline } from "../ui/small/headercharts/HeaderMemoryChart";
import { NetworkSparkline } from "../ui/small/headercharts/HeaderNetworkChart";

interface StatItem {
  value: string;
  value2: string;
  label: string;
  label2?: string;
  statIcon: IconType;
  statIcon2?: IconType;
  color: string;
}

interface HeaderStatsBlockProps {
  title?: string;
  description?: string;
}

export const HeaderStatsBlock: React.FC<HeaderStatsBlockProps> = ({
  title = "en-dash / Better Homelab Management",
}) => {
  useEffect(() => {
    import("@/stores/v06-systemStatsStore").then(
      ({ initializeSystemStatsStore }) => {
        initializeSystemStatsStore().catch(console.error);
      }
    );
  }, []);

  // ✨ NEW - Modern livequery system stats
  const { currentStats, connected, error } = useSystemStats();

  // State for tracking network rates with trailing average
  const [networkHistory, setNetworkHistory] = useState<
    Array<{
      bytes_sent: number;
      bytes_recv: number;
      timestamp: number;
    }>
  >([]);

  const [networkRates, setNetworkRates] = useState<{
    txRate: number;
    rxRate: number;
  }>({ txRate: 0, rxRate: 0 });

  // Keep history for rate calculation (30 second collection interval)
  const NETWORK_HISTORY_DURATION = 90000; // 90 seconds to capture 3 data points

  // Local state for computed stats
  const [statItems, setStatItems] = useState<StatItem[]>([
    {
      value: "0%",
      value2: "0",
      label: "cpu usage",
      statIcon: PiCpu,
      color: "green",
    },
    {
      value: "0%",
      value2: "0",
      label: "memory usage",
      statIcon: PiMemory,
      color: "blue",
    },
    {
      value: "0% used",
      value2: "0",
      label: "disk usage",
      statIcon: PiHardDrive,
      color: "purple",
    },
    {
      value: "0 B/s",
      value2: "0 B/s",
      label: "network i/o",
      statIcon: PiNetwork,
      color: "cyan",
    },
  ]);

  // Helper function to format network rates
  const formatNetworkRate = (bytesPerSecond: number): string => {
    const units = ["B/s", "KB/s", "MB/s", "GB/s"];
    let value = bytesPerSecond;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  };

  // Helper function to format disk usage with size info
  const formatDiskUsage = (currentStats: any): string => {
    if (!currentStats) return "0% used";

    // Use the livequery data format
    const percent = currentStats.disk_percent || 0;
    const usedGB = currentStats.disk_used_gb || 0;
    const totalGB = currentStats.disk_total_gb || 0;

    return `${percent.toFixed(1)}% used (${usedGB.toFixed(
      1
    )} GB of ${totalGB.toFixed(1)} GB)`;
  };

  // Helper function to get color based on percentage
  const getColorForPercentage = (percent: number) => {
    if (percent >= 80) return "red";
    if (percent >= 60) return "orange";
    if (percent >= 40) return "yellow";
    return "green";
  };

  // Calculate network rates from livequery data
  useEffect(() => {
    if (
      currentStats &&
      "network_bytes_sent" in currentStats &&
      "network_bytes_recv" in currentStats
    ) {
      const currentTime = Date.now();
      const currentNetworkStats = {
        bytes_sent: currentStats.network_bytes_sent,
        bytes_recv: currentStats.network_bytes_recv,
        timestamp: currentTime,
      };

      // Add current stats to history
      setNetworkHistory((prev) => {
        const newHistory = [...prev, currentNetworkStats];

        // Remove entries older than tracking duration
        const cutoffTime = currentTime - NETWORK_HISTORY_DURATION;
        const filteredHistory = newHistory.filter(
          (entry) => entry.timestamp > cutoffTime
        );

        // Calculate rates if we have enough data points (at least 2)
        if (filteredHistory.length >= 2) {
          const oldest = filteredHistory[0];
          const newest = filteredHistory[filteredHistory.length - 1];
          const timeDiff = (newest.timestamp - oldest.timestamp) / 1000; // seconds

          if (timeDiff > 0) {
            const txRate = (newest.bytes_sent - oldest.bytes_sent) / timeDiff;
            const rxRate = (newest.bytes_recv - oldest.bytes_recv) / timeDiff;

            // Update rates with smoothing to avoid sudden jumps
            setNetworkRates((prevRates) => {
              const smoothingFactor = 0.4; // More responsive for slower updates
              return {
                txRate: Math.max(
                  0,
                  prevRates.txRate * (1 - smoothingFactor) +
                    txRate * smoothingFactor
                ),
                rxRate: Math.max(
                  0,
                  prevRates.rxRate * (1 - smoothingFactor) +
                    rxRate * smoothingFactor
                ),
              };
            });
          }
        }

        return filteredHistory;
      });
    }
  }, [currentStats]);

  // Update stat items when new livequery data arrives
  useEffect(() => {
    if (!currentStats) return;

    const newStatItems: StatItem[] = [
      // CPU Usage from livequery
      {
        value: `${(currentStats.cpu_percent || 0).toFixed(1)}%`,
        value2: "0",
        label: "cpu usage",
        statIcon: PiCpu,
        color: getColorForPercentage(currentStats.cpu_percent || 0),
      },

      // Memory Usage from livequery
      {
        value: `${(currentStats.memory_percent || 0).toFixed(1)}%`,
        value2: "0",
        label: "memory usage",
        statIcon: PiMemory,
        color: getColorForPercentage(currentStats.memory_percent || 0),
      },

      // Disk Usage from livequery
      {
        value: `${(currentStats.disk_percent || 0).toFixed(1)}%`,
        value2: "0",
        label: "disk usage",
        statIcon: PiHardDrive,
        color: getColorForPercentage(currentStats.disk_percent || 0),
      },

      // Network I/O rates - now with real data!
      {
        value: formatNetworkRate(networkRates.txRate),
        value2: formatNetworkRate(networkRates.rxRate),
        statIcon: PiCloudArrowUpFill,
        statIcon2: PiCloudArrowDownFill,
        label: "Tx",
        label2: "Rx",
        color: "cyan",
      },
    ];

    setStatItems(newStatItems);
  }, [currentStats, networkRates]);

  const sparklineData = systemStatsSelectors.useSparklineData();

  // Transform the raw data here instead of in the store
  const chartData = sparklineData.map((point) => ({
    value: point.cpu_percent,
    fill: point.cpu_percent > 80 ? "red.solid" : "green.solid",
  }));

  const chart = useChart({ data: chartData });

  return (
    <Flex
      direction="row"
      maxW="dvw"
      bg="brand.bg/25"
      py="2"
      px="4"
      gap="6"
      align="center"
      justify="space-between"
    >
      {/* Header Section */}

      <Heading
        as="h2"
        fontSize={{ base: "2xl", md: "3xl" }}
        lineHeight="shorter"
        fontWeight="bold"
        color="brand.onSurface"
        textAlign="left"
        py="4"
      >
        {title}
      </Heading>

      <Flex gap="4" align="center">
        <Group orientation="horizontal" fontFamily="mono" pl="5">
          <CPUSparkline />
          <MemorySparkline />
          <NetworkSparkline />
        </Group>
      </Flex>
    </Flex>
  );
};

export default HeaderStatsBlock;
