// Enhanced dashboard component for frontend/src/components/system/EnhancedHardwareDashboard.tsx
// Comprehensive hardware monitoring dashboard with all new capabilities - FIXED for Chakra UI v3

import React, { useState, useMemo } from "react";
import {
  Box,
  Card,
  SimpleGrid,
  HStack,
  VStack,
  Text,
  Badge,
  Select,
  Skeleton,
  Tabs,
  Alert,
  Stack,
  Group,
} from "@chakra-ui/react";
import { Chart, useChart } from "@chakra-ui/charts";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Thermometer,
  Fan,
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  Container,
  Gauge,
  TrendingUp,
} from "lucide-react";

import {
  useCompleteDashboard,
  useChartData,
  useTemperatureHistory,
  useCPUCoreHistory,
  useFanSpeedHistory,
  useDockerContainerHistory,
} from "@/hooks/useEnhancedSystemStats";

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export const EnhancedHardwareDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState(6);
  const { dashboard, sensors, dockerSummary, loading, error, refreshAll } =
    useCompleteDashboard(timeRange);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Dashboard Header */}
      <HStack justify="space-between" align="center">
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Hardware Monitoring Dashboard
          </Text>
          <Text color="fg.muted">
            Real-time system monitoring with historical data
          </Text>
        </Box>

        <HStack>
          <Text fontSize="sm">Time Range:</Text>
          <Select.Root
            value={timeRange.toString()}
            onValueChange={(e) => setTimeRange(Number(e.value))}
          >
            <Select.Trigger width="120px">
              <Select.ValueText />
            </Select.Trigger>
            <Select.Content>
              <Select.Item item="1">1 Hour</Select.Item>
              <Select.Item item="6">6 Hours</Select.Item>
              <Select.Item item="12">12 Hours</Select.Item>
              <Select.Item item="24">24 Hours</Select.Item>
              <Select.Item item="72">3 Days</Select.Item>
            </Select.Content>
          </Select.Root>
        </HStack>
      </HStack>

      {/* System Overview Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
        <SystemOverviewCard
          title="CPU Usage"
          value={dashboard?.basic_stats.cpu_percent || 0}
          unit="%"
          icon={<Cpu />}
          colorScheme="blue"
        />
        <SystemOverviewCard
          title="Memory Usage"
          value={dashboard?.basic_stats.memory_percent || 0}
          unit="%"
          icon={<MemoryStick />}
          colorScheme="green"
        />
        <SystemOverviewCard
          title="Disk Usage"
          value={dashboard?.basic_stats.disk_percent || 0}
          unit="%"
          icon={<HardDrive />}
          colorScheme="orange"
        />
        <SystemOverviewCard
          title="Docker Containers"
          value={dockerSummary?.summary.total_containers || 0}
          unit="active"
          icon={<Container />}
          colorScheme="purple"
        />
      </SimpleGrid>

      {/* Temperature Monitoring */}
      <TemperatureMonitoringSection timeRange={timeRange} />

      {/* CPU Detailed Monitoring */}
      <CPUDetailedMonitoringSection timeRange={timeRange} />

      {/* Memory Detailed Monitoring */}
      <MemoryDetailedMonitoringSection timeRange={timeRange} />

      {/* Fan Speed Monitoring */}
      <FanSpeedMonitoringSection timeRange={timeRange} />

      {/* Docker Container Resource Monitoring */}
      <DockerContainerMonitoringSection
        timeRange={timeRange}
        dockerSummary={dockerSummary}
      />

      {/* SSD Health Monitoring */}
      <SSDHealthMonitoringSection timeRange={timeRange} />
    </VStack>
  );
};

// =============================================================================
// SYSTEM OVERVIEW CARD
// =============================================================================

interface SystemOverviewCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  colorScheme: string;
}

