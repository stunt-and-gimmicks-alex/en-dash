// frontend/src/pages/DockerOverviewPage.tsx
// Clean Docker overview page with stats and quick actions

import React from "react";
import {
  Box,
  Grid,
  GridItem,
  Text,
  Button,
  HStack,
  Stack,
  Card,
  Stat,
} from "@chakra-ui/react";
import {
  Play,
  Square,
  RotateCcw,
  Container,
  Image,
  Network,
  HardDrive,
  Activity,
} from "lucide-react";
import { useDockerStats, useDockgeStacks } from "@/hooks/useApi";
import type { NavigationProps } from "@/types/navigation";
import { RealtimeStacksTest } from "@/components/debug/RealTimeStackTest";

interface DockerOverviewPageProps {
  onNavigate?: (page: NavigationProps["currentPage"]) => void;
}

export const DockerOverviewPage: React.FC<DockerOverviewPageProps> = ({
  onNavigate,
}) => {
  const { stats, loading: statsLoading } = useDockerStats();
  const { stacks, loading: stacksLoading } = useDockgeStacks();

  // Calculate quick stats
  const runningStacks = stacks.filter((s) => s.status === "running").length;
  const totalContainers = stacks.reduce(
    (total, stack) => total + stack.containers.length,
    0
  );
  const runningContainers = stacks.reduce(
    (total, stack) =>
      total + stack.containers.filter((c) => c.status === "running").length,
    0
  );

  const quickStats = [
    {
      label: "Total Stacks",
      value: stacks.length,
      icon: Container,
      color: "blue",
      loading: stacksLoading,
    },
    {
      label: "Running Stacks",
      value: runningStacks,
      icon: Play,
      color: "green",
      loading: stacksLoading,
    },
    {
      label: "Total Containers",
      value: totalContainers,
      icon: Container,
      color: "purple",
      loading: stacksLoading,
    },
    {
      label: "Running Containers",
      value: runningContainers,
      icon: Activity,
      color: "green",
      loading: stacksLoading,
    },
  ];

  const quickActions = [
    {
      label: "View All Stacks",
      description: "Manage Docker Compose stacks",
      icon: Container,
      action: () => onNavigate?.("docker-stacks"),
      color: "blue",
    },
    {
      label: "Container Management",
      description: "View and control containers",
      icon: Container,
      action: () => console.log("Navigate to containers"),
      color: "purple",
    },
    {
      label: "Images & Registry",
      description: "Manage Docker images",
      icon: Image,
      action: () => console.log("Navigate to images"),
      color: "orange",
    },
    {
      label: "Networks & Volumes",
      description: "Configure Docker networking",
      icon: Network,
      action: () => console.log("Navigate to networks"),
      color: "teal",
    },
  ];

  return (
    <Box w="100%" bg="brand.surfaceContainerLow" p="6">
      <Stack gap="8">
        {/* Header */}
        <Stack gap="2">
          <Text fontSize="2xl" fontWeight="bold" color="brand.onSurface">
            Docker System Overview
          </Text>
          <Text color="brand.onSurfaceVariant">
            Monitor your Docker environment status and manage containers
          </Text>
        </Stack>

        {/* Quick Stats Grid */}
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          }}
          gap="4"
        >
          {quickStats.map((stat) => (
            <GridItem key={stat.label}>
              <Card.Root bg="brand.surfaceContainer" p="4">
                <Card.Body>
                  <HStack justify="space-between">
                    <Stack gap="1">
                      <Text fontSize="sm" color="brand.onSurfaceVariant">
                        {stat.label}
                      </Text>
                      <Text
                        fontSize="2xl"
                        fontWeight="bold"
                        color="brand.onSurface"
                      >
                        {stat.loading ? "..." : stat.value}
                      </Text>
                    </Stack>
                    <Box
                      p="2"
                      bg={`${stat.color}.100`}
                      color={`${stat.color}.600`}
                      borderRadius="md"
                    >
                      <stat.icon size="20" />
                    </Box>
                  </HStack>
                </Card.Body>
              </Card.Root>
            </GridItem>
          ))}
        </Grid>

        {/* System Status */}
        {stats && (
          <Card.Root bg="brand.surfaceContainer">
            <Card.Header>
              <Text fontSize="lg" fontWeight="semibold" color="brand.onSurface">
                Docker System Status
              </Text>
            </Card.Header>
            <Card.Body>
              <Grid
                templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                gap="6"
              >
                <Stat.Root>
                  <Stat.Label color="brand.onSurfaceVariant">Images</Stat.Label>
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

        {/* Quick Actions */}
        <Stack gap="4">
          <Text fontSize="lg" fontWeight="semibold" color="brand.onSurface">
            Quick Actions
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="4">
            {quickActions.map((action) => (
              <GridItem key={action.label}>
                <Card.Root
                  bg="brand.surfaceContainer"
                  _hover={{ bg: "brand.surfaceContainerHigh" }}
                  cursor="pointer"
                  onClick={action.action}
                  transition="all 0.2s"
                >
                  <Card.Body>
                    <HStack gap="4">
                      <Box
                        p="3"
                        bg={`${action.color}.100`}
                        color={`${action.color}.600`}
                        borderRadius="lg"
                      >
                        <action.icon size="24" />
                      </Box>
                      <Stack gap="1" flex="1">
                        <Text fontWeight="medium" color="brand.onSurface">
                          {action.label}
                        </Text>
                        <Text fontSize="sm" color="brand.onSurfaceVariant">
                          {action.description}
                        </Text>
                      </Stack>
                    </HStack>
                  </Card.Body>
                </Card.Root>
              </GridItem>
            ))}
          </Grid>
          <RealtimeStacksTest />
        </Stack>
      </Stack>
    </Box>
  );
};
