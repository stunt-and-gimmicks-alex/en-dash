import { systemStatsSelectors } from "@/stores/v06-systemStatsStore";
import { Chart, useChart } from "@chakra-ui/charts";
import { Button, FormatByte, Group, HStack, Span } from "@chakra-ui/react";
import { PiCloudArrowDown, PiCloudArrowUp, PiCloudCheck } from "react-icons/pi";
import { Bar, BarChart, Cell, ReferenceLine } from "recharts";

export const NetworkSparkline = () => {
  // Get the CPU data array from your store
  const sparklineData = systemStatsSelectors.useSparklineData();

  // Transform it into the format the chart expects
  const chartData = sparklineData.map((point, index) => {
    if (index === 0) return { sent: 0, recd: 0, fill: "green.solid" };

    const prevPoint = sparklineData[index - 1];
    const timeDiff = (point.timestamp - prevPoint.timestamp) / 1000; // seconds
    const sentRate =
      (point.network_bytes_sent - prevPoint.network_bytes_sent) / timeDiff;
    const recdRate =
      (point.network_bytes_recv - prevPoint.network_bytes_recv) / timeDiff;

    return {
      sent: Math.max(0, sentRate).toFixed(1), // Avoid negative values from counter resets
      recd: Math.max(0, recdRate).toFixed(1),
      fill: "green.solid",
    };
  });

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
      NET:
      <Span color="fg" minW="30">
        <PiCloudArrowUp />
        <FormatByte value={Number(chart.data[29].sent)} />
      </Span>
      <Span color="fg" minW="30">
        <PiCloudArrowDown />
        <FormatByte value={Number(chart.data[29].recd)} />
      </Span>
      <Chart.Root height="10" chart={chart} p="0">
        <BarChart data={chart.data} barSize={2}>
          <Bar
            isAnimationActive={false}
            dataKey={chart.key("sent")}
            fill={chart.color("teal.solid")}
            stroke=""
          >
            {chart.data.map((item, index) => (
              <Cell key={index} fill={chart.color(item.fill)} />
            ))}
          </Bar>
          <Bar
            isAnimationActive={false}
            dataKey={chart.key("recd")}
            fill={chart.color("cyan.solid")}
            stroke=""
          >
            {chart.data.map((item, index) => (
              <Cell key={index} fill={chart.color(item.fill)} />
            ))}
          </Bar>
        </BarChart>
      </Chart.Root>
    </Button>
  );
};
