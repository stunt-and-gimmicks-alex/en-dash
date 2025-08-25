// src/services/v06-systemStatsApi.ts
// PHASE 3: API service layer for new REST endpoints
// STANDALONE SERVICE - Import into v06-systemStatsHooks.ts

import type { SystemStat } from "@/types/unified";

export type StatField =
  | "cpu_percent"
  | "memory_percent"
  | "memory_used_gb"
  | "memory_total_gb"
  | "disk_percent"
  | "disk_used_gb"
  | "disk_total_gb"
  | "network_bytes_sent"
  | "network_bytes_recv"
  | "network_packets_sent"
  | "network_packets_recv"
  | "all";

export interface StatsRangeParams {
  minutesBack?: number;
  fields?: StatField[];
  limit?: number;
}

export interface StatsRangeResponse {
  success: boolean;
  minutes_back: number;
  total_records: number;
  fields_requested: string[];
  data: SystemStat[];
  note: string;
}

export interface StatsSummaryResponse {
  success: boolean;
  minutes_back: number;
  total_records: number;
  data: Record<
    string,
    {
      min: number;
      max: number;
      avg: number;
      count: number;
      latest: number;
    }
  >;
  note: string;
}

export interface LatestStatsResponse {
  success: boolean;
  fields_requested: string[];
  data: SystemStat | null;
  note: string;
}

class SystemStatsApiService {
  private baseUrl = "/api/system/stats";

  async getStatsRange(
    params: StatsRangeParams = {}
  ): Promise<StatsRangeResponse> {
    const { minutesBack = 60, fields = ["all"], limit = 1000 } = params;

    const searchParams = new URLSearchParams({
      minutes_back: minutesBack.toString(),
      limit: limit.toString(),
    });

    fields.forEach((field) => {
      searchParams.append("fields", field);
    });

    const response = await fetch(`${this.baseUrl}/range?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stats range: ${response.statusText}`);
    }

    return response.json();
  }

  async getLatestStats(
    fields: StatField[] = ["all"]
  ): Promise<LatestStatsResponse> {
    const searchParams = new URLSearchParams();
    fields.forEach((field) => {
      searchParams.append("fields", field);
    });

    const response = await fetch(`${this.baseUrl}/latest?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch latest stats: ${response.statusText}`);
    }

    return response.json();
  }

  async getStatsSummary(
    minutesBack: number = 60,
    fields: StatField[] = ["cpu_percent", "memory_percent", "disk_percent"]
  ): Promise<StatsSummaryResponse> {
    const searchParams = new URLSearchParams({
      minutes_back: minutesBack.toString(),
    });

    fields.forEach((field) => {
      searchParams.append("fields", field);
    });

    const response = await fetch(`${this.baseUrl}/summary?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stats summary: ${response.statusText}`);
    }

    return response.json();
  }

  async getChartData(
    metric: StatField,
    timeRangeMinutes: number
  ): Promise<SystemStat[]> {
    const response = await this.getStatsRange({
      minutesBack: timeRangeMinutes,
      fields: [metric],
      limit: Math.min(timeRangeMinutes, 1000),
    });

    return response.data;
  }
}

// Export singleton instance
export const systemStatsApi = new SystemStatsApiService();
