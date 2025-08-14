// frontend/src/components/docker/pages/DockerStackDetailPage.tsx
// MIGRATED - Original StackDetail layout restored using UnifiedStack + ChakraUI v3

import React from "react";
// import { stringify } from "yaml";

import {
  AbsoluteCenter,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  CloseButton,
  ColorSwatchMix,
  Container,
  DataList,
  Drawer,
  EmptyState,
  Flex,
  Group,
  Heading,
  HoverCard,
  HStack,
  Icon,
  IconButton,
  Link,
  List,
  Portal,
  ProgressCircle,
  SegmentGroup,
  Spinner,
  Stack,
  Status,
  Text,
} from "@chakra-ui/react";

import {
  PiAppWindow,
  PiArrowsLeftRight,
  PiArrowSquareIn,
  PiCalendar,
  PiCards,
  PiCloudX,
  PiCpu,
  PiFileCode,
  PiHardDrives,
  PiHeart,
  PiHeartHalf,
  PiMemory,
  PiNetwork,
  PiShippingContainer,
  PiTable,
  PiTagSimple,
  PiTerminal,
  PiTreeStructure,
} from "react-icons/pi";

// Keep container-block components as-is for now
// import { ContainerBlock } from "@/components/pageblocks/container-block/container-block";
// import { mapToStackContainers, apiService } from "@/services/apiService";
// import { validateStack } from "@/utils/stackValidation";

// import type { UnifiedNetworkItem } from "@/types/unified";

import { useSelectedStackStore } from "@/stores/selectedStackStore";
// import { useStackActions } from "@/hooks/v06-stackHooks";
import { useStackData } from "@/hooks/v06-useStackData";

import { DockerAppDetailMenu } from "../components/dockerApplications/DockerAppMenu";
import { ServicesPane } from "../components/dockerServices/ServicesPane";
import type {
  EnhancedUnifiedService,
  EnhancedUnifiedStack,
} from "@/types/unified";
import { EditableDrawerTable } from "@/components/ui/medium/EditableDrawerTable";

