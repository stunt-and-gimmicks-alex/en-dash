// frontend/src/components/charts/DiskUsageDonut.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Chart, BarSegment, useChart } from "@chakra-ui/charts";
import { Card, Stat, Box, HStack, Text, Skeleton } from "@chakra-ui/react";
import { LuHardDrive } from "react-icons/lu";
import { apiService } from "@/services/apiService";
import { NetworkIOBars } from "./NetworkIOBars";

interface DiskData {
  used: number;
  available: number;
  total: number;
  percent: number;
}

// Helper functions moved outside component to avoid re-creation
const getColorPalette = (usage: number) => {
  if (usage >= 90) return "red";
  if (usage >= 80) return "orange";
  if (usage >= 70) return "yellow";
  if (usage >= 60) return "blue";
  return "green";
};

const formatBytes = (bytes: number): { value: number; unit: string } => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
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

export const DiskUsageDonut: React.FC = () => {
  const [diskData, setDiskData] = useState<DiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format the data for the chart - BarSegment expects simple name/value/color structure
  const chartData = diskData
    ? (() => {
        const usedFormatted = formatBytes(diskData.used);
        const availableFormatted = formatBytes(diskData.available);
        const totalFormatted = formatBytes(diskData.total);

        // Convert to same unit for proper proportional display
        const targetUnit = totalFormatted.unit;
        const unitIndex = ["B", "KB", "MB", "GB", "TB"].indexOf(targetUnit);
        const divisor = Math.pow(1024, unitIndex);

        return [
          {
            name: "Used",
            value: diskData.used / divisor,
            color: "brand.onPrimaryContainer",
          },
          {
            name: "Available",
            value: diskData.available / divisor,
            color: "brand.onSurface",
          },
        ];
      })()
    : [
        {
          name: "Used",
          value: 1,
          color: "brand.onPrimaryContainer",
        },
        {
          name: "Available",
          value: 9,
          color: "brand.onSurface",
        },
      ];

  // Configure the chart
  const chart = useChart({
    data: chartData,
  });

  const fetchDiskData = async () => {
    try {
      const stats = await apiService.getSystemStats();

      // Combine all physical drives (exclude virtual filesystems)
      // Filter out tmpfs, proc, sys, and other virtual mounts
      const physicalDisks = stats.disk.filter((d) => {
        const virtualMounts = [
          "/proc",
          "/sys",
          "/dev",
          "/run",
          "/tmp",
          "/var/run",
          "/var/lock",
        ];
        const virtualTypes = [
          "tmpfs",
          "devtmpfs",
          "sysfs",
          "proc",
          "squashfs",
          "overlay",
        ];

        // Include only real filesystems and exclude virtual mounts
        return (
          !virtualMounts.some((vm) => d.mountpoint.startsWith(vm)) &&
          !virtualTypes.includes(d.fstype?.toLowerCase() || "") &&
          d.total > 0
        ); // Ensure it has actual storage
      });

      if (physicalDisks.length > 0) {
        // Calculate combined totals for all physical drives
        const totalUsed = physicalDisks.reduce(
          (sum, disk) => sum + disk.used,
          0
        );
        const totalFree = physicalDisks.reduce(
          (sum, disk) => sum + disk.free,
          0
        );
        const totalCapacity = physicalDisks.reduce(
          (sum, disk) => sum + disk.total,
          0
        );
        const combinedPercent = (totalUsed / totalCapacity) * 100;

        const diskInfo: DiskData = {
          used: totalUsed,
          available: totalFree,
          total: totalCapacity,
          percent: combinedPercent,
        };

        console.log(
          "Disk breakdown:",
          physicalDisks.map((d) => ({
            mountpoint: d.mountpoint,
            device: d.device,
            used: formatBytes(d.used),
            total: formatBytes(d.total),
            percent: d.percent.toFixed(1) + "%",
          }))
        );

        console.log("Combined disk usage:", {
          used: formatBytes(totalUsed),
          total: formatBytes(totalCapacity),
          percent: combinedPercent.toFixed(1) + "%",
        });

        setDiskData(diskInfo);
        setError(null);
      } else {
        setError("No physical disk data available");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch disk data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetchDiskData();

    // Set up interval to fetch data every 5 seconds to match faster metrics collection
    const interval = setInterval(fetchDiskData, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card.Root maxW="sm" size="sm" overflow="hidden">
        <Card.Body pb="2">
          <Stat.Root>
            <Stat.Label>
              <HStack gap="2">
                <LuHardDrive />
                <span>Disk Usage</span>
              </HStack>
            </Stat.Label>
            <Skeleton height="6" width="24" />
            <Skeleton height="4" width="32" mt="1" />
          </Stat.Root>
        </Card.Body>
        <Box px="4" pb="4">
          <Skeleton height="8" />
        </Box>
      </Card.Root>
    );
  }

  if (error || !diskData) {
    return (
      <Card.Root maxW="sm" size="sm" overflow="hidden">
        <Card.Body>
          <Stat.Root>
            <Stat.Label>
              <LuHardDrive /> Disk Usage
            </Stat.Label>
            <Stat.ValueText color="brand.onError">Error</Stat.ValueText>
          </Stat.Root>
        </Card.Body>
        <Box height="24" bg="brand.Error" />
      </Card.Root>
    );
  }

  const colorPalette = getColorPalette(diskData.percent);
  const usedFormatted = formatBytes(diskData.used);
  const totalFormatted = formatBytes(diskData.total);

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
              <LuHardDrive />
              <span>Disk Usage</span>
              {loading && (
                <Box
                  w="2"
                  h="2"
                  borderRadius="full"
                  bg={`${colorPalette}.500`}
                  opacity={0.6}
                />
              )}
            </HStack>
          </Stat.Label>
          <Stat.ValueText
            color="brand.onSecondaryContainer"
            fontSize="lg"
            fontWeight="bold"
          >
            {`${diskData.percent.toFixed(1)}% Full`}
          </Stat.ValueText>
          <Text fontSize="sm" color="brand.onSurfaceVariant" mt="1">
            {usedFormatted.value} {usedFormatted.unit} used of{" "}
            {totalFormatted.value} {totalFormatted.unit}
          </Text>
        </Stat.Root>
      </Card.Body>

      <Box px="4" pb="12">
        <BarSegment.Root height="8" chart={chart} mx="auto">
          <BarSegment.Content>
            <BarSegment.Bar rounded="md" />
          </BarSegment.Content>
          <BarSegment.Legend showValue />
        </BarSegment.Root>
      </Box>
    </Card.Root>
  );
};
