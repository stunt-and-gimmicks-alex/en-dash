// frontend/src/components/charts/CPUSparkline.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Chart, useChart } from "@chakra-ui/charts";
import { Card, Stat, Box, HStack, Skeleton } from "@chakra-ui/react";
import { LuCpu } from "react-icons/lu";
import { LineChart, Line } from "recharts";
import { apiService } from "@/services/apiService";
import type { GiBrandyBottle } from "react-icons/gi";

interface CPUDataPoint {
  timestamp: number;
  value: number;
}

export const CPUSparkline: React.FC = () => {
  const [cpuData, setCpuData] = useState<CPUDataPoint[]>([]);
  const [currentCPU, setCurrentCPU] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep last 60 data points for sparkline (2 minutes of data at 2s intervals)
  const MAX_DATA_POINTS = 60;

  const fetchCPUData = async () => {
    try {
      const stats = await apiService.getSystemStats();
      const cpuPercent = stats.cpu.percent;
      const timestamp = Date.now();

      setCurrentCPU(cpuPercent);
      setError(null);

      // Add new data point and keep only the last MAX_DATA_POINTS
      setCpuData((prev) => {
        const newData = [...prev, { timestamp, value: cpuPercent }];
        return newData.slice(-MAX_DATA_POINTS);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch CPU data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetchCPUData();

    // Set up interval to fetch data every 5 seconds for better performance
    const interval = setInterval(fetchCPUData, 5000);

    return () => clearInterval(interval);
  }, []);

  // Determine color based on CPU usage
  const getColorPalette = (usage: number) => {
    if (usage >= 80) return "red";
    if (usage >= 60) return "orange";
    if (usage >= 40) return "yellow";
    return "green";
  };

  const colorPalette = getColorPalette(currentCPU);

  // Chart configuration
  const chart = useChart({
    data: cpuData.map((point, index) => ({
      index,
      value: point.value,
    })),
    series: [{ name: "value", color: `primary.500` }],
  });

  // Format CPU percentage
  const formatCPU = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading && cpuData.length === 0) {
    return (
      <Card.Root maxW="sm" size="sm" overflow="hidden">
        <Card.Body>
          <Stat.Root>
            <Stat.Label>
              <HStack gap="2">
                <LuCpu />
                <span>CPU Usage</span>
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
              <LuCpu /> CPU Usage
            </Stat.Label>
            <Stat.ValueText color="brand.error">Error</Stat.ValueText>
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
              <LuCpu />
              <span>CPU Usage</span>
              {loading && (
                <Box w="2" h="2" bg="brand.primaryContainer" opacity={0.6} />
              )}
            </HStack>
          </Stat.Label>
          <Stat.ValueText
            color="brand.onSurface"
            fontSize="2xl"
            fontWeight="bold"
          >
            {formatCPU(currentCPU)}
          </Stat.ValueText>
        </Stat.Root>
      </Card.Body>

      {cpuData.length > 0 && (
        <CPUSparkLineChart data={cpuData} colorPalette={colorPalette} />
      )}
    </Card.Root>
  );
};

// Separate sparkline chart component
interface CPUSparkLineChartProps {
  data: CPUDataPoint[];
  colorPalette: string;
}

const CPUSparkLineChart: React.FC<CPUSparkLineChartProps> = ({
  data,
  colorPalette,
}) => {
  const chart = useChart({
    data: data.map((point, index) => ({
      index,
      value: point.value,
    })),
    series: [{ name: "value", color: `brand.onPrimaryContainer` }],
  });

  return (
    <Chart.Root height="10" chart={chart}>
      <LineChart
        data={chart.data}
        margin={{ top: 0, right: 0, left: 0, bottom: 15 }}
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
