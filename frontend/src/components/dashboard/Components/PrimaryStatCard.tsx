// Debug version of block.tsx - Let's see what data we're getting
"use client";
import { useChart } from "@chakra-ui/charts";
import {
  Box,
  Card,
  FormatNumber,
  HStack,
  Show,
  SimpleGrid,
  Span,
  Stat,
  Spinner,
  Alert,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { LuEye } from "react-icons/lu";
import { SystemStatsChart } from "./SystemStatsChart";
import { useSimpleChartData } from "@/hooks/v06-useSimpleStatsHook";

export interface TimeSeriesItem {
  date: string;
  value: number;
}

export const StatCardBlock = () => {
  const [active, setActive] = useState("cpu-usage");
  const isActive = (id: string) => active === id;

  // Get data from your hook
  const { data, loading, error } = useSimpleChartData({
    fields: [
      "cpu_percent",
      "memory_percent",
      "disk_percent",
      "network_bytes_sent",
    ],
    minutesBack: 60,
    refreshInterval: 30,
  });

  // DEBUG: Let's see what we're getting
  console.log("🔍 Raw API data:", data);
  console.log("🔍 Data length:", data.length);
  if (data.length > 0) {
    console.log("🔍 First data point:", data[0]);
    console.log("🔍 Available fields:", Object.keys(data[0]));
  }

  // Transform API data into summaries
  const summaries = useMemo(() => {
    if (data.length === 0) {
      console.log("❌ No data to transform");
      return [];
    }

    const sum = (values: number[]) => {
      return values.reduce((acc, curr) => acc + curr, 0);
    };

    const diff = (values: number[]) => {
      if (values.length === 0) return 0;
      const first = values[0];
      const last = values[values.length - 1];
      return first > 0 ? (last - first) / first : 0;
    };

    const metrics = [
      { id: "cpu-usage", title: "CPU Usage", field: "cpu_percent" as const },
      {
        id: "memory-usage",
        title: "Memory Usage",
        field: "memory_percent" as const,
      },
      { id: "disk-usage", title: "Disk Usage", field: "disk_percent" as const },
      {
        id: "network-sent",
        title: "Network Sent",
        field: "network_bytes_sent" as const,
      },
    ];

    const result = metrics.map((metric) => {
      // Extract values for this metric
      const values = data.map((stat) => (stat[metric.field] as number) || 0);

      // Create time series data for chart
      // FIX: Handle null timestamps by using index as time proxy
      const timeSeriesData: TimeSeriesItem[] = data.map((stat, index) => ({
        date: stat.timestamp || `Point ${index + 1}`, // Fallback if timestamp is null
        value: (stat[metric.field] as number) || 0,
      }));

      // Alternative: Generate fake timestamps based on current time
      const now = new Date();
      const timeSeriesDataWithFakeTimes: TimeSeriesItem[] = data.map(
        (stat, index) => ({
          date: new Date(
            now.getTime() - (data.length - index - 1) * 60000
          ).toISOString(), // 1 minute intervals
          value: (stat[metric.field] as number) || 0,
        })
      );

      console.log(
        `🔍 ${metric.title} time series:`,
        timeSeriesData.slice(0, 3)
      ); // Show first 3 points

      return {
        id: metric.id,
        title: metric.title,
        total: values.length > 0 ? values[values.length - 1] : 0, // Latest value
        diff: diff(values),
        data: timeSeriesDataWithFakeTimes, // Use the fake timestamps version
      };
    });

    console.log("🔍 Transformed summaries:", result);
    return result;
  }, [data]);

  const label = useMemo(
    () => summaries.find((summary) => summary.id === active)?.title,
    [active, summaries]
  );

  const chartData = useMemo(() => {
    const activeChartData =
      summaries.find((summary) => summary.id === active)?.data ?? [];
    console.log(
      "🔍 Active chart data:",
      active,
      activeChartData.length,
      "points"
    );
    if (activeChartData.length > 0) {
      console.log("🔍 First chart point:", activeChartData[0]);
      console.log(
        "🔍 Last chart point:",
        activeChartData[activeChartData.length - 1]
      );
    }
    return activeChartData;
  }, [active, summaries]);

  const chart = useChart({
    data: chartData,
    series: [{ name: "value", color: "teal.solid", label }],
  });

  console.log("🔍 Chart config:", {
    dataLength: chart.data.length,
    series: chart.series,
    label,
  });

  if (loading) {
    return (
      <Box padding="4">
        <Card.Root>
          <Card.Body textAlign="center">
            <Spinner size="lg" />
            <Box mt={4}>Loading system statistics...</Box>
          </Card.Body>
        </Card.Root>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding="4">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>Failed to load data: {error}</Alert.Title>
        </Alert.Root>
      </Box>
    );
  }

  if (summaries.length === 0) {
    return (
      <Box padding="4">
        <Card.Root>
          <Card.Body textAlign="center">
            <Box mt={4}>No data available - check console logs</Box>
          </Card.Body>
        </Card.Root>
      </Box>
    );
  }

  return (
    <Box padding="4">
      <Card.Root>
        <Card.Header>
          <SimpleGrid minChildWidth="100px" gap="4">
            {summaries.map((summary) => (
              <Stat.Root
                key={summary.id}
                cursor="pointer"
                onClick={() => setActive(summary.id)}
              >
                <Stat.Label
                  data-current={isActive(summary.id) ? "" : undefined}
                  textUnderlineOffset="4px"
                  fontWeight="medium"
                  _current={{
                    textDecoration: "underline",
                    color: "fg",
                  }}
                >
                  {summary.title} {isActive(summary.id) && <LuEye />}
                </Stat.Label>
                <HStack gap="5">
                  <Stat.ValueText>
                    <FormatNumber
                      notation="compact"
                      unitDisplay="short"
                      value={summary.total}
                      maximumFractionDigits={2}
                    />
                  </Stat.ValueText>
                  <HStack gap="0">
                    <Show
                      when={summary.diff > 0}
                      fallback={<Stat.DownIndicator />}
                    >
                      <Stat.UpIndicator />
                    </Show>
                    <Span>
                      <FormatNumber value={summary.diff} style="percent" />
                    </Span>
                  </HStack>
                </HStack>
              </Stat.Root>
            ))}
          </SimpleGrid>
        </Card.Header>
        <Card.Body mt="8">
          <SystemStatsChart chart={chart} />
        </Card.Body>
      </Card.Root>
    </Box>
  );
};
