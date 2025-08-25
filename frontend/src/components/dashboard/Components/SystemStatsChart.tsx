import { useSystemStatsChart } from "@/hooks/v06-systemStatsHooks";
import type { StatField } from "@/services/v06-systemStatsApi";
import { Chart, useChart } from "@chakra-ui/charts";
import { Alert, Box, Card, Spinner } from "@chakra-ui/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SystemStatsChartProps {
  metric: StatField;
  title: string;
  timeRangeMinutes?: number;
  color?: string;
  unit?: string;
}

export const SystemStatsChart: React.FC<SystemStatsChartProps> = ({
  metric,
  title,
  timeRangeMinutes = 60,
  color = "blue.solid",
  unit = "%",
}) => {
  const { data, loading, error, latest, avg, max } = useSystemStatsChart(
    metric,
    timeRangeMinutes
  );

  // Prepare data for ChakraUI Charts
  const chart = useChart({
    data: data,
    series: [{ name: "value", color: color, label: title }],
  });

  if (loading) {
    return (
      <Card.Root>
        <Card.Body textAlign="center">
          <Spinner size="md" />
          <Box mt={2}>Loading {title.toLowerCase()}...</Box>
        </Card.Body>
      </Card.Root>
    );
  }

  if (error) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Title>
          Failed to load {title.toLowerCase()}: {error}
        </Alert.Title>
      </Alert.Root>
    );
  }

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        <Card.Description>
          Current: {latest.toFixed(1)}
          {unit} | Avg: {avg.toFixed(1)}
          {unit} | Peak: {max.toFixed(1)}
          {unit}
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Chart.Root maxH="12rem" chart={chart}>
          <LineChart data={chart.data}>
            <CartesianGrid stroke={chart.color("border")} vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="time"
              tickFormatter={(value) => value.split(":").slice(0, 2).join(":")}
              stroke={chart.color("border")}
            />
            <YAxis
              axisLine={false}
              tickFormatter={(value) => `${value}${unit}`}
              stroke={chart.color("border")}
            />
            <Tooltip
              content={<Chart.Tooltip />}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line
              type="monotone"
              dataKey={chart.key("value")}
              stroke={chart.color(color)}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  );
};
