// src/components/HeaderStatsBlock.tsx - Updated with Network I/O component
import React from "react";
import {
  Container,
  Heading,
  Highlight,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { CPUSparkline } from "./charts/CPUSparkline";
import { MemorySparkline } from "./charts/MemorySparkline";
import { DiskUsageDonut } from "./charts/DiskUsageDonut";
import { NetworkIOBars } from "./charts/NetworkIOBars";

interface StatData {
  value: string;
  label: string;
  color?: string;
}

interface HeaderStatsBlockProps {
  title?: string;
  description?: string;
  stats?: StatData[];
}

export const HeaderStatsBlock: React.FC<HeaderStatsBlockProps> = ({
  title = "En-Dash Server Management",
  description = "Professional home server management with real-time monitoring, seamless deployments, and enterprise-grade reliability.",
  stats = defaultStats,
}) => {
  return (
    <Container py="8" maxW="dvw" float="left" bg="brand.background">
      <Stack gap="8">
        <Stack gap="3" maxW="none" align="flex-start">
          <Heading
            as="h2"
            fontSize={{ base: "2xl", md: "3xl" }}
            lineHeight="shorter"
            fontWeight="bold"
            color={{ base: "gray.900", _dark: "gray.100" }}
            textAlign="left"
          >
            <Highlight query=" / " styles={{ color: "primary.500" }}>
              en-dash / An Elegant Homelab Control Center
            </Highlight>
          </Heading>

          <Text
            color="brand.onSurfaceVariant"
            fontSize={{ base: "sm", md: "md" }}
            lineHeight="relaxed"
            textAlign="left"
          >
            {description}
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 2, md: 4 }} gap="6">
          {/* CPU Usage Sparkline - First position */}
          <CPUSparkline />

          {/* Memory Usage Sparkline - Second position */}
          <MemorySparkline />

          {/* Disk Usage Bar Chart - Third position */}
          <DiskUsageDonut />

          {/* Network I/O Bars - Fourth position */}
          <NetworkIOBars />
        </SimpleGrid>
      </Stack>
    </Container>
  );
};

// Default stats for the remaining positions (if any)
const defaultStats: StatData[] = [
  {
    value: "0%", // This will be replaced by CPUSparkline
    label: "cpu usage",
    color: "green.500",
  },
  {
    value: "0%", // This will be replaced by MemorySparkline
    label: "memory usage",
    color: "blue.500",
  },
  {
    value: "0%", // This will be replaced by DiskUsageDonut
    label: "disk usage",
    color: "purple.500",
  },
  {
    value: "0", // This will be replaced by NetworkIOBars
    label: "network i/o",
    color: "cyan.500",
  },
];

// Hook for fetching live stats (placeholder for remaining stats)
export const useDockerStats = () => {
  const [stats, setStats] = React.useState<StatData[]>(defaultStats);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // TODO: Replace with actual API call to your backend
  const fetchStats = React.useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock dynamic data - replace with actual API call
      const mockStats: StatData[] = [
        {
          value: "CPU", // Will be replaced by sparkline
          label: "cpu usage",
          color: "green.500",
        },
        {
          value: "MEM", // Will be replaced by sparkline
          label: "memory usage",
          color: "blue.500",
        },
        {
          value: "DISK", // Will be replaced by bar chart
          label: "disk usage",
          color: "purple.500",
        },
        {
          value: "NET", // Will be replaced by network bars
          label: "network i/o",
          color: "cyan.500",
        },
      ];

      setStats(mockStats);
      setError(null);
    } catch (err) {
      setError("Failed to fetch stats");
      console.error("Stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

// Live Stats Component that fetches real data
export const LiveHeaderStatsBlock: React.FC<
  Omit<HeaderStatsBlockProps, "stats">
> = (props) => {
  const { stats, loading, error } = useDockerStats();

  if (error) {
    console.warn("Stats error:", error);
  }

  return <HeaderStatsBlock {...props} stats={loading ? defaultStats : stats} />;
};

export default HeaderStatsBlock;
