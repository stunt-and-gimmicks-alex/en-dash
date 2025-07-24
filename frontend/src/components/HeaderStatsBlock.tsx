import React from "react";
import { Container, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";

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
  title = "en–dash: Better Homelab Management.",
  description = "Comprehensive homelab dashboard and management suite with a clean, modern, customizeable interface in React+Chakra, and a Python RESTful API for accessing system components.",
  stats = defaultStats,
}) => {
  return (
    <Container py="8" maxW="dvw" float="left">
      <Stack gap="8">
        <Stack gap="3" maxW="none" align="flex-start">
          <Heading
            as="h2"
            fontSize={{ base: "2xl", md: "3xl" }}
            lineHeight="shorter"
            fontWeight="bold"
            color={{ base: "brand.500", _dark: "brand.500" }}
            textAlign="left"
          >
            {title}
          </Heading>

          <Text
            color={{ base: "gray.600", _dark: "gray.400" }}
            fontSize={{ base: "sm", md: "md" }}
            lineHeight="relaxed"
            textAlign="left"
          >
            {description}
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 2, md: 4 }} gap="6">
          {stats.map((item) => (
            <Stack
              gap="1"
              py="3"
              borderTopWidth="2px"
              borderTopColor={item.color || "blue.500"}
              key={item.label}
              align="flex-start"
            >
              <Text
                fontSize={{ base: "3xl", md: "4xl" }}
                fontWeight="medium"
                color={item.color || "blue.500"}
                lineHeight="none"
              >
                {item.value}
              </Text>
              <Text
                fontSize="xs"
                color={{ base: "gray.600", _dark: "gray.400" }}
              >
                {item.label}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
};

// Default stats for Dockge - these will eventually come from the server
const defaultStats: StatData[] = [
  {
    value: "99.9%",
    label: "system uptime",
    color: "green.500",
  },
  {
    value: "12",
    label: "active stacks",
    color: "blue.500",
  },
  {
    value: "48",
    label: "running containers",
    color: "purple.500",
  },
  {
    value: "2.4GB",
    label: "memory usage",
    color: "orange.500",
  },
];

// Hook for fetching live stats (placeholder for now)
export const useDockerStats = () => {
  const [stats, setStats] = React.useState<StatData[]>(defaultStats);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // TODO: Replace with actual API call to your Dockge backend
  const fetchStats = React.useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock dynamic data - replace with actual API call
      const mockStats: StatData[] = [
        {
          value: `${(Math.random() * 2 + 98).toFixed(1)}%`,
          label: "system uptime",
          color: "green.500",
        },
        {
          value: `${Math.floor(Math.random() * 20 + 5)}`,
          label: "active stacks",
          color: "blue.500",
        },
        {
          value: `${Math.floor(Math.random() * 100 + 20)}`,
          label: "running containers",
          color: "purple.500",
        },
        {
          value: `${(Math.random() * 3 + 1).toFixed(1)}GB`,
          label: "memory usage",
          color: "orange.500",
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
