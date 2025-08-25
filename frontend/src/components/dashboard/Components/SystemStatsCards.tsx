import React from "react";
import { Box, SimpleGrid, Spinner, Alert, Card, Stat } from "@chakra-ui/react";
import { Chart, useChart } from "@chakra-ui/charts";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSystemStatsSummary } from "@/hooks/v06-systemStatsHooks";

export const SystemStatsCards: React.FC = () => {
  const { summary, loading, error } = useSystemStatsSummary(60); // Last hour summary

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Title>Failed to load system stats: {error}</Alert.Title>
      </Alert.Root>
    );
  }

  if (!summary) {
    return (
      <Alert.Root status="info">
        <Alert.Indicator />
        <Alert.Title>No system stats available</Alert.Title>
      </Alert.Root>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
      {/* CPU Card */}
      <Card.Root>
        <Card.Body>
          <Stat.Root>
            <Stat.Label>CPU Usage</Stat.Label>
            <Stat.ValueText>
              {summary.cpu_percent?.latest?.toFixed(1) || 0}%
            </Stat.ValueText>
            <Stat.HelpText>
              Avg: {summary.cpu_percent?.avg?.toFixed(1) || 0}% | Peak:{" "}
              {summary.cpu_percent?.max?.toFixed(1) || 0}%
            </Stat.HelpText>
          </Stat.Root>
        </Card.Body>
      </Card.Root>

      {/* Memory Card */}
      <Card.Root>
        <Card.Body>
          <Stat.Root>
            <Stat.Label>Memory Usage</Stat.Label>
            <Stat.ValueText>
              {summary.memory_percent?.latest?.toFixed(1) || 0}%
            </Stat.ValueText>
            <Stat.HelpText>
              Avg: {summary.memory_percent?.avg?.toFixed(1) || 0}% | Peak:{" "}
              {summary.memory_percent?.max?.toFixed(1) || 0}%
            </Stat.HelpText>
          </Stat.Root>
        </Card.Body>
      </Card.Root>

      {/* Disk Card */}
      <Card.Root>
        <Card.Body>
          <Stat.Root>
            <Stat.Label>Disk Usage</Stat.Label>
            <Stat.ValueText>
              {summary.disk_percent?.latest?.toFixed(1) || 0}%
            </Stat.ValueText>
            <Stat.HelpText>
              Avg: {summary.disk_percent?.avg?.toFixed(1) || 0}% | Peak:{" "}
              {summary.disk_percent?.max?.toFixed(1) || 0}%
            </Stat.HelpText>
          </Stat.Root>
        </Card.Body>
      </Card.Root>

      {/* Network Card */}
      <Card.Root>
        <Card.Body>
          <Stat.Root>
            <Stat.Label>Network I/O</Stat.Label>
            <Stat.ValueText>
              {formatBytes(summary.network_bytes_sent?.latest || 0)}
            </Stat.ValueText>
            <Stat.HelpText>
              Sent (latest) | Recv:{" "}
              {formatBytes(summary.network_bytes_recv?.latest || 0)}
            </Stat.HelpText>
          </Stat.Root>
        </Card.Body>
      </Card.Root>
    </SimpleGrid>
  );
};

// Helper function for formatting bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};
