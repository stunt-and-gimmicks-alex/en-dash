import { systemStatsSelectors } from "@/stores/v06-systemStatsStore";
import { Chart, useChart } from "@chakra-ui/charts";
import { Bar, BarChart, Cell } from "recharts";

const HDDSparkline = () => {
  // Get the CPU data array from your store
  const data = systemStatsSelectors.useDiskSparklineData();

  // Transform it into the format the chart expects
  const chartData = data.map((value) => ({
    value: value,
    fill:
      value > 80 ? "red.solid" : value > 50 ? "yellow.solid" : "green.solid",
  }));

  const chart = useChart({ data: chartData });

  return (
    <Chart.Root width="28" height="12" chart={chart}>
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
      </BarChart>
    </Chart.Root>
  );
};