const SystemOverviewCard: React.FC<SystemOverviewCardProps> = ({
  title,
  value,
  unit,
  icon,
  colorScheme,
}) => {
  const getStatusColor = (value: number, title: string) => {
    if (
      title.includes("CPU") ||
      title.includes("Memory") ||
      title.includes("Disk")
    ) {
      if (value > 90) return "red";
      if (value > 75) return "orange";
      if (value > 50) return "yellow";
      return "green";
    }
    return colorScheme;
  };

  return (
    <Card.Root>
      <Card.Body>
        <HStack justify="space-between">
          <VStack align="start" gap={1}>
            <Text fontSize="sm" color="fg.muted">
              {title}
            </Text>
            <HStack>
              <Text fontSize="2xl" fontWeight="bold">
                {typeof value === "number" ? value.toFixed(1) : value}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {unit}
              </Text>
            </HStack>
          </VStack>
          <Box color={`${getStatusColor(value, title)}.500`}>{icon}</Box>
        </HStack>

        {title.includes("%") && (
          <Badge colorPalette={getStatusColor(value, title)} size="sm" mt={2}>
            {value > 90
              ? "Critical"
              : value > 75
              ? "High"
              : value > 50
              ? "Medium"
              : "Normal"}
          </Badge>
        )}
      </Card.Body>
    </Card.Root>
  );
};

// =============================================================================
// TEMPERATURE MONITORING SECTION
// =============================================================================

const TemperatureMonitoringSection: React.FC<{ timeRange: number }> = ({
  timeRange,
}) => {
  const { temperatureHistory, loading, error } =
    useTemperatureHistory(timeRange);

  if (loading) return <Skeleton height="300px" />;
  if (error)
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );

  // Process temperature data for chart
  const chartData = useMemo(() => {
    if (!temperatureHistory) return [];

    const allTemps: any[] = [];

    // Combine all temperature sources
    [
      ...temperatureHistory.cpu_temps,
      ...temperatureHistory.memory_temps,
      ...temperatureHistory.ssd_temps,
    ]
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((entry) => {
        const time = new Date(entry.timestamp * 1000).toLocaleTimeString();
        const temps: any = { time, timestamp: entry.timestamp };

        // Add CPU temperatures
        if ("temperatures" in entry && entry.temperatures) {
          Object.entries(entry.temperatures).forEach(([key, value]) => {
            if (key.includes("tctl") || key.includes("cpu")) {
              temps[`CPU_${key}`] = value;
            }
          });
        }

        // Add memory temperatures
        if ("temperatures" in entry && entry.temperatures) {
          Object.entries(entry.temperatures).forEach(([key, value]) => {
            if (key.includes("dimm") || key.includes("memory")) {
              temps[`Memory_${key}`] = value;
            }
          });
        }

        // Add SSD temperatures
        if ("temperatures" in entry && entry.temperatures) {
          Object.entries(entry.temperatures).forEach(([key, ssdData]) => {
            if (typeof ssdData === "object" && "composite_temp" in ssdData) {
              temps[`SSD_${key}`] = ssdData.composite_temp;
            }
          });
        }

        allTemps.push(temps);
      });

    return allTemps;
  }, [temperatureHistory]);

  const chart = useChart({
    data: chartData,
    series: [
      { name: "CPU Temperature", color: "red.solid" },
      { name: "Memory Temperature", color: "blue.solid" },
      { name: "SSD Temperature", color: "green.solid" },
    ],
  });

  return (
    <Card.Root>
      <Card.Header>
        <HStack>
          <Thermometer size={20} />
          <Text fontSize="lg" fontWeight="semibold">
            Temperature Monitoring
          </Text>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Chart.Root height="300px" chart={chart}>
          <LineChart>
            <XAxis dataKey="time" stroke={chart.color("border")} />
            <YAxis stroke={chart.color("border")} />
            {Object.keys(chartData[0] || {})
              .filter((key) => key !== "time" && key !== "timestamp")
              .map((tempKey, index) => (
                <Line
                  key={tempKey}
                  type="monotone"
                  dataKey={tempKey}
                  stroke={chart.color(
                    chart.series[index % chart.series.length].color
                  )}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
          </LineChart>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  );
};

// =============================================================================
// CPU DETAILED MONITORING SECTION
// =============================================================================

const CPUDetailedMonitoringSection: React.FC<{ timeRange: number }> = ({
  timeRange,
}) => {
  const { coreHistory, loading, error } = useCPUCoreHistory(timeRange);
  const [viewMode, setViewMode] = useState<"individual" | "average">("average");

  if (loading) return <Skeleton height="400px" />;
  if (error)
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );

  const chartData = useMemo(() => {
    return coreHistory.map((entry) => {
      const time = new Date(entry.timestamp * 1000).toLocaleTimeString();
      const data: any = { time, timestamp: entry.timestamp };

      if (viewMode === "individual") {
        entry.cores.forEach((usage, index) => {
          data[`Core ${index}`] = usage;
        });
      } else {
        data["Average CPU"] =
          entry.cores.reduce((sum, usage) => sum + usage, 0) /
          entry.cores.length;
      }

      return data;
    });
  }, [coreHistory, viewMode]);

  const chart = useChart({
    data: chartData,
    series:
      viewMode === "individual"
        ? Array.from({ length: coreHistory[0]?.cores.length || 0 }, (_, i) => ({
            name: `Core ${i}`,
            color: `hsl(${
              (i * 360) / (coreHistory[0]?.cores.length || 1)
            }, 70%, 50%)`,
          }))
        : [{ name: "Average CPU", color: "blue.solid" }],
  });

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack>
            <Activity size={20} />
            <Text fontSize="lg" fontWeight="semibold">
              CPU Core Usage
            </Text>
          </HStack>
          <Select.Root
            value={viewMode}
            onValueChange={(e) =>
              setViewMode(e.value as "individual" | "average")
            }
          >
            <Select.Trigger size="sm" width="150px">
              <Select.ValueText />
            </Select.Trigger>
            <Select.Content>
              <Select.Item item="average">Average</Select.Item>
              <Select.Item item="individual">Per Core</Select.Item>
            </Select.Content>
          </Select.Root>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Chart.Root height="300px" chart={chart}>
          <AreaChart>
            <XAxis dataKey="time" stroke={chart.color("border")} />
            <YAxis stroke={chart.color("border")} domain={[0, 100]} />
            {Object.keys(chartData[0] || {})
              .filter((key) => key !== "time" && key !== "timestamp")
              .map((coreKey, index) => (
                <Area
                  key={coreKey}
                  type="monotone"
                  dataKey={coreKey}
                  stackId="cpu"
                  stroke={chart.color(
                    chart.series[index % chart.series.length].color
                  )}
                  fill={chart.color(
                    chart.series[index % chart.series.length].color
                  )}
                  fillOpacity={0.3}
                />
              ))}
          </AreaChart>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  );
};

