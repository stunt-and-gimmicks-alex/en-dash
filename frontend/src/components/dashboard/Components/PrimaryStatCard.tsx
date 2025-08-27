"use client";
import { useChart } from "@chakra-ui/charts";
import { useSystemStatsChart } from "@/hooks/v06-systemStatsHooks";
import {
  Box,
  Card,
  FormatNumber,
  HStack,
  Show,
  SimpleGrid,
  Span,
  Stat,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { LuEye } from "react-icons/lu";
import { AreaChart } from "./AreaChart";
import {
  sum,
  diff,
  type SummaryConfig,
  type TimeSeriesItem,
} from "./DataFetcher";

import { systemStatsSelectors } from "@/stores/v06-systemStatsStore";

export const StatCardBlock = () => {
  const [active, setActive] = useState("cpu-usage");
  const isActive = (id: string) => active === id;

  // Use sparkline data instead of hooks
  const sparklineData = systemStatsSelectors.useSparklineData();

  const summaryConfigs: SummaryConfig[] = [
    { id: "cpu-usage", title: "CPU Usage", metric: "cpu_percent", unit: "%" },
    {
      id: "memory-usage",
      title: "Memory Usage",
      metric: "memory_percent",
      unit: "%",
    },
    {
      id: "disk-usage",
      title: "Disk Usage",
      metric: "disk_percent",
      unit: "%",
    },
    {
      id: "network-sent",
      title: "Network Sent",
      metric: "network_bytes_sent",
      unit: "B",
    },
  ];

  const summaries = useMemo(() => {
    if (sparklineData.length === 0) return [];

    const dataMap = {
      "cpu-usage": sparklineData.map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString(),
        value: point.cpu_percent,
      })),
      "memory-usage": sparklineData.map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString(),
        value: point.memory_percent,
      })),
      "disk-usage": sparklineData.map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString(),
        value: point.disk_percent,
      })),
      "network-sent": sparklineData.map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString(),
        value: point.network_bytes_sent,
      })),
    };

    return summaryConfigs.map((config) => {
      const data = dataMap[config.id as keyof typeof dataMap] || [];
      return {
        id: config.id,
        title: config.title,
        total: sum(data),
        diff: diff(data),
        data: data,
        unit: config.unit,
      };
    });
  }, [sparklineData, summaryConfigs]);

  const label = useMemo(
    () => summaries.find((summary) => summary.id === active)?.title,
    [active]
  );

  const data = useMemo(
    () => summaries.find((summary) => summary.id === active)?.data ?? [],
    [active]
  );

  const chart = useChart({
    data,
    series: [{ name: "value", color: "teal.solid", label }],
  });

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
                      maximumFractionDigits={1}
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
          <AreaChart chart={chart} />
        </Card.Body>
      </Card.Root>
    </Box>
  );
};