export const DockerStackDetailPage: React.FC = () => {
  const selectedStackName = useSelectedStackStore(
    (state) => state.selectedStackName
  );

  if (!selectedStackName) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <PiCloudX />
          </EmptyState.Indicator>
          <Stack textAlign="center">
            <EmptyState.Title>Stack Not Found</EmptyState.Title>
            <EmptyState.Description>
              En–Dash was unable to find a name for this stack, or a name was
              not passed.
            </EmptyState.Description>
          </Stack>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  // Stack actions (keep this for start/stop/restart functionality) -- not implemented yet~
  // const { startStack, stopStack, restartStack } = useStackActions();

  // Enhanced stack data with analytics - ONLY FIXED THE IMPORT
  const {
    stack,
    //    loading,
    error,
    resourceUsage,
    healthSummary,
    //    analysis,
    //    configs,
    isHealthy,
    //    hasIssues,
    //    containerRatio,
  } = useStackData(selectedStackName);

  const appHealthColors = () => {
    switch (true) {
      case healthSummary.score == 100:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
          </Group>
        );
      case healthSummary.score >= 90:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ecb306", "#038c3e", "#ecb306", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
          </Group>
        );
      case healthSummary.score >= 80:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ecb306", "#ecb306", "#ecb306", "#ecb306"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
          </Group>
        );
      case healthSummary.score >= 70:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ba1a1a", "#ecb306", "#ba1a1a", "#ecb306"]}
            />
            <ColorSwatchMix
              items={["#ecb306", "#038c3e", "#ecb306", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
          </Group>
        );
      case healthSummary.score >= 60:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ecb306", "#ecb306", "#ecb306", "#ecb306"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
          </Group>
        );
      case healthSummary.score >= 50:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ecb306", "#ba1a1a", "#ecb306"]}
            />
            <ColorSwatchMix
              items={["#ecb306", "#038c3e", "#ecb306", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
          </Group>
        );
      case healthSummary.score >= 40:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ecb306", "#ecb306", "#ecb306", "#ecb306"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
          </Group>
        );
      case healthSummary.score >= 30:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ecb306", "#ba1a1a", "#ecb306"]}
            />
            <ColorSwatchMix
              items={["#ecb306", "#038c3e", "#038c3e", "#ecb306"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
          </Group>
        );
      case healthSummary.score >= 20:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ecb306", "#ecb306", "#ecb306", "#ecb306"]}
            />
            <ColorSwatchMix
              items={["#038c3e", "#038c3e", "#038c3e", "#038c3e"]}
            />
          </Group>
        );
      case healthSummary.score >= 10:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ecb306", "#ba1a1a", "#ecb306"]}
            />
            <ColorSwatchMix
              items={["#ecb306", "#038c3e", "#ecb306", "#038c3e"]}
            />
          </Group>
        );
      case healthSummary.score > 0:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ecb306", "#ecb306", "#ecb306", "#ecb306"]}
            />
          </Group>
        );
      case healthSummary.score > 0:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
            <ColorSwatchMix
              items={["#ba1a1a", "#ba1a1a", "#ba1a1a", "#ba1a1a"]}
            />
          </Group>
        );
      default:
        return (
          <Group attached>
            <ColorSwatchMix
              items={["#3d3d3d", "#4f4f4f", "#3d3d3d", "#4f4f4f"]}
            />
            <ColorSwatchMix
              items={["#3d3d3d", "#4f4f4f", "#3d3d3d", "#4f4f4f"]}
            />
            <ColorSwatchMix
              items={["#3d3d3d", "#4f4f4f", "#3d3d3d", "#4f4f4f"]}
            />
            <ColorSwatchMix
              items={["#3d3d3d", "#4f4f4f", "#3d3d3d", "#4f4f4f"]}
            />
            <ColorSwatchMix
              items={["#3d3d3d", "#4f4f4f", "#3d3d3d", "#4f4f4f"]}
            />
          </Group>
        );
    }
  };

  if (error) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <PiCloudX />
          </EmptyState.Indicator>
          <Stack textAlign="center">
            <EmptyState.Title>Error Loading App</EmptyState.Title>
            <EmptyState.Description>{error}</EmptyState.Description>
          </Stack>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  if (!stack) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <Spinner size="xl" />
          </EmptyState.Indicator>
          <Stack textAlign="center">
            <EmptyState.Title>Loading</EmptyState.Title>
            <EmptyState.Description>
              Docker app "{selectedStackName}" will load momentarilly...
            </EmptyState.Description>
          </Stack>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  const services: EnhancedUnifiedService[] = Object.values(
    stack.services || {}
  );

  //  Dummy save function for now - will be wired up later
  // const handleSaveCompose = async (editedYaml: string) => {
  //    console.log("Saving compose file:", editedYaml);
  // TODO: Implement actual save functionality
  // This could call an API endpoint to update the compose file
  //  };

  //  const yaml_file_text: string = stringify(stack.compose_content);

  return (
    <Stack w="full" alignItems="top" gap="0" px="0" mx="0" colorPalette="brand">
      <Box px="3" py="1" bg="brand.bg" w="100%">
        <DockerAppDetailMenu />
      </Box>
      {/* Left Panel - Stack Overview */}
      <Container maxW="100%" minW="1/3" p="1">
        <Card.Root borderRadius="0">
          <Card.Header gap="1" flexDirection={{ base: "column", md: "row" }}>
            <Flex
              gap="10"
              w="full"
              justifyItems="space-between"
              flexDirection={{ base: "column", md: "row" }}
            >
              <Status.Root
                size="lg"
                colorPalette={
                  stack.status === "running"
                    ? "brand.solid"
                    : stack.status === "partial"
                    ? "brandYellow.solid"
                    : "brandRed.solid"
                }
                w="full"
                gap="4"
              >
                <Status.Indicator />
                <Icon size="lg">
                  <PiAppWindow />
                </Icon>
                <Card.Title textStyle="2xl">{stack.name}</Card.Title>
                <ProgressCircle.Root size="md" value={resourceUsage.cpu.total}>
                  <ProgressCircle.Circle>
                    <ProgressCircle.Track />
                    <ProgressCircle.Range />
                  </ProgressCircle.Circle>
                  <AbsoluteCenter>
                    <Icon size="sm">
                      <PiCpu />
                    </Icon>
                  </AbsoluteCenter>
                </ProgressCircle.Root>
                <ProgressCircle.Root
                  size="md"
                  value={resourceUsage.memory.used}
                >
                  <ProgressCircle.Circle>
                    <ProgressCircle.Track />
                    <ProgressCircle.Range />
                  </ProgressCircle.Circle>
                  <AbsoluteCenter>
                    <Icon size="sm">
                      <PiMemory />
                    </Icon>
                  </AbsoluteCenter>
                </ProgressCircle.Root>
                <Group attached colorPalette="grayBrand">
                  <Badge variant="solid" size="lg" color="brandGray.100">
                    <PiTerminal />
                  </Badge>
                  <Badge fontSize="md" size="lg" variant="outline">
                    {stack.path || "No application path found... "}
                  </Badge>
                </Group>
                <Group attached colorPalette="grayBrand">
                  <Badge variant="solid" size="lg" color="brandGray.100">
                    <PiFileCode />
                  </Badge>
                  <Badge fontSize="md" size="lg" variant="outline">
                    {stack.compose_file ||
                      "No application compose file found... "}
                  </Badge>
                </Group>
                <Group attached colorPalette="grayBrand">
                  <Badge variant="solid" size="lg" color="brandGray.100">
                    <PiCalendar />
                  </Badge>
                  <Badge fontSize="sm" size="lg" variant="outline">
                    Last Modified:{" "}
                    {new Date(stack.last_modified).toLocaleString()}
                  </Badge>
                </Group>
              </Status.Root>
            </Flex>
          </Card.Header>
          <Card.Body>
            <DataList.Root
              orientation="vertical"
              justifyContent="space-between"
              flex="content"
              variant="bold"
            >
              <Flex direction="row" justifyContent="space-between">
                <DataList.Item>
                  <DataList.ItemLabel>App Health</DataList.ItemLabel>
                  {isHealthy ? (
                    <DataList.ItemValue alignItems="center" flex="unset">
                      {appHealthColors()}
                    </DataList.ItemValue>
                  ) : (
                    <DataList.ItemValue
                      alignItems="center"
                      flex="unset"
                      color="redBrand.fg"
                    >
                      <PiHeartHalf />
                      &ensp;
                      {healthSummary.score}/100
                    </DataList.ItemValue>
                  )}
                  {healthSummary.issues.map((h, i) => (
                    <Stack key={i}>{h.message}</Stack>
                  ))}
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Sync Status</DataList.ItemLabel>{" "}
                  {/* TODO - Need to add a Service- and Container-defined total Networks stat to UnifiedStack */}
                  <DataList.ItemValue flex="unset">
                    100% Synced
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Networks</DataList.ItemLabel>{" "}
                  <DataList.ItemValue flex="unset">
                    <HoverCard.Root>
                      <HoverCard.Trigger asChild>
                        <Link>
                          <PiNetwork />
                          <Text>
                            {stack.aggregated_configs?.networks.length}
                          </Text>{" "}
                          Found
                        </Link>
                      </HoverCard.Trigger>
                      <HoverCard.Positioner>
                        <HoverCard.Content>
                          <HoverCard.Arrow>
                            <HoverCard.ArrowTip />
                          </HoverCard.Arrow>
                          <List.Root gap="2" variant="plain" align="center">
                            {stack?.aggregated_configs?.networks ? (
                              stack.aggregated_configs.networks.map(
                                (n, index: number) => (
                                  <List.Item key={index} w="100%">
                                    <List.Indicator asChild color="green.500">
                                      <Badge
                                        colorPalette="secondaryBrand"
                                        variant="outline"
                                      >
                                        <Text color="secondaryBrand.fg">
                                          {n.level}
                                        </Text>
                                      </Badge>
                                    </List.Indicator>
                                    <Text>{n.name}</Text>
                                  </List.Item>
                                )
                              )
                            ) : (
                              <Text color="brand.error">
                                No networks found.
                              </Text>
                            )}
                          </List.Root>
                        </HoverCard.Content>
                      </HoverCard.Positioner>
                    </HoverCard.Root>
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Ports</DataList.ItemLabel>{" "}
                  <DataList.ItemValue flex="unset">
                    <HoverCard.Root>
                      <HoverCard.Trigger asChild>
                        <Link>
                          <PiArrowsLeftRight />
                          <Text>
                            {stack.aggregated_configs?.ports.length}
                          </Text>{" "}
                          Found
                        </Link>
                      </HoverCard.Trigger>
                      <HoverCard.Positioner>
                        <HoverCard.Content>
                          <HoverCard.Arrow>
                            <HoverCard.ArrowTip />
                          </HoverCard.Arrow>
                          <List.Root gap="2" variant="plain" align="center">
                            {stack?.aggregated_configs?.ports ? (
                              stack.aggregated_configs.ports.map(
                                (p, index: number) => (
                                  <List.Item key={index} w="100%">
                                    <List.Indicator asChild color="green.500">
                                      <Badge
                                        colorPalette="secondaryBrand"
                                        variant="outline"
                                      >
                                        <Text color="secondaryBrand.fg">
                                          {p.level}
                                        </Text>
                                      </Badge>
                                    </List.Indicator>
                                    <Text color="secondaryBrand.emphasized">
                                      {p.host}
                                    </Text>
                                    <Text>:</Text>
                                    <Text color="brand.fg">{p.container}</Text>
                                  </List.Item>
                                )
                              )
                            ) : (
                              <Text color="brand.error">No ports found.</Text>
                            )}
                          </List.Root>
                        </HoverCard.Content>
                      </HoverCard.Positioner>
                    </HoverCard.Root>
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Volumes</DataList.ItemLabel>{" "}
                  <DataList.ItemValue flex="unset">
                    <HoverCard.Root>
                      <HoverCard.Trigger asChild>
                        <Link>
                          <PiHardDrives />
                          <Text>
                            {stack.aggregated_configs?.volumes.length}
                          </Text>{" "}
                          Found
                        </Link>
                      </HoverCard.Trigger>
                      <HoverCard.Positioner>
                        <HoverCard.Content>
                          <HoverCard.Arrow>
                            <HoverCard.ArrowTip />
                          </HoverCard.Arrow>
                          <List.Root gap="2" variant="plain" align="center">
                            {stack?.aggregated_configs?.volumes ? (
                              stack.aggregated_configs.volumes.map(
                                (v, index: number) => (
                                  <List.Item key={index} w="100%">
                                    <List.Indicator asChild color="green.500">
                                      <Badge
                                        colorPalette="secondaryBrand"
                                        variant="outline"
                                      >
                                        <Text color="secondaryBrand.fg">
                                          {v.level}
                                        </Text>
                                      </Badge>
                                    </List.Indicator>
                                    <Text>{v.name}</Text>
                                    <Text color="secondaryBrand.fg">
                                      &ensp;[{v.type}]
                                    </Text>
                                  </List.Item>
                                )
                              )
                            ) : (
                              <Text color="brand.error">No volumes found.</Text>
                            )}
                          </List.Root>
                        </HoverCard.Content>
                      </HoverCard.Positioner>
                    </HoverCard.Root>
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Container Status</DataList.ItemLabel>
                  <DataList.ItemValue flex="unset">
                    <HoverCard.Root>
                      <HoverCard.Trigger asChild>
                        <Link>
                          <PiShippingContainer />
                          <Text>{stack.containers.total}</Text> Found
                        </Link>
                      </HoverCard.Trigger>
                      <HoverCard.Positioner>
                        <HoverCard.Content>
                          <HoverCard.Arrow>
                            <HoverCard.ArrowTip />
                          </HoverCard.Arrow>

                          <List.Root gap="2" variant="plain" align="center">
                            <Text
                              fontWeight="medium"
                              textStyle="sm"
                              color="brand.fg"
                            >
                              Running: {stack.containers.running}
                            </Text>
                            {stack?.containers.containers ? (
                              stack.containers.containers.map(
                                (c, index: number) => (
                                  <List.Item key={index} w="100%">
                                    <List.Indicator asChild color="green.500">
                                      <Badge
                                        colorPalette="secondaryBrand"
                                        variant="outline"
                                      >
                                        <Text color="secondaryBrand.fg">
                                          {c.status === "running"
                                            ? c.short_id
                                            : "-"}
                                        </Text>
                                      </Badge>
                                    </List.Indicator>
                                    <Text>
                                      {c.status === "running" ? c.name : "-"}
                                    </Text>
                                  </List.Item>
                                )
                              )
                            ) : (
                              <Text color="brand.muted">
                                No running containers.
                              </Text>
                            )}
                            <Text
                              fontWeight="bold"
                              textStyle="sm"
                              color="yellowBrand.fg"
                            >
                              Paused: {stack.containers.paused}
                            </Text>
                            {stack?.containers.containers ? (
                              stack.containers.containers.map(
                                (c, index: number) => (
                                  <List.Item key={index} w="100%">
                                    <List.Indicator asChild color="green.500">
                                      <Badge
                                        colorPalette="secondaryBrand"
                                        variant="outline"
                                      >
                                        <Text color="secondaryBrand.fg">
                                          {c.status === "paused"
                                            ? c.short_id
                                            : "-"}
                                        </Text>
                                      </Badge>
                                    </List.Indicator>
                                    <Text>
                                      {c.status === "paused" ? c.name : "-"}
                                    </Text>
                                  </List.Item>
                                )
                              )
                            ) : (
                              <Text color="brand.muted">
                                No paused containers.
                              </Text>
                            )}
                            <Text
                              fontWeight="bold"
                              textStyle="sm"
                              color="redBrand.fg"
                            >
                              Stopped: {stack.containers.stopped}
                            </Text>
                            {stack?.containers.containers ? (
                              stack.containers.containers.map(
                                (c, index: number) => (
                                  <List.Item key={index} w="100%">
                                    <List.Indicator asChild color="green.500">
                                      <Badge
                                        colorPalette="secondaryBrand"
                                        variant="outline"
                                      >
                                        <Text color="secondaryBrand.fg">
                                          {c.status === "stopped"
                                            ? c.short_id
                                            : "-"}
                                        </Text>
                                      </Badge>
                                    </List.Indicator>
                                    <Text>
                                      {c.status === "stopped" ? c.name : "-"}
                                    </Text>
                                  </List.Item>
                                )
                              )
                            ) : (
                              <Text color="brand.muted">
                                No stopped containers.
                              </Text>
                            )}
                          </List.Root>
                        </HoverCard.Content>
                      </HoverCard.Positioner>
                    </HoverCard.Root>
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>ENV Vars.</DataList.ItemLabel>{" "}
                  <DataList.ItemValue flex="unset">
                    <HoverCard.Root>
                      <HoverCard.Trigger asChild>
                        <Link>
                          <PiTerminal />
                          <Text>
                            {stack.aggregated_configs.environment.length}
                          </Text>{" "}
                          Found
                        </Link>
                      </HoverCard.Trigger>
                      <HoverCard.Positioner>
                        <HoverCard.Content>
                          <HoverCard.Arrow>
                            <HoverCard.ArrowTip />
                          </HoverCard.Arrow>
                          <List.Root gap="2" variant="plain" align="center">
                            {stack?.aggregated_configs?.environment ? (
                              stack.aggregated_configs.environment.map(
                                (e, index: number) => (
                                  <List.Item key={index} w="100%">
                                    <List.Indicator asChild color="green.500">
                                      <Badge
                                        colorPalette="secondaryBrand"
                                        variant="outline"
                                      >
                                        <Text color="secondaryBrand.fg">
                                          {e.level}
                                        </Text>
                                      </Badge>
                                    </List.Indicator>
                                    <Text>{e.key}</Text>
                                    <Text color="secondaryBrand.fg">
                                      &ensp;[{e.value}]
                                    </Text>
                                  </List.Item>
                                )
                              )
                            ) : (
                              <List.Item color="brand.error">
                                No volumes found.
                              </List.Item>
                            )}
                          </List.Root>
                        </HoverCard.Content>
                      </HoverCard.Positioner>
                    </HoverCard.Root>
                  </DataList.ItemValue>
                </DataList.Item>
                <DataList.Item>
                  <DataList.ItemLabel>Labels</DataList.ItemLabel>{" "}
                  <DataList.ItemValue flex="unset">
                    <Drawer.Root size="xl">
                      <Drawer.Trigger asChild alignItems="center">
                        <Link>
                          <PiTagSimple />
                          <Text>
                            {stack.aggregated_configs?.labels.length}
                          </Text>{" "}
                          Found <PiArrowSquareIn />
                        </Link>
                      </Drawer.Trigger>
                      <Portal>
                        <Drawer.Backdrop />
                        <Drawer.Positioner>
                          <Drawer.Content>
                            <EditableDrawerTable
                              tabletitle={stack.name + " Labels"}
                              items={stack.aggregated_configs?.labels || []}
                            />

                            <Drawer.Footer bg="bg.panel" py="3">
                              <ButtonGroup size="sm">
                                <Button colorPalette="brand">Save</Button>
                                <Button colorPalette="redBrand" variant="ghost">
                                  Discard
                                </Button>
                              </ButtonGroup>
                            </Drawer.Footer>
                            <Drawer.CloseTrigger asChild>
                              <CloseButton size="sm" />
                            </Drawer.CloseTrigger>
                          </Drawer.Content>
                        </Drawer.Positioner>
                      </Portal>
                    </Drawer.Root>
                  </DataList.ItemValue>
                </DataList.Item>
              </Flex>
            </DataList.Root>
          </Card.Body>
          <Card.Footer p="0" />
        </Card.Root>
      </Container>
      <Container maxW={{ base: "2xl", md: "full" }} pt="4" bg="bg">
        <Stack gap="8">
          <Flex justify="space-between" align="center">
            <Heading size="2xl">Application Services</Heading>
            <SegmentGroup.Root defaultValue="table">
              <SegmentGroup.Indicator />
              <SegmentGroup.Items
                items={[
                  {
                    value: "table",
                    label: (
                      <HStack>
                        <Icon size="lg">
                          <PiTable />
                        </Icon>
                      </HStack>
                    ),
                  },
                  {
                    value: "cards",
                    label: (
                      <HStack>
                        <Icon size="lg">
                          <PiCards />
                        </Icon>
                      </HStack>
                    ),
                    disabled: true,
                  },
                  {
                    value: "tree",
                    label: (
                      <HStack>
                        <Icon size="lg">
                          <PiTreeStructure />
                        </Icon>
                      </HStack>
                    ),
                    disabled: true,
                  },
                ]}
              />
            </SegmentGroup.Root>
          </Flex>
          <ServicesPane services={services} />
        </Stack>
      </Container>
    </Stack>
  );
};

export default DockerStackDetailPage;
