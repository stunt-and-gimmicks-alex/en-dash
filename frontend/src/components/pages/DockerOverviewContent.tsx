// src/components/pages/DockerOverviewContent.tsx - Fixed with correct API types
import React from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Drawer,
  Flex,
  Heading,
  HStack,
  NativeSelect,
  Presence,
  Skeleton,
  SkeletonText,
  Spacer,
  Stack,
  Tabs,
  Text,
  useTabs,
} from "@chakra-ui/react";
import { Plus } from "lucide-react";
import { useStacks, useDockerStats } from "@/hooks/useApi";
import {
  StackBlocks,
  StackDetail,
} from "@/components/pageblocks/DockerBlocks/DockerStacksOverviewBlock";
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

  const { stackCounts } = useDockerStats();

  const [selectedStack, setSelectedStack] = useState<ApiStack | null>(null);

  const handleStackToggle = (stack: ApiStack | null) => {
    setSelectedStack(stack);
  };

  const stackFilter = [
    {
      status: "Running",
      colorPalette: "green",
      count: stackCounts?.running || 0,
      content: stacks.filter((stack) => stack.status === "running"),
    },
    {
      status: "Partial",
      colorPalette: "yellow",
      count: stackCounts?.partial || 0,
      content: stacks.filter((stack) => stack.status === "partial"),
    },
    {
      status: "Stopped",
      colorPalette: "red",
      count: stackCounts?.stopped || 0,
      content: stacks.filter((stack) => stack.status === "stopped"),
    },
    {
      status: "All",
      colorPalette: "gray",
      count: stackCounts?.total || 0,
      content: stacks,
    },
  ];

  const tabs = useTabs({
    defaultValue: "Running",
  });

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
        <Tabs.RootProvider value={tabs} size="lg" defaultValue="running">
          <Tabs.List>
            {stackFilter.map((item) => (
              <Tabs.Trigger value={item.status}>
                <Skeleton asChild loading={loading}>
                  <Badge
                    colorPalette={item.colorPalette}
                    size="lg"
                    variant="plain"
                  >
                    {item.status}&emsp;{item.count}
                  </Badge>
                </Skeleton>
              </Tabs.Trigger>
            ))}
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
          {loading && (
            <Container
              fluid
              p="8"
              bg="brand.surfaceContainer"
              borderWidth="2px"
              borderColor="brand.outlineVariant"
            >
              <Flex
                justify="space-between"
                align="flex-start"
                gap="8"
                direction={{ base: "column", md: "row" }}
              >
                <SkeletonText noOfLines={4} gap="4" />
              </Flex>
            </Container>
          )}
          {stackFilter.map((item) => (
            <Tabs.Content value={item.status}>
              <Stack gap="4">
                {item.content.length === 0 ? (
                  <Box textAlign="center" py="8">
                    <Text color="gray.500">No {item.status} stacks found</Text>
                    <Button mt="2" onClick={refreshStacks}>
                      Refresh
                    </Button>
                  </Box>
                ) : (
                  item.content.map((stack) => (
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
          ))}
        </Tabs.RootProvider>
      </Container>
      {selectedStack && (
        <StackDetail
          key={selectedStack.name}
          stack={selectedStack}
          onStart={startStack}
          onStop={stopStack}
          onRestart={restartStack}
          onToggle={handleStackToggle}
          loading={loading}
          disabled={!!error}
        />
      )}
    </Box>
  );
};
