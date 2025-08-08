// frontend/src/components/layout/HeaderStatsBlock.tsx
// UPDATED - Modern system stats using SurrealDB livequeries

import React, { useState, useEffect } from "react";
import {
  Badge,
  Container,
  Flex,
  Group,
  Heading,
  Highlight,
  HStack,
  Icon,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  PiCpu,
  PiMemory,
  PiHardDrive,
  PiNetwork,
  PiCloudArrowDownFill,
  PiCloudArrowUpFill,
} from "react-icons/pi";
import { useLiveSystemStats } from "@/hooks/useSystemStats";
import type { IconType } from "react-icons";

interface StatItem {
  value: string;
  secondaryValue?: string;
  subIcon1?: IconType;
  subIcon2?: IconType;
  label: string;
  statIcon: IconType;
  color: string;
}

interface HeaderStatsBlockProps {
  title?: string;
  description?: string;
}

export const HeaderStatsBlock: React.FC<HeaderStatsBlockProps> = ({
  title = "en-dash / Better Homelab Management",
}) => {
  // ✨ NEW - Modern livequery system stats
  const { currentStats, connected, error } = useLiveSystemStats();

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
    { value: "0%", label: "cpu usage", statIcon: PiCpu, color: "green" },
    { value: "0%", label: "memory usage", statIcon: PiMemory, color: "blue" },
    {
      value: "0% used",
      label: "disk usage",
      statIcon: PiHardDrive,
      color: "purple",
    },
    {
      value: "0 B/s",
      secondaryValue: "0 B/s",
      label: "network i/o",
      statIcon: PiNetwork,
      subIcon1: PiCloudArrowUpFill,
      subIcon2: PiCloudArrowDownFill,
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
  const formatDiskUsage = (stats: any): string => {
    if (!stats) return "0% used";

    // Use the livequery data format
    const percent = stats.disk_percent || 0;
    const usedGB = stats.disk_used_gb || 0;
    const totalGB = stats.disk_total_gb || 0;

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
        label: "cpu usage",
        statIcon: PiCpu,
        color: getColorForPercentage(currentStats.cpu_percent || 0),
      },

      // Memory Usage from livequery
      {
        value: `${(currentStats.memory_percent || 0).toFixed(1)}%`,
        label: "memory usage",
        statIcon: PiMemory,
        color: getColorForPercentage(currentStats.memory_percent || 0),
      },

      // Disk Usage from livequery
      {
        value: formatDiskUsage(currentStats),
        label: "disk usage",
        statIcon: PiHardDrive,
        color: getColorForPercentage(currentStats.disk_percent || 0),
      },

      // Network I/O rates - now with real data!
      {
        value: formatNetworkRate(networkRates.txRate),
        secondaryValue: formatNetworkRate(networkRates.rxRate),
        statIcon: PiNetwork,
        subIcon1: PiCloudArrowUpFill,
        subIcon2: PiCloudArrowDownFill,
        label: "network i/o",
        color: "cyan",
      },
    ];

    setStatItems(newStatItems);
  }, [currentStats, networkRates]);

  return (
    <Container py="2" maxW="dvw" float="left" bg="brand.background">
      <HStack gap="6">
        {/* Header Section */}
        <Stack gap="3" maxW="none" align="flex-start">
          <Heading
            as="h2"
            fontSize={{ base: "2xl", md: "3xl" }}
            lineHeight="shorter"
            fontWeight="bold"
            color="brand.onSurface"
            textAlign="left"
            py="4"
          >
            <Highlight query=" / " styles={{ color: "brand.primary" }}>
              {title}
            </Highlight>
          </Heading>
        </Stack>

        <Flex justify="flex-end" gap="4">
          {/* Real-time Stats Grid - Modern stat blocks */}
          {statItems.map((item, index) => (
            <Group key={index} attached colorPalette={item.color}>
              <Badge size="lg" px="2" py="1">
                <Icon size="lg">
                  <item.statIcon />
                </Icon>
              </Badge>
              <Badge size="lg" px="2" py="1" variant="outline">
                {item.subIcon1 && (
                  <Icon size="md">
                    <item.subIcon1 />
                  </Icon>
                )}
                <Text fontWeight="medium" color={`${item.color}.500`}>
                  {item.value}
                </Text>
                {item.subIcon2 && (
                  <>
                    <Text fontWeight="medium" color={`${item.color}.500`}>
                      &ensp;/&ensp;
                    </Text>
                    <Icon size="md">
                      <item.subIcon2 />
                    </Icon>
                  </>
                )}
                {item.secondaryValue && (
                  <Text fontWeight="medium" color={`${item.color}.500`}>
                    &ensp;{item.secondaryValue}
                  </Text>
                )}
              </Badge>
            </Group>
          ))}

          {/* Connection Status - Subtle indicator */}
          {!connected && (
            <Text
              fontSize="xs"
              color="brand.onSurfaceVariant"
              textAlign="center"
              opacity={0.7}
            >
              {error ? `Error: ${error}` : "System stats disconnected"}
            </Text>
          )}
          {connected && currentStats && (
            <Text
              fontSize="xs"
              color="brand.primary"
              textAlign="center"
              opacity={0.7}
            >
              Live • {new Date(currentStats.collected_at).toLocaleTimeString()}
            </Text>
          )}
        </Flex>
      </HStack>
    </Container>
  );
};

export default HeaderStatsBlock;
