import type { StatField } from "@/services/v06-systemStatsApi";

export interface TimeSeriesItem {
  time: string;
  value: number;
}

export const sum = (data: TimeSeriesItem[]) => {
  return data.reduce((acc, curr) => acc + curr.value, 0);
};

export const diff = (data: TimeSeriesItem[]) => {
  if (data.length === 0) return 0;
  const first = data[0].value;
  const last = data[data.length - 1].value;
  return (last - first) / first;
};

export interface SummaryConfig {
  id: string;
  title: string;
  metric: StatField;
  timeRangeMinutes?: number;
  unit?: string;
}
