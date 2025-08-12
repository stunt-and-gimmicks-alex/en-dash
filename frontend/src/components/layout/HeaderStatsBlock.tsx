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
  Status,
  StatusIndicator,
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
import { useSystemStats } from "@/hooks/v06-systemStatsHooks";
import type { IconType } from "react-icons";

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
  console.log("the stats are:", currentStats?.cpu_percent);

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

  return (
    <Container py="2" maxW="dvw" bg="brand.bg/25">
      <Flex direction="row" gap="6">
        {/* Header Section */}
        <Stack gap="3" maxW="none" w="1/2" align="flex-start">
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
        </Stack>

        <Flex justify="flex-end" gap="4" align="center" w="1/2">
          {/* Real-time Stats Grid - Modern stat blocks */}
          {statItems.map((item, index) =>
            item.label === "Tx" ? (
              <Group
                key={index}
                orientation="vertical"
                w="10dvw"
                minW="255px"
                fontFamily="mono"
                pl="5"
              >
                <Stack gap="0">
                  <Heading size="xs">Network Activity</Heading>
                  <Progress.Root
                    value={parseInt(item.value, 10)}
                    max={1000}
                    size="md"
                    colorPalette="secondaryBrand"
                  >
                    <HStack gap="2" textStyle="xs">
                      <Progress.Label>
                        <Icon size="md">
                          <item.statIcon />
                        </Icon>
                      </Progress.Label>
                      <Progress.Track w="5dvw" minW="100px">
                        <Progress.Range />
                      </Progress.Track>
                      <Progress.ValueText textStyle="xs" w="4dvw" minW="100px">
                        {item.value}
                      </Progress.ValueText>
                    </HStack>
                  </Progress.Root>

                  <Progress.Root
                    value={parseInt(item.value2, 10)}
                    max={1000}
                    size="md"
                    colorPalette="yellowBrand"
                  >
                    <HStack textStyle="xs">
                      <Progress.Label>
                        {item.statIcon2 && (
                          <Icon size="md">
                            <item.statIcon2 />
                          </Icon>
                        )}
                      </Progress.Label>
                      <Progress.Track w="5dvw" minW="100px">
                        <Progress.Range />
                      </Progress.Track>
                      <Progress.ValueText textStyle="xs" w="4dvw" minW="100px">
                        {item.value2}
                      </Progress.ValueText>
                    </HStack>
                  </Progress.Root>
                </Stack>
              </Group>
            ) : (
              <Group
                key={index}
                attached
                colorPalette="grayBrand"
                fontFamily="mono"
                w="3dvw"
                minW="65px"
              >
                <ProgressCircle.Root value={parseInt(item.value, 10)} size="xl">
                  <ProgressCircle.Circle css={{ "--thickness": "3px" }}>
                    <ProgressCircle.Track />
                    <ProgressCircle.Range
                      stroke={{
                        base: "brandPrimary.900",
                        _dark: "brandPrimary.200",
                      }}
                    />
                  </ProgressCircle.Circle>
                  <AbsoluteCenter>
                    <Stack gap="0" alignItems="center">
                      <Icon size="md">
                        <item.statIcon />
                      </Icon>
                      <Text textStyle="xs">{item.value.slice(0, 10)}</Text>
                    </Stack>
                  </AbsoluteCenter>
                </ProgressCircle.Root>
              </Group>
            )
          )}
          {/* Connection Status - Subtle indicator */}
          {!connected && (
            <Badge
              bg="brandPrimary.100"
              color="brandGray.900"
              textStyle="xs"
              justifyContent="space-between"
              p="1.5"
              w="6dvw"
              minW="120px"
            >
              <Status.Root colorPalette="redBrand" size="lg">
                <StatusIndicator />
                <Text textStyle="sm" fontFamily="adwide" fontWeight="thin">
                  {error ? `E: ${error}` : "Disconnected"}
                </Text>
              </Status.Root>
            </Badge>
          )}
          {connected && currentStats && (
            <Badge
              bg="brandPrimary.100"
              color="brandGray.900"
              textStyle="xs"
              p="1.5"
              w="6dvw"
              minW="120px"
            >
              <Status.Root
                colorPalette="brand"
                size="lg"
                justifyContent="space-between"
                w="full"
                px="3"
              >
                <StatusIndicator />
                <Text textStyle="sm" fontFamily="adwide" fontWeight="thin">
                  {new Date(currentStats.timestamp).toLocaleTimeString()}
                </Text>
              </Status.Root>
            </Badge>
          )}
        </Flex>
      </Flex>
    </Container>
  );
};

export default HeaderStatsBlock;
