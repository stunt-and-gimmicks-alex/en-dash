// frontend/src/components/docker/pages/DockerOverviewPage.tsx
// MIGRATED - Docker overview page using navigation context

import React from "react";
import {
  Box,
  Grid,
  GridItem,
  Text,
  HStack,
  Stack,
  Card,
  Stat,
} from "@chakra-ui/react";
import {
  PiShippingContainerFill,
  PiFloppyDiskFill,
  PiNetworkFill,
  PiStackFill,
  PiHardDrivesFill,
} from "react-icons/pi";

// CHANGED - Using new API hooks and navigation context
import { useDockerStats, useStacks } from "@/hooks/useNewApi";
import { useNavigation } from "@/contexts/NavigationContext";
import { RealtimeStacksTest } from "@/components/debug/RealTimeStackTest";

export const DockerOverviewPage: React.FC = () => {
  // NEW - Using navigation context instead of props
  const { onNavigate } = useNavigation();

  // CHANGED - Using new API hooks
  const { stats, loading: statsLoading } = useDockerStats();
  const { stacks, loading: stacksLoading } = useStacks();

  // Calculate quick stats
  const runningStacks = stacks.filter((s) => s.status === "running").length;
  const totalContainers = stacks.reduce(
    (total, stack) => total + (stack.containers?.containers?.length || 0),
    0
  );
  const runningContainers = stacks.reduce(
    (total, stack) =>
      total +
      (stack.containers?.containers?.filter((c) => c.status === "running")
        ?.length || 0),
    0
  );

  const quickStats = [
    {
      label: "running stacks",
      valueRunning: runningStacks,
      valueTotal: stacks.length,
      icon: PiStackFill,
      loading: stacksLoading,
    },
    {
      label: "running container",
      valueRunning: runningContainers,
      valueTotal: totalContainers,
      icon: PiShippingContainerFill,
      loading: stacksLoading,
    },
  ];

  const quickActions = [
    {
      label: "Manage Stacks",
      icon: PiStackFill,
      action: () => onNavigate("docker-stacks"),
      color: "yellow",
    },
    {
      label: "Manage Containers",
      icon: PiShippingContainerFill,
      action: () => console.log("Navigate to containers"),
      color: "orange",
    },
    {
      label: "Manage Images",
      icon: PiFloppyDiskFill,
      action: () => console.log("Navigate to images"),
      color: "blue",
    },
    {
      label: "Manage Networks",
      icon: PiNetworkFill,
      action: () => console.log("Navigate to networks"),
      color: "teal",
    },
    {
      label: "Manage Volumes",
      icon: PiHardDrivesFill,
      action: () => console.log("Navigate to volumes"),
      color: "green",
    },
  ];

  return (
    <Box w="100%" p="4">
      <Stack gap="4">
        <HStack gap="20" w="full" justifyContent="space-between">
          {/* Header */}
          <Stack gap="1">
            <Text fontSize="lg" fontWeight="bold">
              Docker System Overview
            </Text>
          </Stack>
          {/* Quick Stats Grid */}
          <Stack>
            <Grid
              templateColumns={{
                base: "1fr",
                md: "repeat(3, 1fr)",
                lg: "repeat(3, 1fr)",
              }}
              gap="10"
            >
              <GridItem justifyItems="right">
                <Text fontWeight="bold">Stats:</Text>
              </GridItem>
              {quickStats.map((stat) => (
                <GridItem key={stat.label}>
                  <HStack justify="space-between" gap="5">
                    <stat.icon size="24" />
                    <Stack>
                      <Text fontSize="md" fontWeight="normal">
                        {stat.loading
                          ? "..."
                          : stat.valueRunning +
                            "/" +
                            stat.valueTotal +
                            " running"}
                      </Text>
                    </Stack>
                  </HStack>
                </GridItem>
              ))}
            </Grid>
          </Stack>
          {/* Quick Actions */}
          <Stack gap="4">
            <Grid
              templateColumns={{ base: "1fr", md: "repeat(5, 1fr)" }}
              gap="4"
              p="0.5"
            >
              {quickActions.map((action) => (
                <GridItem key={action.label}>
                  <Card.Root
                    bg="brand.surfaceContainer"
                    _hover={{ bg: "brand.surfaceContainerHigh" }}
                    cursor="pointer"
                    onClick={action.action}
                    transition="all 0.2s"
                  >
                    <Card.Body py="2" px="4">
                      <HStack gap="6">
                        <Box
                          p="1"
                          color={`${action.color}.fg`}
                          borderRadius="lg"
                        >
                          <action.icon size="24" />
                        </Box>
                        <Stack gap="0" flex="1">
                          <Text fontWeight="medium">{action.label}</Text>
                        </Stack>
                      </HStack>
                    </Card.Body>
                  </Card.Root>
                </GridItem>
              ))}
            </Grid>
          </Stack>
        </HStack>
        <Stack>
          {/* System Status */}
          {stats && (
            <Card.Root bg="brand.surfaceContainer">
              <Card.Header>
                <Text
                  fontSize="lg"
                  fontWeight="semibold"
                  color="brand.onSurface"
                >
                  Docker System Status
                </Text>
              </Card.Header>
              <Card.Body>
                <Grid
                  templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                  gap="6"
                >
                  <Stat.Root>
                    <Stat.Label color="brand.onSurfaceVariant">
                      Images
                    </Stat.Label>
                    <Stat.ValueText color="brand.onSurface">
                      {stats.images?.total || 0}
                    </Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root>
                    <Stat.Label color="brand.onSurfaceVariant">
                      Networks
                    </Stat.Label>
                    <Stat.ValueText color="brand.onSurface">
                      {stats.networks?.total || 0}
                    </Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root>
                    <Stat.Label color="brand.onSurfaceVariant">
                      Volumes
                    </Stat.Label>
                    <Stat.ValueText color="brand.onSurface">
                      {stats.volumes?.total || 0}
                    </Stat.ValueText>
                  </Stat.Root>
                </Grid>
              </Card.Body>
            </Card.Root>
          )}

          <RealtimeStacksTest />
        </Stack>
      </Stack>
    </Box>
  );
};

export default DockerOverviewPage;
