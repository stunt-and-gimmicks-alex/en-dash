// frontend/src/pages/DockerStacksPage.tsx
// MIGRATED - Docker Stacks page using new unified WebSocket API + ChakraUI v3

import React, { useState, useMemo } from "react";
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Container,
  Drawer,
  Heading,
  Highlight,
  HStack,
  Portal,
  Skeleton,
  Spacer,
  Stack,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { Plus } from "lucide-react";

// NEW - Using migrated API hooks with unified stack data
import { useStacks } from "@/hooks/useNewApi";
import type { UnifiedStack } from "@/types/unified";

// NEW - Using migrated stack components with UnifiedStack types
import { StackBlocks } from "@/components/stacks/StackBlocks";
import { StackDetail } from "@/components/stacks/StackDetail";

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

  const [selectedStack, setSelectedStack] = useState<UnifiedStack | null>(null);

  // Handle stack selection for detail drawer
  const handleStackToggle = (stack: UnifiedStack | null) => {
    setSelectedStack(stack);
  };

  const handleCloseDrawer = () => {
    setSelectedStack(null);
  };

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
      <Box
        minH="2xl"
        bg="brand.surfaceContainerLow"
        display="flex"
        w="100%"
        p="6"
        flex="1"
      >
        <Container fluid colorPalette="brand">
          {/* Header with connection status */}
          <HStack justify="space-between" align="center" mb="6">
            <Stack gap="2">
              <Text fontSize="2xl" fontWeight="bold" color="brand.onSurface">
                Docker Stacks
              </Text>
              <Text color="brand.onSurfaceVariant">
                Manage Docker Compose stacks with real-time monitoring
              </Text>
            </Stack>

            {/* Connection Status Indicator */}
            <HStack gap="2">
              <Box
                w="3"
                h="3"
                borderRadius="full"
                bg={connected ? "green.500" : error ? "red.500" : "yellow.500"}
              />
              <Text fontSize="sm" color="brand.onSurfaceVariant">
                {connected
                  ? `Connected (${stacks.length} stacks)`
                  : error
                  ? "Connection Error"
                  : "Connecting..."}
              </Text>
            </HStack>
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
              <HStack pos="relative" bottom="2" gap="4">
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
                  onClick={() => console.log("Create new stack")}
                >
                  <Plus />
                  New Stack
                </Button>
              </HStack>
            </Tabs.List>

            {/* Tab Content */}
            {stackFilter.map((filter) => (
              <Tabs.Content key={filter.status} value={filter.status}>
                {loading ? (
                  // Loading skeleton
                  <Stack gap="4" mt="6">
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
                  // Stack blocks with migrated components
                  <StackBlocks
                    stacks={filter.content}
                    onStart={startStack}
                    onStop={stopStack}
                    onRestart={restartStack}
                    onToggle={handleStackToggle}
                    selectedStack={selectedStack}
                    loading={loading}
                  />
                )}
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </Container>
      </Box>

      {/* Stack Detail Drawer - Full width sliding drawer */}
      <Drawer.Root
        open={!!selectedStack}
        onOpenChange={(details) => {
          if (!details.open) {
            handleCloseDrawer();
          }
        }}
        size="full"
        placement="end"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              {/* Drawer Header with Close Button */}
              <Drawer.Header
                bg="brand.primaryContainer"
                pb={{ sm: "2", md: "4" }}
              >
                <Drawer.Title h={{ sm: "2dvh", md: "4dvh" }}>
                  <Stack>
                    <HStack gap="6">
                      <Heading size="4xl" textTransform="lowercase">
                        <Highlight
                          ignoreCase
                          query="./stacks/"
                          styles={{ color: "brand.onPrimaryContainer" }}
                        >
                          {"./stacks/" + selectedStack?.name || "Stack Details"}
                        </Highlight>
                      </Heading>
                    </HStack>
                  </Stack>
                </Drawer.Title>
                <Drawer.CloseTrigger asChild m={{ sm: "2", md: "4" }}>
                  <CloseButton
                    size="lg"
                    variant="outline"
                    borderColor="brand.outline"
                  />
                </Drawer.CloseTrigger>
              </Drawer.Header>
              <Drawer.Body p="0">
                {selectedStack && (
                  <StackDetail
                    stack={selectedStack}
                    onStart={startStack}
                    onStop={stopStack}
                    onRestart={restartStack}
                    onToggle={handleStackToggle}
                    isSelected={true}
                    loading={loading}
                  />
                )}
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </>
  );
};

export default DockerStacksPage;