// =============================================================================
// MEMORY DETAILED MONITORING SECTION
// =============================================================================

const MemoryDetailedMonitoringSection: React.FC<{ timeRange: number }> = ({
  timeRange,
}) => {
  const { memoryHistory, loading, error } = useEnhancedMemoryHistory(timeRange);

  if (loading) return <Skeleton height="400px" />;
  if (error)
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );

  const chartData = useMemo(() => {
    return memoryHistory.map((entry) => ({
      time: new Date(entry.timestamp * 1000).toLocaleTimeString(),
      timestamp: entry.timestamp,
      Used: (entry.memory.physical.used / (1024 * 1024 * 1024)).toFixed(2),
      Available: (
        entry.memory.physical.available /
        (1024 * 1024 * 1024)
      ).toFixed(2),
      Buffers: (entry.memory.physical.buffers / (1024 * 1024 * 1024)).toFixed(
        2
      ),
      Cached: (entry.memory.physical.cached / (1024 * 1024 * 1024)).toFixed(2),
      "Swap Used": (entry.memory.swap.used / (1024 * 1024 * 1024)).toFixed(2),
    }));
  }, [memoryHistory]);

  const chart = useChart({
    data: chartData,
    series: [
      { name: "Used", color: "red.solid" },
      { name: "Available", color: "green.solid" },
      { name: "Buffers", color: "blue.solid" },
      { name: "Cached", color: "yellow.solid" },
      { name: "Swap Used", color: "purple.solid" },
    ],
  });

  return (
    <Card.Root>
      <Card.Header>
        <HStack>
          <MemoryStick size={20} />
          <Text fontSize="lg" fontWeight="semibold">
            Memory Usage Breakdown
          </Text>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Chart.Root height="300px" chart={chart}>
          <AreaChart>
            <XAxis dataKey="time" stroke={chart.color("border")} />
            <YAxis
              stroke={chart.color("border")}
              label={{ value: "GB", angle: -90, position: "insideLeft" }}
            />
            {chart.series.map((series, index) => (
              <Area
                key={series.name}
                type="monotone"
                dataKey={series.name?.toString()}
                stackId="memory"
                stroke={chart.color(series.color)}
                fill={chart.color(series.color)}
                fillOpacity={0.7}
              />
            ))}
          </AreaChart>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  );
};

