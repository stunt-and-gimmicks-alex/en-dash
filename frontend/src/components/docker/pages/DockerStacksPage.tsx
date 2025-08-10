// frontend/src/pages/DockerStacksPage.tsx
// MIGRATED - Docker Stacks page using new unified WebSocket API + ChakraUI v3
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Container,
  Drawer,
  HStack,
  Portal,
  Skeleton,
  Spacer,
  Stack,
  Status,
  StatusIndicator,
  Tabs,
  Text,
} from "@chakra-ui/react";

// NEW - Using migrated API hooks with unified stack data
import { useStacks } from "@/hooks/useNewApi";
import type { UnifiedStack } from "@/types/unified";
import { useSelectedStackStore } from "@/stores/selectedStackStore";

// NEW - Using migrated stack components with UnifiedStack types
import { StackBlocks } from "@/components/docker/components/applications/StackBlocks";
import { StackDetail } from "@/components/docker/components/applications/StackDetail";
import { PiPlus } from "react-icons/pi";
import { useNavigation } from "@/contexts/NavigationContext";

export const DockerStacksPage: React.FC = () => {
  // NEW - Real-time unified stacks via WebSocket
  const {
    stacks,
    connected,
    loading,
    error,
    startStack,
    stopStack,
    restartStack,
  } = useStacks();

  const { onNavigate } = useNavigation();

  // Compute stack counts from unified data
  const stackCounts = useMemo(() => {
    if (!stacks || stacks.length === 0) {
      return {
        running: 0,
        partial: 0,
        stopped: 0,
        total: 0,
      };
    }

    return stacks.reduce(
      (counts, stack) => {
        const runningContainers = stack.stats?.containers?.running || 0;
        const totalContainers = stack.stats?.containers?.total || 0;

        if (runningContainers === 0) {
          counts.stopped++;
        } else if (runningContainers === totalContainers) {
          counts.running++;
        } else {
          counts.partial++;
        }

        counts.total++;
        return counts;
      },
      { running: 0, partial: 0, stopped: 0, total: 0 }
    );
  }, [stacks]);

  // Stack filters for tabs
  const stackFilter = [
    {
      status: "Running",
      colorPalette: "green",
      count: stackCounts.running,
      content: stacks.filter((stack) => {
        const running = stack.stats?.containers?.running || 0;
        const total = stack.stats?.containers?.total || 0;
        return running > 0 && running === total;
      }),
    },
    {
      status: "Partial",
      colorPalette: "yellow",
      count: stackCounts.partial,
      content: stacks.filter((stack) => {
        const running = stack.stats?.containers?.running || 0;
        const total = stack.stats?.containers?.total || 0;
        return running > 0 && running < total;
      }),
    },
    {
      status: "Stopped",
      colorPalette: "red",
      count: stackCounts.stopped,
      content: stacks.filter((stack) => {
        const running = stack.stats?.containers?.running || 0;
        return running === 0;
      }),
    },
    {
      status: "All",
      colorPalette: "gray",
      count: stackCounts.total,
      content: stacks,
    },
  ];

  return (
    <>
      <Box minH="2xl" display="flex" w="100%" p="4" flex="1">
        <Container fluid colorPalette="brand">
          {/* Header with connection status */}
          <HStack justify="space-between" align="center" mb="6">
            <Stack>
              <Text fontSize="xl" fontWeight="bold">
                Docker Applications
              </Text>
              <Text fontSize="sm" fontWeight="normal">
                What are docker applications? They're what Portainer refers to
                as "stacks": a single logical group defined in a compose file,
                and made up of services running in containers.
              </Text>
            </Stack>

            {/* Connection Status Indicator */}
            <Status.Root size="lg">
              <StatusIndicator
                color={connected ? "green" : error ? "red" : "yellow"}
              />
              <Text fontSize="sm" color="brand.onSurfaceVariant">
                {connected
                  ? `Connected (${stacks.length} stacks)`
                  : error
                  ? "Connection Error"
                  : "Connecting..."}
              </Text>
            </Status.Root>
          </HStack>

          {/* Tabs for stack filtering */}
          <Tabs.Root defaultValue="Running" size="lg">
            <Tabs.List>
              {stackFilter.map((filter) => (
                <Tabs.Trigger key={filter.status} value={filter.status}>
                  <Skeleton asChild loading={loading}>
                    <Badge
                      colorPalette={filter.colorPalette}
                      size="lg"
                      variant="plain"
                    >
                      {filter.status}&emsp;{filter.count}
                    </Badge>
                  </Skeleton>
                </Tabs.Trigger>
              ))}

              <Spacer />

              {/* Actions */}
              <HStack pos="relative" bottom="1" gap="4">
                <HStack hideBelow="md">
                  <Text fontWeight="medium" textStyle="sm">
                    Sort By:
                  </Text>
                  {/* TODO: Add sort dropdown */}
                </HStack>

                <Button
                  variant="solid"
                  colorPalette="brand"
                  size="sm"
                  onClick={() => onNavigate("new-docker-application")}
                >
                  <PiPlus />
                  New Stack
                </Button>
              </HStack>
            </Tabs.List>

            {/* Tab Content */}
            {stackFilter.map((filter) => (
              <Tabs.Content
                key={filter.status}
                value={filter.status}
                mt="0"
                pt="0"
              >
                {loading ? (
                  // Loading skeleton
                  <Stack gap="4" mt="2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} height="120px" />
                    ))}
                  </Stack>
                ) : filter.content.length === 0 ? (
                  // Empty state
                  <Box
                    textAlign="center"
                    py="12"
                    color="brand.onSurfaceVariant"
                  >
                    <Text fontSize="lg" mb="2">
                      No {filter.status.toLowerCase()} stacks found
                    </Text>
                    <Text fontSize="sm">
                      {filter.status === "All"
                        ? "Create your first Docker stack to get started"
                        : `No stacks are currently ${filter.status.toLowerCase()}`}
                    </Text>
                  </Box>
                ) : (
                  <StackBlocks
                    stacks={filter.content}
                    onStart={startStack}
                    onStop={stopStack}
                    onRestart={restartStack}
                    loading={loading}
                  />
                )}
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </Container>
      </Box>
    </>
  );
};

export default DockerStacksPage;
