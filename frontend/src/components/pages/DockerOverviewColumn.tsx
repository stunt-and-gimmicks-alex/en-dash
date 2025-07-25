// src/components/pages/DockerOverviewColumn.tsx - Updated with skeleton loading
import React from "react";
import {
  Stack,
  Box,
  Text,
  HStack,
  Skeleton,
  Heading,
  Stat,
  Status,
  Badge,
} from "@chakra-ui/react";
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
        bg="brand.error"
        display="flex"
        w="100%"
        p="4"
        alignItems="center"
        justifyContent="center"
      >
        <Stack gap="2" textAlign="center">
          <Text color="brand.onError" fontWeight="semibold">
            Connection Error
          </Text>
          <Text fontSize="sm" color="brand.onError">
            Unable to connect to Dockge backend
          </Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      maxW={{ base: "full", lg: "sm" }}
      minH="40"
      display="flex"
      w="100%"
      bg="brand.surfaceContainerLow"
      p="4"
    >
      <Stack gap="4" w="full">
        <HStack justify="space-between" align="center">
          <Skeleton loading={loading} height="5" width="32">
            <Heading
              as="h2"
              fontWeight="semibold"
              fontSize="lg"
              color="brand.onSurface"
              whiteSpace="nowrap"
            >
              Container Stats
            </Heading>
          </Skeleton>
          {loading && <Skeleton height="3" width="3" borderRadius="full" />}
        </HStack>

        {/* Container Status */}
        <Box p="4" pb="6" pt="0" bg="brand.surfaceContainerHigh">
          <Stack>
            <Box pb="10">
              <Skeleton loading={loading} height="8" width="full">
                <HStack gap="1" justify="center" fontWeight="bold">
                  <Stat.Root p="4" size="sm" colorPalette="green">
                    <Stat.Label color="brand.onPrimaryContainer">
                      Active
                    </Stat.Label>
                    <Stat.ValueText px="5" color="brand.onPrimaryContainer">
                      <Badge variant="solid" size="md" my="2">
                        {displayStats.runningContainers}
                      </Badge>
                    </Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root p="4" size="sm" colorPalette="red">
                    <Stat.Label color="brand.onPrimaryContainer">
                      Stopped
                    </Stat.Label>
                    <Stat.ValueText px="5" color="brand.onPrimaryContainer">
                      <Badge variant="solid" size="md" my="2">
                        {displayStats.exitedContainers}
                      </Badge>
                    </Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root p="4" size="sm" colorPalette="grey">
                    <Stat.Label color="brand.onPrimaryContainer">
                      Inactive
                    </Stat.Label>
                    <Stat.ValueText px="5">
                      <Badge variant="solid" size="md" my="2">
                        {displayStats.inactiveContainers}
                      </Badge>
                    </Stat.ValueText>
                  </Stat.Root>
                </HStack>
              </Skeleton>
            </Box>
            <Skeleton loading={loading} height="4" width="full">
              <Heading
                as="h4"
                fontSize="sm"
                fontWeight="medium"
                textAlign="center"
              >
                Containers
              </Heading>
            </Skeleton>
          </Stack>
        </Box>

        {/* Docker Images */}
        <Box p="4" pb="6" bg="brand.surfaceContainerHigh" transition="all 0.2s">
          <Stack gap="1">
            <Skeleton loading={loading} height="8" width="16" mx="auto">
              <Text
                fontSize="2xl"
                fontWeight="bold"
                color="brand.onPrimaryContainer"
                textAlign="center"
              >
                {displayStats.totalImages}
              </Text>
            </Skeleton>

            <Skeleton loading={loading} height="4" width="24" mx="auto">
              <Text fontSize="sm" fontWeight="medium" textAlign="center">
                Docker Images
              </Text>
            </Skeleton>

            <Skeleton loading={loading} height="3" width="20" mx="auto">
              <Text
                fontSize="xs"
                color="brand.onSurfaceVariant"
                textAlign="center"
              >
                cached locally
              </Text>
            </Skeleton>
          </Stack>
        </Box>

        {/* Volumes */}
        <Box p="4" pb="6" bg="brand.surfaceContainerHigh" transition="all 0.2s">
          <Stack gap="1">
            <Skeleton loading={loading} height="8" width="16" mx="auto">
              <Text
                fontSize="2xl"
                fontWeight="bold"
                color="brand.onPrimaryContainer"
                textAlign="center"
              >
                {displayStats.totalVolumes}
              </Text>
            </Skeleton>

            <Skeleton loading={loading} height="4" width="16" mx="auto">
              <Text fontSize="sm" fontWeight="medium" textAlign="center">
                Volumes
              </Text>
            </Skeleton>

            <Skeleton loading={loading} height="3" width="24" mx="auto">
              <Text
                fontSize="xs"
                color="brand.onSurfaceVariant"
                textAlign="center"
              >
                persistent storage
              </Text>
            </Skeleton>
          </Stack>
        </Box>

        {/* Networks */}
        <Box p="4" pb="6" bg="brand.surfaceContainerHigh" transition="all 0.2s">
          <Stack gap="1">
            <Skeleton loading={loading} height="8" width="16" mx="auto">
              <Text
                fontSize="2xl"
                fontWeight="bold"
                color="brand.onPrimaryContainer"
                textAlign="center"
              >
                {displayStats.totalNetworks}
              </Text>
            </Skeleton>

            <Skeleton loading={loading} height="4" width="16" mx="auto">
              <Text fontSize="sm" fontWeight="medium" textAlign="center">
                Networks
              </Text>
            </Skeleton>

            <Skeleton loading={loading} height="3" width="28" mx="auto">
              <Text
                fontSize="xs"
                color="brand.onSurfaceVariant"
                textAlign="center"
              >
                virtual networks
              </Text>
            </Skeleton>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};
