// src/components/pages/DockerOverviewColumn.tsx - Updated with real data
import React from "react";
import { Stack, Box, Text, HStack } from "@chakra-ui/react";
import { useDockgeStats } from "@/hooks/useDockge";

export const DockerOverviewColumn: React.FC = () => {
    const { stats, loading, error } = useDockgeStats();

    // Fallback to mock data if no real data available
    const displayStats = stats || {
        runningContainers: 0,
        exitedContainers: 0,
        inactiveContainers: 0,
        totalImages: 0,
        totalVolumes: 0,
        totalNetworks: 0,
    };

    const totalContainers =
        displayStats.runningContainers +
        displayStats.exitedContainers +
        displayStats.inactiveContainers;

    if (error) {
        return (
            <Box
                borderWidth="1px"
                maxW={{ base: "full", lg: "sm" }}
                minH="40"
                bg={{ base: "gray.50", _dark: "gray.800" }}
                border="1px solid"
                borderColor={{ base: "red.200", _dark: "red.700" }}
                display="flex"
                w="100%"
                p="4"
                alignItems="center"
                justifyContent="center"
            >
                <Stack gap="2" textAlign="center">
                    <Text color="red.500" fontWeight="semibold">
                        Connection Error
                    </Text>
                    <Text
                        fontSize="sm"
                        color={{ base: "gray.600", _dark: "gray.400" }}
                    >
                        Unable to connect to Dockge backend
                    </Text>
                </Stack>
            </Box>
        );
    }

    return (
        <Box
            borderWidth="1px"
            maxW={{ base: "full", lg: "sm" }}
            minH="40"
            bg={{ base: "gray.50", _dark: "gray.800" }}
            border="1px solid"
            borderColor={{ base: "gray.200", _dark: "gray.700" }}
            display="flex"
            w="100%"
            backgroundImage={`url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.2' fillRule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`}
            backgroundClip="padding-box"
            p="4"
        >
            <Stack gap="4" w="full">
                <HStack justify="space-between" align="center">
                    <Text
                        fontWeight="semibold"
                        fontSize="sm"
                        color={{ base: "gray.600", _dark: "gray.400" }}
                        whiteSpace="nowrap"
                    >
                        Docker Resources
                    </Text>
                    {loading && (
                        <Box
                            w="3"
                            h="3"
                            borderRadius="full"
                            bg="blue.500"
                            opacity={0.6}
                        />
                    )}
                </HStack>

                {/* Container Status */}
                <Box
                    p="4"
                    bg={{ base: "white", _dark: "gray.700" }}
                    borderWidth="1px"
                    borderColor={{ base: "gray.200", _dark: "gray.600" }}
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{
                        borderColor: "green.500",
                        bg: { base: "green.50", _dark: "green.900" },
                        transform: "translateY(-1px)",
                        boxShadow: "md",
                    }}
                    transition="all 0.2s"
                >
                    <Stack gap="2">
                        <HStack
                            gap="1"
                            justify="center"
                            fontSize="2xl"
                            fontWeight="bold"
                        >
                            <Text color="green.500">
                                {displayStats.runningContainers}
                            </Text>
                            <Text
                                color={{ base: "gray.400", _dark: "gray.500" }}
                            >
                                /
                            </Text>
                            <Text color="red.500">
                                {displayStats.exitedContainers}
                            </Text>
                            <Text
                                color={{ base: "gray.400", _dark: "gray.500" }}
                            >
                                /
                            </Text>
                            <Text color="gray.500">
                                {displayStats.inactiveContainers}
                            </Text>
                        </HStack>
                        <Text
                            fontSize="sm"
                            fontWeight="medium"
                            textAlign="center"
                        >
                            Active / Exited / Inactive Containers
                        </Text>
                        <Text
                            fontSize="xs"
                            color={{ base: "gray.500", _dark: "gray.400" }}
                            textAlign="center"
                        >
                            {totalContainers} total
                        </Text>
                    </Stack>
                </Box>

                {/* Docker Images */}
                <Box
                    p="4"
                    bg={{ base: "white", _dark: "gray.700" }}
                    borderWidth="1px"
                    borderColor={{ base: "gray.200", _dark: "gray.600" }}
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{
                        borderColor: "blue.500",
                        bg: { base: "blue.50", _dark: "blue.900" },
                        transform: "translateY(-1px)",
                        boxShadow: "md",
                    }}
                    transition="all 0.2s"
                >
                    <Stack gap="1">
                        <Text
                            fontSize="2xl"
                            fontWeight="bold"
                            color="blue.500"
                            textAlign="center"
                        >
                            {displayStats.totalImages}
                        </Text>
                        <Text
                            fontSize="sm"
                            fontWeight="medium"
                            textAlign="center"
                        >
                            Docker Images
                        </Text>
                        <Text
                            fontSize="xs"
                            color={{ base: "gray.500", _dark: "gray.400" }}
                            textAlign="center"
                        >
                            cached locally
                        </Text>
                    </Stack>
                </Box>

                {/* Volumes */}
                <Box
                    p="4"
                    bg={{ base: "white", _dark: "gray.700" }}
                    borderWidth="1px"
                    borderColor={{ base: "gray.200", _dark: "gray.600" }}
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{
                        borderColor: "purple.500",
                        bg: { base: "purple.50", _dark: "purple.900" },
                        transform: "translateY(-1px)",
                        boxShadow: "md",
                    }}
                    transition="all 0.2s"
                >
                    <Stack gap="1">
                        <Text
                            fontSize="2xl"
                            fontWeight="bold"
                            color="purple.500"
                            textAlign="center"
                        >
                            {displayStats.totalVolumes}
                        </Text>
                        <Text
                            fontSize="sm"
                            fontWeight="medium"
                            textAlign="center"
                        >
                            Volumes
                        </Text>
                        <Text
                            fontSize="xs"
                            color={{ base: "gray.500", _dark: "gray.400" }}
                            textAlign="center"
                        >
                            persistent storage
                        </Text>
                    </Stack>
                </Box>

                {/* Networks */}
                <Box
                    p="4"
                    bg={{ base: "white", _dark: "gray.700" }}
                    borderWidth="1px"
                    borderColor={{ base: "gray.200", _dark: "gray.600" }}
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{
                        borderColor: "orange.500",
                        bg: { base: "orange.50", _dark: "orange.900" },
                        transform: "translateY(-1px)",
                        boxShadow: "md",
                    }}
                    transition="all 0.2s"
                >
                    <Stack gap="1">
                        <Text
                            fontSize="2xl"
                            fontWeight="bold"
                            color="orange.500"
                            textAlign="center"
                        >
                            {displayStats.totalNetworks}
                        </Text>
                        <Text
                            fontSize="sm"
                            fontWeight="medium"
                            textAlign="center"
                        >
                            Networks
                        </Text>
                        <Text
                            fontSize="xs"
                            color={{ base: "gray.500", _dark: "gray.400" }}
                            textAlign="center"
                        >
                            virtual networks
                        </Text>
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
};
