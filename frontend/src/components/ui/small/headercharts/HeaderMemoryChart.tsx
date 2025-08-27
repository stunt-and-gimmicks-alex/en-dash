import { systemStatsSelectors } from "@/stores/v06-systemStatsStore";
import { Chart, useChart } from "@chakra-ui/charts";
import { Button, Span } from "@chakra-ui/react";
import { PiMemory } from "react-icons/pi";

import { Bar, BarChart, Cell, ReferenceLine } from "recharts";

export const MemorySparkline = () => {
  // Get the CPU data array from your store
  const sparklineData = systemStatsSelectors.useSparklineData();

  // Transform it into the format the chart expects
  const chartData = sparklineData.map((point) => ({
    value: point.memory_percent.toFixed(1),
    fill: point.memory_percent > 80 ? "red.solid" : "green.solid",
  }));

  const chart = useChart({ data: chartData });

  return (
    <Button
      gap="2.5"
      variant="ghost"
      p="6"
      alignContent="center"
      color="fg.muted"
      bg="#000000/25"
      w="2xs"
    >
      <PiMemory /> RAM:<Span color="fg">{chart.data[29].value}%</Span>
      <Chart.Root height="10" chart={chart} p="0">
        <BarChart data={chart.data} barSize={2}>
          <Bar
            isAnimationActive={false}
            dataKey={chart.key("value")}
            fill={chart.color("green.solid")}
            stroke=""
          >
            {chart.data.map((item, index) => (
              <Cell key={index} fill={chart.color(item.fill)} />
            ))}
          </Bar>
          <ReferenceLine
            y={0}
            stroke={chart.color("border")}
            strokeDasharray="4 4"
            label={{
              value: 0,
              position: "right",
              fill: chart.color("fg.muted"),
            }}
          />
          <ReferenceLine
            y={chart.getMax("value")}
            stroke={chart.color("border")}
            strokeDasharray="4 4"
            label={{
              value: chart.getMax("value"),
              position: "right",
              fill: chart.color("fg.muted"),
            }}
          />
        </BarChart>
      </Chart.Root>
    </Button>
  );
};
