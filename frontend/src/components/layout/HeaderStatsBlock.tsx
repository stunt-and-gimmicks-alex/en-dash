// frontend/src/components/HeaderStatsBlock.tsx
// MIGRATED - Simple stat blocks using WebSocket real-time data + ChakraUI v3 patterns

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
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  PiCpuFill,
  PiMemoryFill,
  PiHardDriveFill,
  PiCloudArrowDownFill,
  PiCloudArrowUpFill,
  PiNetworkFill,
  PiCpu,
  PiMemory,
  PiHardDrive,
  PiNetwork,
} from "react-icons/pi";
import { useSystemStatsWebSocket } from "@/hooks/useWebSocketStats";
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
  // NEW - Real-time system stats via WebSocket
  const { stats, isConnected, error } = useSystemStatsWebSocket(2.0, true);

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

  // Keep 5 seconds of history (at 2s intervals = ~3 data points for averaging)
  const NETWORK_HISTORY_DURATION = 5000; // 5 seconds in milliseconds

  // Local state for computed stats
  const [statItems, setStatItems] = useState<StatItem[]>([
    { value: "0%", label: "cpu usage", statIcon: PiCpuFill, color: "green" },
    {
      value: "0%",
      label: "memory usage",
      statIcon: PiMemoryFill,
      color: "blue",
    },
    {
      value: "0% used",
      label: "disk usage",
      statIcon: PiHardDriveFill,
      color: "purple",
    },
    {
      value: "0 B/s",
      secondaryValue: "0 B/s",
      label: "network i/o (5s average)",
      statIcon: PiNetworkFill,
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
    if (!stats?.disk_io) return "0% used";

    // Note: We need disk space stats, not disk I/O stats
    // This is a placeholder - you may need to add disk space to your WebSocket stats
    // For now, using memory as a stand-in until disk space stats are available
    if (stats.memory) {
      const usedGB = (stats.memory.used / 1024 ** 3).toFixed(1);
      const totalGB = (stats.memory.total / 1024 ** 3).toFixed(1);
      const percent = stats.memory.percent.toFixed(1);
      return `${percent}% used (${usedGB} GB of ${totalGB} GB)`;
    }

    return "0% used";
  };

  // Helper function to get color based on percentage
  const getColorForPercentage = (percent: number) => {
    if (percent >= 80) return "red";
    if (percent >= 60) return "orange";
    if (percent >= 40) return "yellow";
    return "green";
  };

  // Calculate network rates using trailing 5-second average
  useEffect(() => {
    if (stats?.network_io) {
      const currentTime = Date.now();
      const currentStats = {
        bytes_sent: stats.network_io.bytes_sent,
        bytes_recv: stats.network_io.bytes_recv,
        timestamp: currentTime,
      };

      // Add current stats to history
      setNetworkHistory((prev) => {
        const newHistory = [...prev, currentStats];

        // Remove entries older than 5 seconds
        const cutoffTime = currentTime - NETWORK_HISTORY_DURATION;
        const filteredHistory = newHistory.filter(
          (entry) => entry.timestamp > cutoffTime
        );

        // Calculate average rates if we have enough data points
        if (filteredHistory.length >= 2) {
          const oldest = filteredHistory[0];
          const newest = filteredHistory[filteredHistory.length - 1];

          const timeDiff = (newest.timestamp - oldest.timestamp) / 1000; // seconds

          if (timeDiff > 0) {
            const txRate = (newest.bytes_sent - oldest.bytes_sent) / timeDiff;
            const rxRate = (newest.bytes_recv - oldest.bytes_recv) / timeDiff;

            // Update rates with trailing average
            setNetworkRates((prevRates) => {
              // Smooth the rates with a simple moving average
              const smoothingFactor = 0.3; // Lower = smoother, higher = more responsive
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
  }, [stats?.network_io]);

  // Update stat items when new data arrives
  useEffect(() => {
    if (!stats) return;

    const newStatItems: StatItem[] = [
      // CPU Usage from WebSocket
      {
        value: stats?.cpu ? `${stats.cpu.percent_total.toFixed(1)}%` : "0%",
        label: "cpu usage",
        statIcon: PiCpu,
        color: stats?.cpu
          ? getColorForPercentage(stats.cpu.percent_total)
          : "gray",
      },

      // Memory Usage from WebSocket
      {
        value: stats?.memory ? `${stats.memory.percent.toFixed(1)}%` : "0%",
        label: "memory usage",
        statIcon: PiMemory,
        color: stats?.memory
          ? getColorForPercentage(stats.memory.percent)
          : "gray",
      },

      // Disk Usage (placeholder using memory stats until disk space is available)
      {
        value: formatDiskUsage(stats),
        label: "disk usage",
        statIcon: PiHardDrive,
        color: stats?.memory
          ? getColorForPercentage(stats.memory.percent)
          : "gray",
      },

      // Network I/O rates
      {
        value: formatNetworkRate(networkRates.txRate),
        secondaryValue: formatNetworkRate(networkRates.rxRate),
        statIcon: PiNetwork,
        subIcon1: PiCloudArrowUpFill,
        subIcon2: PiCloudArrowDownFill,
        label: "network i/o (5 second average)",
        color: "cyan",
      },
    ];

    setStatItems(newStatItems);
  }, [stats, networkRates]);

  return (
    <Container py="2" maxW="dvw" float="left" bg="brand.background">
      <HStack gap="6">
        {/* Header Section - Using brand tokens */}
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
              en-dash / Homelab Management
            </Highlight>
          </Heading>
        </Stack>
        <Flex justify="flex-end" gap="4">
          {/* Real-time Stats Grid - Simple stat blocks */}
          {statItems.map((item) => (
            <Group attached colorPalette={item.color}>
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
                    &ensp;/&ensp;{item.secondaryValue}
                  </Text>
                )}
              </Badge>
            </Group>
          ))}

          {/* Connection Status - Subtle indicator */}
          {!isConnected && (
            <Text
              fontSize="xs"
              color="brand.onSurfaceVariant"
              textAlign="center"
              opacity={0.7}
            >
              System stats disconnected
            </Text>
          )}
        </Flex>
      </HStack>
    </Container>
  );
};

export default HeaderStatsBlock;