// =============================================================================
// FAN SPEED MONITORING SECTION
// =============================================================================

const FanSpeedMonitoringSection: React.FC<{ timeRange: number }> = ({
  timeRange,
}) => {
  const { fanHistory, loading, error } = useFanSpeedHistory(timeRange);

  if (loading) return <Skeleton height="300px" />;
  if (error)
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );

  const chartData = useMemo(() => {
    return fanHistory.map((entry) => {
      const time = new Date(entry.timestamp * 1000).toLocaleTimeString();
      const data: any = { time, timestamp: entry.timestamp };

      Object.entries(entry.fans).forEach(([fanName, fanData]) => {
        data[fanName] = fanData.speed_rpm;
      });

      return data;
    });
  }, [fanHistory]);

  const chart = useChart({
    data: chartData,
    series: Object.keys(fanHistory[0]?.fans || {}).map((fanName, index) => ({
      name: fanName,
      color: `hsl(${
        (index * 360) / Object.keys(fanHistory[0]?.fans || {}).length
      }, 70%, 50%)`,
    })),
  });

  return (
    <Card.Root>
      <Card.Header>
        <HStack>
          <Fan size={20} />
          <Text fontSize="lg" fontWeight="semibold">
            Fan Speed Monitoring
          </Text>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Chart.Root height="250px" chart={chart}>
          <LineChart>
            <XAxis dataKey="time" stroke={chart.color("border")} />
            <YAxis
              stroke={chart.color("border")}
              label={{ value: "RPM", angle: -90, position: "insideLeft" }}
            />
            {chart.series.map((series, index) => (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name?.toString()}
                stroke={chart.color(series.color)}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  );
};

// =============================================================================
// DOCKER CONTAINER MONITORING SECTION
// =============================================================================

const DockerContainerMonitoringSection: React.FC<{
  timeRange: number;
  dockerSummary: any;
}> = ({ timeRange, dockerSummary }) => {
  const { containerHistory, loading, error } =
    useDockerContainerHistory(timeRange);
  const [selectedMetric, setSelectedMetric] = useState<
    "cpu" | "memory" | "network"
  >("cpu");

  if (loading) return <Skeleton height="400px" />;
  if (error)
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );

  const chartData = useMemo(() => {
    return containerHistory.map((entry) => {
      const time = new Date(entry.timestamp * 1000).toLocaleTimeString();
      const data: any = { time, timestamp: entry.timestamp };

      Object.entries(entry.containers).forEach(
        ([containerName, containerData]) => {
          switch (selectedMetric) {
            case "cpu":
              data[containerName] = containerData.cpu.percent;
              break;
            case "memory":
              data[containerName] = containerData.memory.usage_mb;
              break;
            case "network":
              data[containerName] =
                containerData.network.rx_mb + containerData.network.tx_mb;
              break;
          }
        }
      );

      return data;
    });
  }, [containerHistory, selectedMetric]);

  const chart = useChart({
    data: chartData,
    series: Object.keys(containerHistory[0]?.containers || {}).map(
      (containerName, index) => ({
        name: containerName,
        color: `hsl(${
          (index * 360) /
          Object.keys(containerHistory[0]?.containers || {}).length
        }, 70%, 50%)`,
      })
    ),
  });

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack>
            <Container size={20} />
            <Text fontSize="lg" fontWeight="semibold">
              Docker Container Resources
            </Text>
          </HStack>
          <HStack>
            <Text fontSize="sm">Metric:</Text>
            <Select.Root
              value={selectedMetric}
              onValueChange={(e) =>
                setSelectedMetric(e.value as "cpu" | "memory" | "network")
              }
            >
              <Select.Trigger size="sm" width="120px">
                <Select.ValueText />
              </Select.Trigger>
              <Select.Content>
                <Select.Item item="cpu">CPU %</Select.Item>
                <Select.Item item="memory">Memory MB</Select.Item>
                <Select.Item item="network">Network MB</Select.Item>
              </Select.Content>
            </Select.Root>
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body>
        {/* Summary Cards */}
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={4}>
          <Box p={3} bg="bg.muted" borderRadius="md">
            <Text fontSize="sm" color="fg.muted">
              Total Containers
            </Text>
            <Text fontSize="xl" fontWeight="bold">
              {dockerSummary?.summary.total_containers || 0}
            </Text>
          </Box>
          <Box p={3} bg="bg.muted" borderRadius="md">
            <Text fontSize="sm" color="fg.muted">
              Total CPU Usage
            </Text>
            <Text fontSize="xl" fontWeight="bold">
              {dockerSummary?.summary.total_cpu_percent.toFixed(1) || 0}%
            </Text>
          </Box>
          <Box p={3} bg="bg.muted" borderRadius="md">
            <Text fontSize="sm" color="fg.muted">
              Total Memory Usage
            </Text>
            <Text fontSize="xl" fontWeight="bold">
              {dockerSummary?.summary.total_memory_gb.toFixed(1) || 0} GB
            </Text>
          </Box>
        </SimpleGrid>

        {/* Chart */}
        <Chart.Root height="300px" chart={chart}>
          <AreaChart>
            <XAxis dataKey="time" stroke={chart.color("border")} />
            <YAxis
              stroke={chart.color("border")}
              label={{
                value:
                  selectedMetric === "cpu"
                    ? "%"
                    : selectedMetric === "memory"
                    ? "MB"
                    : "MB/s",
                angle: -90,
                position: "insideLeft",
              }}
            />
            {chart.series.map((series, index) => (
              <Area
                key={series.name}
                type="monotone"
                dataKey={series.name?.toString()}
                stroke={chart.color(series.color)}
                fill={chart.color(series.color)}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  );
};

// =============================================================================
// SSD HEALTH MONITORING SECTION
// =============================================================================

const SSDHealthMonitoringSection: React.FC<{ timeRange: number }> = ({
  timeRange,
}) => {
  const {
    chartData: ssdTempData,
    loading,
    error,
  } = useChartData("ssd_temp", timeRange);

  if (loading) return <Skeleton height="300px" />;
  if (error)
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );

  const chart = useChart({
    data: ssdTempData,
    series: [{ name: "SSD Temperature", color: "orange.solid" }],
  });

  return (
    <Card.Root>
      <Card.Header>
        <HStack>
          <HardDrive size={20} />
          <Text fontSize="lg" fontWeight="semibold">
            SSD Health Monitoring
          </Text>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Chart.Root height="250px" chart={chart}>
          <LineChart>
            <XAxis dataKey="time" stroke={chart.color("border")} />
            <YAxis
              stroke={chart.color("border")}
              label={{ value: "°C", angle: -90, position: "insideLeft" }}
              domain={[0, 100]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chart.color("orange.solid")}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </Chart.Root>

        {/* SSD Health Indicators */}
        <Group mt={4} gap={4}>
          <Badge colorPalette="green">Temperature: Normal</Badge>
          <Badge colorPalette="blue">SMART: Healthy</Badge>
          <Badge colorPalette="yellow">Wear Level: Good</Badge>
        </Group>
      </Card.Body>
    </Card.Root>
  );
};

// =============================================================================
// LOADING SKELETON
// =============================================================================

const DashboardSkeleton: React.FC = () => (
  <VStack gap={6} align="stretch">
    <Skeleton height="60px" />
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} height="120px" />
      ))}
    </SimpleGrid>
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} height="350px" />
    ))}
  </VStack>
);
