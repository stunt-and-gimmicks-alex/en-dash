// frontend/src/components/charts/MemorySparkline.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Chart, useChart } from "@chakra-ui/charts";
import { Card, Stat, Box, HStack, Skeleton } from "@chakra-ui/react";
import { LuMemoryStick } from "react-icons/lu";
import { LineChart, Line } from "recharts";
import { apiService } from "@/services/apiService";

interface MemoryDataPoint {
  timestamp: number;
  value: number;
}

export const MemorySparkline: React.FC = () => {
  const [memoryData, setMemoryData] = useState<MemoryDataPoint[]>([]);
  const [currentMemory, setCurrentMemory] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep last 60 data points for sparkline (2 minutes of data at 2s intervals)
  const MAX_DATA_POINTS = 60;

  const fetchMemoryData = async () => {
    try {
      const stats = await apiService.getSystemStats();
      const memoryPercent = stats.memory.percent;
      const timestamp = Date.now();

      setCurrentMemory(memoryPercent);
      setError(null);

      // Add new data point and keep only the last MAX_DATA_POINTS
      setMemoryData((prev) => {
        const newData = [...prev, { timestamp, value: memoryPercent }];
        return newData.slice(-MAX_DATA_POINTS);
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch memory data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetchMemoryData();

    // Set up interval to fetch data every 5 seconds for better performance
    const interval = setInterval(fetchMemoryData, 5000);

    return () => clearInterval(interval);
  }, []);

  // Determine color based on memory usage
  const getColorPalette = (usage: number) => {
    if (usage >= 90) return "red";
    if (usage >= 80) return "orange";
    if (usage >= 70) return "yellow";
    if (usage >= 60) return "blue";
    return "green";
  };

  const colorPalette = getColorPalette(currentMemory);

  // Chart configuration
  const chart = useChart({
    data: memoryData.map((point, index) => ({
      index,
      value: point.value,
    })),
    series: [{ name: "value", color: "brand.onPrimaryContainer" }],
  });

  // Format memory percentage
  const formatMemory = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading && memoryData.length === 0) {
    return (
      <Card.Root maxW="sm" size="sm" overflow="hidden">
        <Card.Body>
          <Stat.Root>
            <Stat.Label>
              <HStack gap="2">
                <LuMemoryStick />
                <span>Memory Usage</span>
              </HStack>
            </Stat.Label>
            <Skeleton height="8" width="20" />
          </Stat.Root>
        </Card.Body>
        <Skeleton height="10" />
      </Card.Root>
    );
  }

  if (error) {
    return (
      <Card.Root maxW="sm" size="sm" overflow="hidden">
        <Card.Body>
          <Stat.Root>
            <Stat.Label>
              <LuMemoryStick /> Memory Usage
            </Stat.Label>
            <Stat.ValueText color="red.500">Error</Stat.ValueText>
          </Stat.Root>
        </Card.Body>
        <Box height="10" bg="red.100" />
      </Card.Root>
    );
  }

  return (
    <Card.Root
      maxW="md"
      size="sm"
      overflow="hidden"
      background="brand.surfaceContainerHighest"
      borderRadius="0"
    >
      <Card.Body>
        <Stat.Root>
          <Stat.Label color="brand.onPrimaryContainer">
            <HStack gap="2">
              <LuMemoryStick />
              <span>Memory Usage</span>
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
            fontSize="2xl"
            fontWeight="bold"
          >
            {formatMemory(currentMemory)}
          </Stat.ValueText>
        </Stat.Root>
      </Card.Body>

      {memoryData.length > 0 && (
        <MemorySparkLineChart data={memoryData} colorPalette={colorPalette} />
      )}
    </Card.Root>
  );
};

// Separate sparkline chart component
interface MemorySparkLineChartProps {
  data: MemoryDataPoint[];
  colorPalette: string;
}

const MemorySparkLineChart: React.FC<MemorySparkLineChartProps> = ({
  data,
  colorPalette,
}) => {
  const chart = useChart({
    data: data.map((point, index) => ({
      index,
      value: point.value,
    })),
    series: [{ name: "value", color: "brand.onPrimaryContainer" }],
  });

  return (
    <Chart.Root height="10" chart={chart}>
      <LineChart
        data={chart.data}
        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
      >
        {chart.series.map((item) => (
          <Line
            key={item.name}
            isAnimationActive={false}
            dataKey={chart.key(item.name)}
            stroke={chart.color(item.color)}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </Chart.Root>
  );
};
