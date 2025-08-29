"use client";

import { Chart, type UseChartReturn } from "@chakra-ui/charts";
import {
  Area,
  CartesianGrid,
  AreaChart as ReAreaChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TimeSeriesItem {
  date: string;
  value: number;
}

export interface AreaChartProps {
  chart: UseChartReturn<TimeSeriesItem>;
}

export function SystemStatsChart(props: AreaChartProps) {
  const { chart } = props;
  return (
    <Chart.Root maxH="sm" chart={chart}>
      <ReAreaChart data={chart.data}>
        <CartesianGrid
          stroke={chart.color("border")}
          vertical={false}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey={chart.key("date")}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          angle={-15}
          // Updated: Handle both date strings and ISO timestamps
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={chart.formatNumber({ notation: "compact" })}
        />
        <Tooltip
          cursor={false}
          animationDuration={100}
          content={<Chart.Tooltip />}
        />

        {chart.series.map((item) => (
          <defs key={item.name}>
            <Chart.Gradient
              id={`${item.name}-gradient`}
              stops={[
                { offset: "0%", color: item.color, opacity: 0.2 },
                { offset: "100%", color: item.color, opacity: 0.01 },
              ]}
            />
          </defs>
        ))}

        {chart.series.map((item) => (
          <Area
            key={item.name}
            isAnimationActive={false}
            dataKey={chart.key(item.name)}
            fill={`url(#${item.name}-gradient)`}
            stroke={chart.color(item.color)}
            strokeWidth={2}
            stackId="a"
          />
        ))}
      </ReAreaChart>
    </Chart.Root>
  );
}
