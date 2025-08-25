import React from "react";
import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatHelpText,
  Spinner,
  Alert,
} from "@chakra-ui/react";
import { SystemStatsCards } from "../Components/SystemStatsCards";
import { SystemStatsChart } from "../Components/SystemStatsChart";

export const Dashboard: React.FC = () => {
  return (
    <Box p={6} bg="gray.50" minH="100vh">
      {/* Summary Cards */}
      <SystemStatsCards />

      {/* Charts Grid */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} mt={6}>
        <SystemStatsChart
          metric="cpu_percent"
          title="CPU Usage"
          timeRangeMinutes={120}
          color="#e74c3c"
          unit="%"
        />
        <SystemStatsChart
          metric="memory_percent"
          title="Memory Usage"
          timeRangeMinutes={120}
          color="#3498db"
          unit="%"
        />
        <SystemStatsChart
          metric="disk_percent"
          title="Disk Usage"
          timeRangeMinutes={120}
          color="#f39c12"
          unit="%"
        />
        <SystemStatsChart
          metric="network_bytes_sent"
          title="Network Sent"
          timeRangeMinutes={120}
          color="#2ecc71"
          unit=" bytes"
        />
      </SimpleGrid>
    </Box>
  );
};
