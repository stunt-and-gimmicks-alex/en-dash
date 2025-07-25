// frontend/src/components/charts/NetworkIOBars.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  Stat,
  Box,
  HStack,
  VStack,
  Text,
  Skeleton,
} from "@chakra-ui/react";
import { Progress } from "@chakra-ui/react";
import { LuNetwork } from "react-icons/lu";
import { apiService } from "@/services/apiService";

interface NetworkData {
  txRate: number; // bytes per second
  rxRate: number; // bytes per second
  maxRate: number; // for scaling the bars
}

// Helper function to format network rates
const formatNetworkRate = (
  bytesPerSecond: number
): { value: number; unit: string } => {
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let value = bytesPerSecond;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return {
    value: Math.round(value * 10) / 10, // Round to 1 decimal place
    unit: units[unitIndex],
  };
};

export const NetworkIOBars: React.FC = () => {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use useRef to persist data between renders
  const lastStatsRef = useRef<{
    bytes_sent: number;
    bytes_recv: number;
    timestamp: number;
  } | null>(null);

  console.log("NetworkIOBars component mounted"); // Debug log

  const fetchNetworkData = async () => {
    try {
      const stats = await apiService.getSystemStats();
      const currentTime = Date.now();

      // Access network data from the stats object
      const networkStats = stats.network || {
        bytes_sent: 0,
        bytes_recv: 0,
        packets_sent: 0,
        packets_recv: 0,
        interfaces: [],
      };

      console.log("Network stats:", networkStats); // Debug log

      const currentStats = {
        bytes_sent: networkStats.bytes_sent,
        bytes_recv: networkStats.bytes_recv,
        timestamp: currentTime,
      };

      const lastStats = lastStatsRef.current;

      if (lastStats) {
        // Calculate time difference in seconds
        const timeDiff = (currentTime - lastStats.timestamp) / 1000;

        console.log("Time diff:", timeDiff, "seconds"); // Debug log
        console.log(
          "Bytes sent diff:",
          currentStats.bytes_sent - lastStats.bytes_sent
        ); // Debug log
        console.log(
          "Bytes recv diff:",
          currentStats.bytes_recv - lastStats.bytes_recv
        ); // Debug log

        // Calculate rates (bytes per second)
        const txRate = Math.max(
          0,
          (currentStats.bytes_sent - lastStats.bytes_sent) / timeDiff
        );
        const rxRate = Math.max(
          0,
          (currentStats.bytes_recv - lastStats.bytes_recv) / timeDiff
        );

        console.log("Calculated rates - Tx:", txRate, "Rx:", rxRate); // Debug log

        // Use the higher rate to scale both bars
        const maxRate = Math.max(txRate, rxRate, 1024); // Minimum 1KB/s for scaling

        setNetworkData({
          txRate,
          rxRate,
          maxRate,
        });
        setError(null);
      } else {
        console.log("First fetch, setting baseline data"); // Debug log
        // First fetch - just set baseline, show 0 rates
        setNetworkData({
          txRate: 0,
          rxRate: 0,
          maxRate: 1024,
        });
        setError(null);
      }

      // Update the ref with current stats
      lastStatsRef.current = currentStats;
    } catch (err) {
      console.error("Network fetch error:", err); // Debug log
      setError(
        err instanceof Error ? err.message : "Failed to fetch network data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetchNetworkData();

    // Set up interval to fetch data every 3 seconds for smooth rate calculation
    const interval = setInterval(fetchNetworkData, 3000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card.Root maxW="sm" size="sm" overflow="hidden">
        <Card.Body pb="2">
          <Stat.Root>
            <Stat.Label>
              <HStack gap="2">
                <LuNetwork />
                <span>Network I/O</span>
              </HStack>
            </Stat.Label>
            <Skeleton height="6" width="16" />
          </Stat.Root>
        </Card.Body>
        <Box px="4" pb="4">
          <VStack gap="3" align="stretch">
            <Box>
              <HStack justify="space-between" mb="1">
                <Skeleton height="4" width="6" />
                <Skeleton height="4" width="16" />
              </HStack>
              <Skeleton height="3" />
            </Box>
            <Box>
              <HStack justify="space-between" mb="1">
                <Skeleton height="4" width="6" />
                <Skeleton height="4" width="16" />
              </HStack>
              <Skeleton height="3" />
            </Box>
          </VStack>
        </Box>
      </Card.Root>
    );
  }

  if (error) {
    return (
      <Card.Root maxW="sm" size="sm" overflow="hidden">
        <Card.Body>
          <Stat.Root>
            <Stat.Label>
              <LuNetwork /> Network I/O
            </Stat.Label>
            <Stat.ValueText color="red.500">Error</Stat.ValueText>
            <Text fontSize="xs" color="red.400" mt="1">
              {error}
            </Text>
          </Stat.Root>
        </Card.Body>
        <Box height="16" bg="red.100" />
      </Card.Root>
    );
  }

  if (!networkData) {
    return (
      <Card.Root maxW="sm" size="sm" overflow="hidden">
        <Card.Body>
          <Stat.Root>
            <Stat.Label>
              <LuNetwork /> Network I/O
            </Stat.Label>
            <Stat.ValueText>Calculating...</Stat.ValueText>
            <Text fontSize="xs" color="gray.500" mt="1">
              Waiting for data points
            </Text>
          </Stat.Root>
        </Card.Body>
        <Box height="16" bg="gray.100" />
      </Card.Root>
    );
  }

  const txFormatted = formatNetworkRate(networkData.txRate);
  const rxFormatted = formatNetworkRate(networkData.rxRate);

  // Calculate percentages for progress bars (0-100)
  const txPercent = Math.min(
    100,
    (networkData.txRate / networkData.maxRate) * 100
  );
  const rxPercent = Math.min(
    100,
    (networkData.rxRate / networkData.maxRate) * 100
  );

  // Determine colors based on activity
  const getTxColor = (rate: number) => {
    if (rate >= 1024 * 1024) return "orange"; // >= 1MB/s
    if (rate >= 1024 * 100) return "blue"; // >= 100KB/s
    if (rate >= 1024) return "green"; // >= 1KB/s
    return "gray";
  };

  const getRxColor = (rate: number) => {
    if (rate >= 1024 * 1024) return "purple"; // >= 1MB/s
    if (rate >= 1024 * 100) return "cyan"; // >= 100KB/s
    if (rate >= 1024) return "teal"; // >= 1KB/s
    return "gray";
  };

  const txColor = getTxColor(networkData.txRate);
  const rxColor = getRxColor(networkData.rxRate);

  return (
    <Card.Root
      maxW="md"
      size="sm"
      overflow="hidden"
      background="brand.surfaceContainerHighest"
      borderRadius="0"
    >
      <Card.Body pb="2">
        <Stat.Root>
          <Stat.Label color="brand.onPrimaryContainer">
            <HStack gap="2">
              <LuNetwork />
              <span>Network I/O</span>
              {loading && (
                <Box
                  w="2"
                  h="2"
                  borderRadius="full"
                  bg="blue.500"
                  opacity={0.6}
                />
              )}
            </HStack>
          </Stat.Label>
          <Stat.ValueText
            color="brand.onPrimarySurface"
            fontSize="lg"
            fontWeight="bold"
          >
            {txFormatted.value > 0 || rxFormatted.value > 0 ? "Active" : "Idle"}
          </Stat.ValueText>
        </Stat.Root>
      </Card.Body>

      <Box px="4" pb="4">
        <VStack gap="3" align="stretch">
          {/* Transmit (Upload) Bar */}
          <Box>
            <HStack justify="space-between" mb="1">
              <Text
                fontSize="sm"
                fontWeight="medium"
                color="brand.onPrimaryContainer"
              >
                Tx:
              </Text>
              <Text fontSize="sm" color="brand.onSurface" fontWeight="medium">
                {txFormatted.value} {txFormatted.unit}
              </Text>
            </HStack>
            <Progress.Root
              value={txPercent}
              colorPalette={txColor}
              size="sm"
              borderRadius="md"
            >
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>

          {/* Receive (Download) Bar */}
          <Box>
            <HStack justify="space-between" mb="1">
              <Text
                fontSize="sm"
                fontWeight="medium"
                color="brand.onTertiaryContainer"
              >
                Rx:
              </Text>
              <Text
                fontSize="sm"
                color="brand.onSurfaceVariant"
                fontWeight="medium"
              >
                {rxFormatted.value} {rxFormatted.unit}
              </Text>
            </HStack>
            <Progress.Root
              value={rxPercent}
              colorPalette={rxColor}
              size="sm"
              borderRadius="md"
            >
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>

          {/* Summary info */}
          <Box mt="1">
            <Text fontSize="xs" color="brand.onSurface" textAlign="center">
              Max: {formatNetworkRate(networkData.maxRate).value}{" "}
              {formatNetworkRate(networkData.maxRate).unit}
            </Text>
          </Box>
        </VStack>
      </Box>
    </Card.Root>
  );
};
