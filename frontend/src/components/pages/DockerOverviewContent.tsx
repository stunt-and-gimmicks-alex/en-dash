// src/components/pages/DockerOverviewContent.tsx - Updated with better error handling
import React from "react";
import {
    Stack,
    Box,
    Text,
    HStack,
    Button,
    Card,
    Badge,
} from "@chakra-ui/react";
import { Plus, Square, RotateCcw, Play } from "lucide-react";
import { useDockgeStacks } from "@/hooks/useDockge";

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
            borderWidth="1px"
            bg={{ base: "gray.50", _dark: "gray.800" }}
            border="1px solid"
            borderColor={
                error
                    ? { base: "orange.200", _dark: "orange.700" }
                    : { base: "gray.200", _dark: "gray.700" }
            }
            display="flex"
            w="100%"
            backgroundImage={`url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.2' fillRule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`}
            backgroundClip="padding-box"
            p="6"
            flex="1"
        >
            <Stack gap="6" w="full">
                <HStack justify="space-between" align="center">
                    <Stack gap="1">
                        <HStack align="center" gap="3">
                            <Text
                                fontSize="lg"
                                fontWeight="bold"
                                color={{ base: "gray.900", _dark: "gray.100" }}
                            >
                                Docker Stacks
                            </Text>
                            {loading && (
                                <Box
                                    w="4"
                                    h="4"
                                    borderRadius="full"
                                    bg="blue.500"
                                    opacity={0.6}
                                />
                            )}
                            {error && (
                                <Text fontSize="xs" color="orange.500">
                                    Offline Mode
                                </Text>
                            )}
                        </HStack>
                        <Text
                            fontSize="sm"
                            color={{ base: "gray.600", _dark: "gray.400" }}
                        >
                            {error
                                ? "Showing cached data - Connect to Dockge for live updates"
                                : "Manage your Docker Compose stacks"}
                        </Text>
                    </Stack>
                    <HStack gap="2">
                        <Button
                            onClick={refreshStacks}
                            variant="outline"
                            size="sm"
                            loading={loading}
                        >
                            {error ? "Connect" : "Refresh"}
                        </Button>
                        <Button colorPalette="blue" size="sm">
                            <Plus size="16" />
                            New Stack
                        </Button>
                    </HStack>
                </HStack>

                {loading && stacks.length === 0 ? (
                    <Stack gap="4">
                        {/* Loading skeleton */}
                        {[1, 2, 3].map((i) => (
                            <Card.Root key={i}>
                                <Card.Body p="4">
                                    <Stack gap="3">
                                        <HStack justify="space-between">
                                            <Box
                                                h="5"
                                                w="40"
                                                bg="gray.200"
                                                borderRadius="md"
                                            />
                                            <Box
                                                h="6"
                                                w="16"
                                                bg="gray.200"
                                                borderRadius="md"
                                            />
                                        </HStack>
                                        <Box
                                            h="4"
                                            w="full"
                                            bg="gray.200"
                                            borderRadius="md"
                                        />
                                        <HStack justify="space-between">
                                            <Box
                                                h="4"
                                                w="20"
                                                bg="gray.200"
                                                borderRadius="md"
                                            />
                                            <Box
                                                h="4"
                                                w="24"
                                                bg="gray.200"
                                                borderRadius="md"
                                            />
                                        </HStack>
                                    </Stack>
                                </Card.Body>
                            </Card.Root>
                        ))}
                    </Stack>
                ) : stacks.length === 0 ? (
                    <Box
                        textAlign="center"
                        py="12"
                        color={{ base: "gray.500", _dark: "gray.400" }}
                    >
                        <Stack gap="3" align="center">
                            <Text fontSize="lg" fontWeight="medium">
                                {error
                                    ? "Unable to load Docker stacks"
                                    : "No Docker stacks found"}
                            </Text>
                            <Text fontSize="sm">
                                {error
                                    ? "Check your Dockge connection and try again"
                                    : "Create your first stack or check your stacks directory"}
                            </Text>
                            {error ? (
                                <Button
                                    onClick={refreshStacks}
                                    variant="outline"
                                    size="sm"
                                >
                                    Try Again
                                </Button>
                            ) : (
                                <Button colorPalette="blue" size="sm">
                                    <Plus size="16" />
                                    Create First Stack
                                </Button>
                            )}
                        </Stack>
                    </Box>
                ) : (
                    <Stack gap="4">
                        {stacks.map((stack) => (
                            <Card.Root key={stack.name}>
                                <Card.Body p="4">
                                    <Stack gap="3">
                                        <HStack
                                            justify="space-between"
                                            align="start"
                                        >
                                            <Stack gap="1">
                                                <Text
                                                    fontSize="md"
                                                    fontWeight="semibold"
                                                    color={{
                                                        base: "gray.900",
                                                        _dark: "gray.100",
                                                    }}
                                                >
                                                    {stack.name}
                                                </Text>
                                                <Text
                                                    fontSize="sm"
                                                    color={{
                                                        base: "gray.600",
                                                        _dark: "gray.400",
                                                    }}
                                                >
                                                    {stack.containers?.length ||
                                                        0}{" "}
                                                    containers •{" "}
                                                    {stack.path ||
                                                        "/opt/stacks/" +
                                                            stack.name}
                                                </Text>
                                            </Stack>
                                            <Badge
                                                colorPalette={
                                                    stack.status === "running"
                                                        ? "green"
                                                        : stack.status ===
                                                          "error"
                                                        ? "red"
                                                        : stack.status ===
                                                          "starting"
                                                        ? "blue"
                                                        : stack.status ===
                                                          "stopping"
                                                        ? "orange"
                                                        : "gray"
                                                }
                                                variant="subtle"
                                            >
                                                {stack.status}
                                            </Badge>
                                        </HStack>

                                        <HStack
                                            justify="space-between"
                                            fontSize="sm"
                                            color={{
                                                base: "gray.600",
                                                _dark: "gray.400",
                                            }}
                                        >
                                            <Text>
                                                {stack.containers?.filter(
                                                    (c) =>
                                                        c.status === "running"
                                                ).length || 0}{" "}
                                                running,{" "}
                                                {stack.containers?.filter(
                                                    (c) => c.status === "exited"
                                                ).length || 0}{" "}
                                                stopped
                                            </Text>
                                            <Text>
                                                {stack.lastUpdated
                                                    ? `Updated ${new Date(
                                                          stack.lastUpdated
                                                      ).toLocaleDateString()}`
                                                    : "Recently updated"}
                                            </Text>
                                        </HStack>

                                        <HStack gap="2">
                                            {stack.status === "running" ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        colorPalette="orange"
                                                        onClick={() =>
                                                            stopStack(
                                                                stack.name
                                                            )
                                                        }
                                                        disabled={!!error}
                                                    >
                                                        <Square size="14" />
                                                        Stop
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            restartStack(
                                                                stack.name
                                                            )
                                                        }
                                                        disabled={!!error}
                                                    >
                                                        <RotateCcw size="14" />
                                                        Restart
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    colorPalette="green"
                                                    onClick={() =>
                                                        startStack(stack.name)
                                                    }
                                                    disabled={!!error}
                                                >
                                                    <Play size="14" />
                                                    Start
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost">
                                                View Details
                                            </Button>
                                            <Button size="sm" variant="ghost">
                                                Edit
                                            </Button>
                                        </HStack>
                                    </Stack>
                                </Card.Body>
                            </Card.Root>
                        ))}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
};
