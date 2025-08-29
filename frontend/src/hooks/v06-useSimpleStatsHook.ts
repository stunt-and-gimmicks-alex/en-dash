// frontend/src/hooks/useSimpleChartData.ts
// JUST A DATA FETCHING HOOK - NO COMPONENT CHANGES

import { useState, useEffect } from "react";
import { systemStatsApi, type StatField } from "@/services/v06-systemStatsApi";
import { type SystemStat } from "@/types/unified";

export interface SimpleChartDataOptions {
  fields: StatField[];
  minutesBack: number;
  refreshInterval?: number; // seconds, 0 to disable
}

export interface SimpleChartDataReturn {
  data: SystemStat[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * SIMPLE HOOK: Just fetch data from the backend API and return it
 * No aggregation, no complex transformations, just raw data
 */
export const useSimpleChartData = (
  options: SimpleChartDataOptions
): SimpleChartDataReturn => {
  const { fields, minutesBack, refreshInterval = 0 } = options;

  const [data, setData] = useState<SystemStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);

      const response = await systemStatsApi.getStatsRange({
        minutesBack,
        fields,
        limit: 1000,
      });

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError("Failed to fetch data");
        setData([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [minutesBack, fields.join(",")]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};
