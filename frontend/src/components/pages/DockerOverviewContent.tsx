// src/components/pages/DockerOverviewContent.tsx - Updated with skeleton loading
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
import { useDockgeStacks, useDockgeStats } from "@/hooks/useDockge";
import { StackBlocks } from "@/components/pageblocks/DockerBlocks/DockerStacksOverviewBlock";

export const DockerOverviewContent: React.FC = () => {
  const {
    stacks,
    loading,
    error,
    startStack,
    stopStack,
    restartStack,
    refreshStacks,
  } = useDockgeStacks();

  return (
    <Box
      minH="2xl"
      bg="brand.surfaceContainerLow"
      display="flex"
      w="100%"
      p="6"
      flex="1"
    >
      <Stack gap="6" w="full">
        <HStack justify="space-between" align="center" width="full">
          <Stack gap="1">
            <HStack align="center" gap="2">
              <Skeleton loading={loading} height="7" width="30">
                <Heading
                  as="h3"
                  fontSize="lg"
                  fontWeight="bold"
                  color="brand.onSurface"
                >
                  Docker Stacks
                </Heading>
              </Skeleton>
              {loading && <Skeleton height="4" width="4" borderRadius="full" />}
              {error && !loading && (
                <Badge fontSize="xs" color="orange.500">
                  Offline Mode
                </Badge>
              )}
            </HStack>
            <Skeleton loading={loading} height="4" width="80">
              <Text fontSize="sm" color="brand.onSurfaceVariant">
                {error
                  ? "Showing cached data - Connect to Dockge for live updates"
                  : "Manage your Docker Compose stacks"}
              </Text>
            </Skeleton>
          </Stack>
          <HStack gap="2">
            <Skeleton loading={loading} height="8" width="20">
              <Button
                onClick={refreshStacks}
                variant="outline"
                size="sm"
                loading={loading}
                colorPalette="brand"
              >
                {error ? "Connect" : "Refresh"}
              </Button>
            </Skeleton>
            <Skeleton loading={loading} height="8" width="100%">
              <Button colorPalette="brand" size="sm">
                <Plus size="16" />
                New Stack
              </Button>
            </Skeleton>
          </HStack>
        </HStack>

        {loading && stacks.length === 0 ? (
          <Stack gap="4">
            {/* Loading skeleton for stacks */}
            {[1, 2, 3].map((i) => (
              <Card.Root key={i}>
                <Card.Body p="4">
                  <Stack gap="3">
                    <HStack justify="space-between">
                      <Stack gap="1" flex="1">
                        <Skeleton height="5" width="40" />
                        <Skeleton height="4" width="60" />
                      </Stack>
                      <Skeleton height="6" width="16" borderRadius="full" />
                    </HStack>

                    <HStack justify="space-between">
                      <Skeleton height="4" width="32" />
                      <Skeleton height="4" width="24" />
                    </HStack>

                    <HStack gap="2">
                      <Skeleton height="8" width="16" borderRadius="md" />
                      <Skeleton height="8" width="20" borderRadius="md" />
                      <Skeleton height="8" width="24" borderRadius="md" />
                      <Skeleton height="8" width="12" borderRadius="md" />
                    </HStack>
                  </Stack>
                </Card.Body>
              </Card.Root>
            ))}
          </Stack>
        ) : stacks.length === 0 ? (
          <Box textAlign="center" py="12" color="brand.error">
            <Stack gap="3" align="center">
              <Text fontSize="lg" fontWeight="medium" color="brand.onError">
                {error
                  ? "Unable to load Docker stacks"
                  : "No Docker stacks found"}
              </Text>
              <Text fontSize="sm" color="brand.onError">
                {error
                  ? "Check your Dockge connection and try again"
                  : "Create your first stack or check your stacks directory"}
              </Text>
              {error ? (
                <Button
                  onClick={refreshStacks}
                  variant="outline"
                  size="sm"
                  color="bran.errorContainer"
                >
                  Try Again
                </Button>
              ) : (
                <Button colorPalette="brand" size="sm">
                  <Plus size="16" />
                  Create First Stack
                </Button>
              )}
            </Stack>
          </Box>
        ) : (
          <Stack gap="4">
            {stacks.map((stack) => (
              <Card.Root
                key={stack.name}
                bg="brand.surfaceContainerHigh"
                borderRadius="0"
              >
                <Card.Body p="4">
                  <Stack gap="3">
                    <HStack justify="space-between" align="start">
                      <Stack gap="1">
                        <Skeleton loading={loading} height="5" width="50">
                          <Text
                            fontSize="md"
                            fontWeight="semibold"
                            color="brand.onSurface"
                          >
                            {stack.name}
                          </Text>
                        </Skeleton>

                        <Skeleton loading={loading} height="4" width="80">
                          <Text fontSize="sm" color="brand.onSurfaceVariant">
                            {stack.containers?.length || 0} containers •{" "}
                            {stack.path || "/opt/stacks/" + stack.name}
                          </Text>
                        </Skeleton>
                      </Stack>

                      <Skeleton
                        loading={loading}
                        height="6"
                        width="20"
                        borderRadius="full"
                      >
                        <Badge
                          colorPalette={
                            stack.status === "running"
                              ? "green"
                              : stack.status === "error"
                              ? "red"
                              : stack.status === "starting"
                              ? "blue"
                              : stack.status === "stopping"
                              ? "orange"
                              : "gray"
                          }
                          variant="solid"
                          pb="1"
                        >
                          {stack.status}
                        </Badge>
                      </Skeleton>
                    </HStack>

                    <HStack
                      justify="space-between"
                      fontSize="sm"
                      color="brand.onSurfaceVariant"
                    >
                      <Skeleton loading={loading} height="4" width="50">
                        <Text>
                          {stack.containers?.filter(
                            (c) => c.status === "running"
                          ).length || 0}{" "}
                          running,{" "}
                          {stack.containers?.filter(
                            (c) => c.status === "exited"
                          ).length || 0}{" "}
                          stopped
                        </Text>
                      </Skeleton>

                      <Skeleton loading={loading} height="4" width="24">
                        <Text>
                          {stack.lastUpdated
                            ? `Updated ${new Date(
                                stack.lastUpdated
                              ).toLocaleDateString()}`
                            : "Recently updated"}
                        </Text>
                      </Skeleton>
                    </HStack>

                    <HStack gap="8">
                      {stack.status === "running" ? (
                        <>
                          <Skeleton
                            loading={loading}
                            height="8"
                            width="16"
                            borderRadius="md"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              colorPalette="orange"
                              onClick={() => stopStack(stack.name)}
                              disabled={!!error}
                            >
                              <Square size="14" />
                              Stop
                            </Button>
                          </Skeleton>

                          <Skeleton
                            loading={loading}
                            height="8"
                            width="20"
                            borderRadius="md"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restartStack(stack.name)}
                              disabled={!!error}
                            >
                              <RotateCcw size="14" />
                              Restart
                            </Button>
                          </Skeleton>
                        </>
                      ) : (
                        <Skeleton
                          loading={loading}
                          height="8"
                          width="16"
                          borderRadius="md"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            colorPalette="green"
                            onClick={() => startStack(stack.name)}
                            disabled={!!error}
                          >
                            <Play size="14" />
                            Start
                          </Button>
                        </Skeleton>
                      )}

                      <Skeleton
                        loading={loading}
                        height="8"
                        width="24"
                        borderRadius="md"
                      >
                        <Button size="sm" variant="ghost">
                          View Details
                        </Button>
                      </Skeleton>

                      <Skeleton
                        loading={loading}
                        height="8"
                        width="12"
                        borderRadius="md"
                      >
                        <Button size="sm" variant="ghost">
                          Edit
                        </Button>
                      </Skeleton>
                    </HStack>
                  </Stack>
                </Card.Body>
              </Card.Root>
            ))}
          </Stack>
        )}
      </Stack>
      <Container maxW="6xl" colorPalette="brand">
        <Heading size="3xl" pb="6">
          Docker Stacks
        </Heading>
        <Tabs.Root size="lg" defaultValue="running">
          <Tabs.List>
            <Tabs.Trigger value="running">
              <Badge colorPalette="green" size="lg" variant="plain">
                Running&emsp;{stacks?.length || 0}
              </Badge>
            </Tabs.Trigger>
            <Tabs.Trigger value="partial">
              <Badge colorPalette="yellow" size="lg" variant="plain">
                Partial&emsp;{stacks?.length || 0}
              </Badge>
            </Tabs.Trigger>
            <Tabs.Trigger value="stopped">
              <Badge colorPalette="red" size="lg" variant="plain">
                Stopped &emsp;{stacks?.length || 0}
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
            <StackBlocks />
          </Tabs.Content>
          <Tabs.Content value="partial">
            <Text h="100px" borderWidth="1px">
              Something Else
            </Text>
          </Tabs.Content>
          <Tabs.Content value="stopped">
            <Text h="100px" borderWidth="1px">
              Something Else
            </Text>
          </Tabs.Content>
        </Tabs.Root>
      </Container>
    </Box>
  );
};
