// src/components/pages/DockerOverviewColumn.tsx - Updated with skeleton loading
// Framework Imports
import React from "react";
import {
  Container,
  Stack,
  Box,
  Text,
  HStack,
  Skeleton,
  Heading,
  SimpleGrid,
  Stat,
  Badge,
  Span,
} from "@chakra-ui/react";
import {
  LuContainer,
  LuHardDrive,
  LuNetwork,
  LuSquareDashedBottomCode,
} from "react-icons/lu";

Container;

// App Imports
import { useDockgeStats } from "@/hooks/useDockge";
import { SectionHeader } from "@/components/SectionHeader";

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

  const data = [
    {
      value: totalContainers,
      label: " total Docker containers",
      logo: <LuContainer />,
    },
    {
      value: displayStats.totalImages,
      label: " local Docker images",
      logo: <LuSquareDashedBottomCode />,
    },
    {
      value: displayStats.totalVolumes,
      label: " total persistent volumes",
      logo: <LuHardDrive />,
    },
    {
      value: displayStats.totalNetworks,
      label: " total virtual networks",
      logo: <LuNetwork />,
    },
  ];

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
      maxW={{ base: "full", lg: "full" }}
      minH="40"
      display="flex"
      w="100%"
      bg="brand.surfaceContainerLow"
      p="4"
      mb="4"
    >
      <Container maxW="full">
        <SectionHeader
          gap="4"
          tagline="Docker Overview"
          headline="Containers"
          optGreen={displayStats.runningContainers + " Active"}
          optRed={displayStats.exitedContainers + " Exited"}
          optGray={displayStats.exitedContainers + " Inactive"}
        >
          <HStack gap="4">
            {data.map((item) => (
              <HStack key={item.label} gap="4">
                <Box _icon={{ h: "5" }} color="brand.onTertiaryContainer">
                  {item.logo}
                </Box>
                <Text textStyle="lg">
                  <Span fontWeight="bold" color="brand.tertiary">
                    {item.value}
                  </Span>
                  <Span color="brand.onSurface">
                    &nbsp;{item.label}&emsp;&emsp;
                  </Span>
                </Text>
              </HStack>
            ))}
          </HStack>
        </SectionHeader>
      </Container>
    </Box>
  );
};
