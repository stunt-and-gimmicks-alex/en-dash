// src/components/pages/DockerOverviewContent.tsx - Fixed with correct API types
import React from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Card,
  Flex,
  Heading,
  HStack,
  Link,
  NativeSelect,
  SegmentGroup,
  Skeleton,
  Spacer,
  Stack,
  Status,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { Layers, Play, Plus, RotateCcw, Settings, Square } from "lucide-react";
import { useStacks, useDockerStats } from "@/hooks/useApi";
import { StackBlocks } from "@/components/pageblocks/DockerBlocks/DockerStacksOverviewBlock";
import type { ApiStack } from "@/services/apiService";
import { useState } from "react";

export const DockerOverviewContent: React.FC = () => {
  const {
    stacks,
    loading,
    error,
    startStack,
    stopStack,
    restartStack,
    refreshStacks,
  } = useStacks();

  const { stats, stackCounts } = useDockerStats();

  const runningStacks = stacks.filter((stack) => stack.status === "running");
  const partialStacks = stacks.filter((stack) => stack.status === "partial");
  const stoppedStacks = stacks.filter((stack) => stack.status === "stopped");

  const [selectedStack, setSelectedStack] = useState<ApiStack | null>(null);

  const handleStackToggle = (stack: ApiStack | null) => {
    setSelectedStack(stack);
  };

  return (
    <Box
      minH="2xl"
      bg="brand.surfaceContainerLow"
      display="flex"
      w="100%"
      p="6"
      flex="1"
    >
      <Container fluid colorPalette="brand">
        <Heading size="2xl" pb="2">
          Stacks
        </Heading>
        <Tabs.Root size="lg" defaultValue="running">
          <Tabs.List>
            <Tabs.Trigger value="running">
              <Badge colorPalette="green" size="lg" variant="plain">
                Running&emsp;{stackCounts?.running || 0}
              </Badge>
            </Tabs.Trigger>
            <Tabs.Trigger value="partial">
              <Badge colorPalette="yellow" size="lg" variant="plain">
                Partial&emsp;{stackCounts?.partial || 0}
              </Badge>
            </Tabs.Trigger>
            <Tabs.Trigger value="stopped">
              <Badge colorPalette="red" size="lg" variant="plain">
                Stopped &emsp;{stackCounts?.stopped || 0}
              </Badge>
            </Tabs.Trigger>
            <Tabs.Trigger value="all">
              <Badge colorPalette="gray" size="lg" variant="plain">
                All &emsp;{stackCounts?.stopped || 0}
              </Badge>
            </Tabs.Trigger>
            <Spacer />
            <HStack pos="relative" bottom="2" gap="4">
              <HStack hideBelow="md">
                <Text fontWeight="medium" textStyle="sm">
                  Sort by
                </Text>
                <NativeSelect.Root width="100px" colorPalette="brand">
                  <NativeSelect.Field>
                    <option value="name">Name</option>
                    <option value="date">Date</option>
                    <option value="type">Type</option>
                    <option value="status">Status</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </HStack>
              <Button size="sm" colorPalette="brand">
                <Plus /> New Stack
              </Button>
            </HStack>
          </Tabs.List>
          <Tabs.Content value="running">
            <Stack gap="4">
              {runningStacks.length === 0 ? (
                <Box textAlign="center" py="8">
                  <Text color="gray.500">No running stacks found</Text>
                  <Button mt="2" onClick={refreshStacks}>
                    Refresh
                  </Button>
                </Box>
              ) : (
                runningStacks.map((stack) => (
                  <StackBlocks
                    key={stack.name}
                    stack={stack}
                    onStart={startStack}
                    onStop={stopStack}
                    onRestart={restartStack}
                    onToggle={handleStackToggle} // NEW
                    isSelected={selectedStack?.name === stack.name} // NEW
                    loading={loading}
                    disabled={!!error}
                  />
                ))
              )}
            </Stack>
          </Tabs.Content>
          <Tabs.Content value="partial">
            <Stack gap="4">
              {partialStacks.length === 0 ? (
                <Box textAlign="center" py="8">
                  <Text color="gray.500">No partial stacks found</Text>
                  <Button mt="2" onClick={refreshStacks}>
                    Refresh
                  </Button>
                </Box>
              ) : (
                partialStacks.map((stack) => (
                  <StackBlocks
                    key={stack.name}
                    stack={stack}
                    onStart={startStack}
                    onStop={stopStack}
                    onRestart={restartStack}
                    onToggle={handleStackToggle} // NEW
                    isSelected={selectedStack?.name === stack.name} // NEW
                    loading={loading}
                    disabled={!!error}
                  />
                ))
              )}
            </Stack>
          </Tabs.Content>
          <Tabs.Content value="stopped">
            <Stack gap="4">
              {stoppedStacks.length === 0 ? (
                <Box textAlign="center" py="8">
                  <Text color="gray.500">No stopped stacks found</Text>
                  <Button mt="2" onClick={refreshStacks}>
                    Refresh
                  </Button>
                </Box>
              ) : (
                stoppedStacks.map((stack) => (
                  <StackBlocks
                    key={stack.name}
                    stack={stack}
                    onStart={startStack}
                    onStop={stopStack}
                    onRestart={restartStack}
                    onToggle={handleStackToggle} // NEW
                    isSelected={selectedStack?.name === stack.name} // NEW
                    loading={loading}
                    disabled={!!error}
                  />
                ))
              )}
            </Stack>
          </Tabs.Content>
          <Tabs.Content value="all">
            <Stack gap="4">
              {stoppedStacks.length === 0 ? (
                <Box textAlign="center" py="8">
                  <Text color="gray.500">No stopped stacks found</Text>
                  <Button mt="2" onClick={refreshStacks}>
                    Refresh
                  </Button>
                </Box>
              ) : (
                stacks.map((stack) => (
                  <StackBlocks
                    key={stack.name}
                    stack={stack}
                    onStart={startStack}
                    onStop={stopStack}
                    onRestart={restartStack}
                    onToggle={handleStackToggle} // NEW
                    isSelected={selectedStack?.name === stack.name} // NEW
                    loading={loading}
                    disabled={!!error}
                  />
                ))
              )}
            </Stack>
          </Tabs.Content>
        </Tabs.Root>
      </Container>
    </Box>
  );
};
