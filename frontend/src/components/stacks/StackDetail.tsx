// frontend/src/components/stacks/StackDetail.tsx
// MIGRATED - Original StackDetail layout restored using UnifiedStack + ChakraUI v3

import React, { useMemo } from "react";
import {
  Accordion,
  Badge,
  Button,
  Card,
  Code,
  Container,
  HStack,
  Heading,
  Stack,
  StackSeparator,
  Status,
  Tabs,
  Text,
} from "@chakra-ui/react";
import {
  LuRotateCcw,
  LuCirclePower,
  LuWebhook,
  LuHardDriveDownload,
  LuBookCheck,
  LuFileSymlink,
  LuInfo,
} from "react-icons/lu";
import type { UnifiedStack } from "@/types/unified";
import type { ApiContainer } from "@/services/apiService";
import { stringify } from "yaml";
import { Tooltip } from "@/components/ui/tooltip";
import { InfoField } from "@/components/ui/small/InfoField";
import { EditableCodeViewDialog } from "@/components/ui/small/EditableCodeViewDialog";
import { StackValidationAccordion } from "./StackValidationAccordion";

// Keep container-block components as-is for now
// import { ContainerBlock } from "@/components/pageblocks/container-block/container-block";
// import { mapToStackContainers, apiService } from "@/services/apiService";
// import { validateStack } from "@/utils/stackValidation";

interface StackDetailProps {
  stack: UnifiedStack;
  onStart: (stackName: string) => Promise<boolean>;
  onStop: (stackName: string) => Promise<boolean>;
  onRestart: (stackName: string) => Promise<boolean>;
  onToggle: (stack: UnifiedStack | null) => void;
  isSelected?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export const StackDetail: React.FC<StackDetailProps> = ({
  stack,
  onStart,
  onStop,
  onRestart,
  loading = false,
  disabled = false,
}) => {
  // Prevent event bubbling from buttons
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  // Work directly with UnifiedStack containers - no conversion needed
  const stackContainers = useMemo(() => {
    if (!stack.containers?.containers) return [];

    // Return the UnifiedStack containers directly
    return stack.containers.containers;
  }, [stack.containers]);

  // Get services directly from UnifiedStack data
  const services = useMemo(() => {
    // Use the actual UnifiedStack services if available
    if (stack.services && Array.isArray(stack.services)) {
      return stack.services.map((service) => ({
        name: service.name || "unknown",
        image: service.image || "unknown",
        status:
          service.status ||
          (stack.stats?.containers?.running > 0 ? "running" : "stopped"),
        healthStatus: { overall: service.health || "unknown" },
        containers: stackContainers.filter(
          (container) =>
            container.name?.includes(service.name || "") ||
            container.labels?.["com.docker.compose.service"] === service.name
        ),
      }));
    }

    // Fallback: create a service from container data
    if (stackContainers.length > 0) {
      return [
        {
          name: stack.name,
          image: stackContainers[0]?.image || "unknown",
          status: stack.stats?.containers?.running > 0 ? "running" : "stopped",
          healthStatus: { overall: "unknown" },
          containers: stackContainers,
        },
      ];
    }

    // Last fallback: single mock service
    return [
      {
        name: stack.name,
        image: "unknown",
        status: stack.stats?.containers?.running > 0 ? "running" : "stopped",
        healthStatus: { overall: "unknown" },
        containers: [],
      },
    ];
  }, [stack, stackContainers]);

  // Get volumes and networks directly from UnifiedStack
  const getVolumes = (serviceName: string) => {
    if (stack.volumes && Array.isArray(stack.volumes)) {
      return stack.volumes.map((vol) => vol.name || vol).join(", ");
    }
    return "No volumes configured";
  };

  const getNetworks = (serviceName: string) => {
    if (stack.networks && Array.isArray(stack.networks)) {
      return stack.networks.map((net) => net.name || net).join(", ");
    }
    return "Default network";
  };

  // Dummy save function for now - will be wired up later
  const handleSaveCompose = async (editedYaml: string) => {
    console.log("Saving compose file:", editedYaml);
    // TODO: Implement actual save functionality
    // This could call an API endpoint to update the compose file
  };

  const yaml_file_text: string = stringify(stack.compose_content);

  return (
    <Container w="full" h="100%" fluid overflow="clip" pb="6" px="6">
      <HStack pt="6" h="full" alignItems="top" gap={{ sm: "4", md: "6" }}>
        {/* Left Panel - Stack Overview */}
        <Container
          maxW="1/3"
          fluid
          bg="brand.surfaceContainerLow"
          py={{ sm: "4", md: "6" }}
        >
          <Stack gap={{ base: "4", md: "5" }} colorPalette="brand">
            <Stack gap={{ base: "2", md: "3" }}>
              <Heading
                as="h3"
                textStyle={{ base: "2xl", md: "3xl" }}
                color="brand.onSurface"
              >
                Stack Overview
              </Heading>

              <Card.Root
                variant="subtle"
                colorPalette="brand"
                borderRadius="0"
                w="full"
                bg="brand.surfaceContainerHigh"
                h="full"
              >
                <Card.Header bg="brand.secondaryContainer" py="4">
                  <HStack gap="2">
                    <Stack flexBasis="50%" gap="0.5">
                      <Card.Title>Stack Details</Card.Title>
                      <Card.Description color="brand.onPrimaryContainer">
                        Key information about your stack.
                      </Card.Description>
                    </Stack>
                    <Stack flexBasis="10%" gap="0.5">
                      <Badge
                        colorPalette="gray"
                        variant="solid"
                        alignContent="center"
                      >
                        {stack.status}
                      </Badge>
                    </Stack>
                    <Stack flexBasis="40%">
                      <HStack
                        bg="brand.background/35"
                        p="1"
                        justifyContent="space-evenly"
                      >
                        {/* TODO: These should DEFINITELY be moved to a STACK/SERVICE/CONTAINER Control component */}
                        {stack.stats?.containers?.running > 0 ? (
                          <>
                            <Stack gap="0.5" flexBasis="1/3">
                              <Button
                                variant="ghost"
                                color="brand.onSecondaryContainer"
                                bg={{ _hover: "brand.secondaryContainer/75" }}
                                size="lg"
                                onClick={(e) =>
                                  handleButtonClick(e, () =>
                                    onRestart(stack.name)
                                  )
                                }
                                disabled={disabled || loading}
                              >
                                <LuRotateCcw /> Restart
                              </Button>
                            </Stack>
                            <Stack gap="0.5" flexBasis="1/3">
                              <Button
                                size="lg"
                                color="brand.onErrorContainer"
                                bg={{ _hover: "brand.errorContainer/75" }}
                                variant="ghost"
                                onClick={(e) =>
                                  handleButtonClick(e, () => onStop(stack.name))
                                }
                                disabled={disabled || loading}
                              >
                                <LuCirclePower />
                                Stop
                              </Button>
                            </Stack>
                          </>
                        ) : (
                          <>
                            <Stack gap="0.5" flexBasis="1/3">
                              <Button
                                variant="ghost"
                                color="brand.onSecondaryContainer"
                                bg={{ _hover: "brand.secondaryContainer/75" }}
                                size="sm"
                                disabled
                              >
                                <LuRotateCcw /> Restart
                              </Button>
                            </Stack>
                            <Stack gap="0.5" flexBasis="1/3">
                              <Button
                                size="lg"
                                color="brand.onContainer"
                                bg={{ _hover: "brand.container/75" }}
                                variant="ghost"
                                onClick={(e) =>
                                  handleButtonClick(e, () =>
                                    onStart(stack.name)
                                  )
                                }
                                disabled={disabled || loading}
                              >
                                <LuCirclePower />
                                Start
                              </Button>
                            </Stack>
                          </>
                        )}
                        <Stack gap="0.5" flexBasis="1/3">
                          <Button
                            size="lg"
                            color="brand.onTertiaryContainer"
                            bg={{ _hover: "brand.tertiaryContainer/75" }}
                            variant="ghost"
                            disabled={disabled}
                          >
                            <LuHardDriveDownload />
                            Update
                          </Button>
                        </Stack>
                      </HStack>
                    </Stack>
                  </HStack>
                </Card.Header>

                <Card.Body>
                  <HStack gap="4">
                    <Stack flexBasis="full" gap="3">
                      <InfoField label="Name" value={stack.name} />
                      <InfoField label="Path" value={stack.path} />
                      <InfoField
                        label="Compose File"
                        value={stack.compose_file || "docker-compose.yml"}
                      />
                    </Stack>
                    <Stack flexBasis="full" gap="3">
                      <HStack>
                        <InfoField
                          label="Stack Health"
                          value={stack.health.overall_health}
                        />
                        <InfoField
                          label="Last Modified"
                          value={stack.last_modified.slice(0, 16)}
                        />
                      </HStack>
                      <HStack>
                        <InfoField label="Stack Status" value={stack.status} />
                        <Stack gap="0.5" flexBasis="full">
                          <HStack p="0" m="0">
                            <Text
                              textStyle="sm"
                              fontWeight="medium"
                              color="brand.onSurfaceVariant"
                            >
                              Containers:
                            </Text>
                            <Tooltip
                              content="Total: Running / Paused / Stopped"
                              openDelay={150}
                              closeDelay={100}
                            >
                              <Button size="xs" variant="plain" p="0" h="30%">
                                <LuInfo />
                              </Button>
                            </Tooltip>
                          </HStack>
                          <Code
                            textStyle="md"
                            bg="brand.surfaceContainerLowest"
                            py="1"
                            pl="2"
                          >
                            <HStack>
                              {stack.containers.total}:&emsp;
                              <Text color="green.600">
                                {stack.containers.running}
                              </Text>
                              /
                              <Text color="yellow.600">
                                {stack.containers.paused}
                              </Text>
                              /
                              <Text color="pink.600">
                                {stack.containers.stopped}
                              </Text>
                            </HStack>
                          </Code>
                        </Stack>
                      </HStack>

                      <HStack>
                        <Stack gap="0.5" flexBasis="full">
                          <HStack p="0" m="0">
                            <Text
                              textStyle="sm"
                              fontWeight="medium"
                              color="brand.onSurfaceVariant"
                            >
                              Networks:
                            </Text>
                          </HStack>
                          <Code
                            textStyle="md"
                            bg="brand.surfaceContainerLowest"
                            py="1"
                            pl="2"
                          >
                            <HStack>
                              <Text color="green.600">
                                {stack.stats.networks.total + " total"}
                              </Text>
                              /
                              <Text color="cyan.600">
                                {stack.stats.networks.external + " external"}
                              </Text>
                            </HStack>
                          </Code>
                        </Stack>
                        <Stack gap="0.5" flexBasis="full">
                          <Text
                            textStyle="sm"
                            fontWeight="medium"
                            color="brand.onSurfaceVariant"
                          >
                            Volumes:
                          </Text>
                          <Code
                            textStyle="md"
                            bg="brand.surfaceContainerLowest"
                            py="1"
                            pl="2"
                          >
                            <HStack>
                              <Text color="teal.600">
                                {stack.stats.volumes.total + " total"}
                              </Text>
                              /
                              <Text color="purple.400">
                                {stack.stats.volumes.external + " external"}
                              </Text>
                            </HStack>
                          </Code>
                        </Stack>
                      </HStack>
                    </Stack>
                  </HStack>
                </Card.Body>
                <Card.Footer py="2">
                  {/* Using the new EditableCodeViewDialog component */}
                  <EditableCodeViewDialog
                    code={yaml_file_text}
                    language="yaml"
                    title={stack.compose_file}
                    triggerText="View Compose"
                    triggerIcon={<LuFileSymlink />}
                    onSave={handleSaveCompose}
                    editable={true}
                    editButtonText="Edit YAML"
                  />
                </Card.Footer>
              </Card.Root>
            </Stack>

            {/* Stack Validation Accordion */}
            <StackValidationAccordion stack={stack} />
          </Stack>
        </Container>

        {/* Right Panel - Services and Containers */}
        <Container
          fluid
          bg="brand.surfaceContainerLow"
          py={{ sm: "4", md: "6" }}
        >
          <Stack gap={{ base: "4", md: "5" }} colorPalette="brand">
            <Stack gap={{ base: "2", md: "3" }}>
              <Heading
                as="h3"
                textStyle={{ base: "2xl", md: "3xl" }}
                color="brand.onSurface"
              >
                Service and Container Overview
              </Heading>

              <Stack>
                <Tabs.Root
                  defaultValue={services[0]?.name || "main"}
                  orientation="vertical"
                  colorPalette="brand"
                  size="lg"
                  h="82dvh"
                  bg="brand.surfaceContainerLowest"
                >
                  <Tabs.List>
                    {services.map((service) => (
                      <Tabs.Trigger key={service.name} value={service.name}>
                        <LuWebhook />
                        {service.name}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>

                  {services.map((service) => (
                    <Tabs.Content
                      key={service.name}
                      value={service.name}
                      minH="5/6"
                      w="full"
                      p="0"
                    >
                      <Stack p="2" gap="2" w="full">
                        <HStack bg="brand.tertiaryContainer" p="4">
                          <Heading as="h4" color="brand.onTertiaryContainer">
                            Service Overview
                          </Heading>
                        </HStack>

                        <HStack
                          gap="6"
                          bg="brand.surfaceContainerHigh"
                          p="4"
                          w="full"
                        >
                          <Stack gap="0.5" w="full">
                            <Text
                              textStyle="sm"
                              fontWeight="medium"
                              color="brand.onSurfaceVariant"
                            >
                              Service Name:
                            </Text>
                            <Code
                              textStyle="md"
                              bg="brand.surfaceContainerLowest"
                              py="1"
                              pl="2"
                            >
                              {service.name}
                            </Code>
                          </Stack>

                          <Stack gap="0.5" w="full">
                            <Text
                              textStyle="sm"
                              fontWeight="medium"
                              color="brand.onSurfaceVariant"
                            >
                              Image:
                            </Text>
                            <Code
                              textStyle="md"
                              bg="brand.surfaceContainerLowest"
                              py="1"
                              pl="2"
                            >
                              {service.image}
                            </Code>
                          </Stack>

                          <Stack gap="0.5" w="full">
                            <Text
                              textStyle="sm"
                              fontWeight="medium"
                              color="brand.onSurfaceVariant"
                            >
                              Status:
                            </Text>
                            <Code
                              textStyle="md"
                              bg="brand.surfaceContainerLowest"
                              py="1"
                              pl="2"
                            >
                              {service.status}
                            </Code>
                          </Stack>

                          <Stack gap="0.5" w="full">
                            <Text
                              textStyle="sm"
                              fontWeight="medium"
                              color="brand.onSurfaceVariant"
                            >
                              Health:
                            </Text>
                            <Code
                              textStyle="md"
                              bg="brand.surfaceContainerLowest"
                              py="1"
                              pl="2"
                            >
                              {service.healthStatus?.overall}
                            </Code>
                          </Stack>
                        </HStack>

                        <HStack gap="2" p="0" w="full" alignItems="top">
                          <Stack
                            gap="6"
                            w="full"
                            bg="brand.surfaceContainerLow"
                            p="0"
                          >
                            <Stack gap="0.5" w="full">
                              <Text
                                textStyle="sm"
                                fontWeight="medium"
                                color="brand.onSurfaceVariant"
                              >
                                Volumes:
                              </Text>
                              <Code
                                textStyle="md"
                                bg="brand.surfaceContainerLowest"
                                py="1"
                                pl="2"
                              >
                                {getVolumes(service.name)}
                              </Code>
                            </Stack>
                            <Stack gap="0.5" w="full">
                              <Text
                                textStyle="sm"
                                fontWeight="medium"
                                color="brand.onSurfaceVariant"
                              >
                                Networks:
                              </Text>
                              <Code
                                textStyle="md"
                                bg="brand.surfaceContainerLowest"
                                py="1"
                                pl="2"
                              >
                                {getNetworks(service.name)}
                              </Code>
                            </Stack>
                          </Stack>

                          <Stack
                            gap="6"
                            w="full"
                            bg="brand.surfaceContainerLow"
                            p="0"
                            h="68.2dvh"
                          >
                            <Container p="0" m="0" w="full">
                              {stackContainers.length > 0 ? (
                                <Stack gap="4" p="4">
                                  <Text
                                    fontSize="lg"
                                    fontWeight="semibold"
                                    color="brand.onSurface"
                                  >
                                    Containers ({stackContainers.length})
                                  </Text>
                                  {stackContainers.map((container, index) => (
                                    <Card.Root
                                      key={container.id || index}
                                      bg="brand.surfaceContainer"
                                    >
                                      <Card.Body>
                                        <Stack gap="2">
                                          <HStack justify="space-between">
                                            <Text
                                              fontWeight="medium"
                                              color="brand.onSurface"
                                            >
                                              {container.name}
                                            </Text>
                                            <Text
                                              fontSize="sm"
                                              color="brand.onSurfaceVariant"
                                            >
                                              {container.status}
                                            </Text>
                                          </HStack>
                                          <Text
                                            fontSize="sm"
                                            color="brand.onSurfaceVariant"
                                          >
                                            Image: {container.image}
                                          </Text>
                                          {container.ports &&
                                            Object.keys(container.ports)
                                              .length > 0 && (
                                              <Text
                                                fontSize="sm"
                                                color="brand.onSurfaceVariant"
                                              >
                                                Ports:{" "}
                                                {Object.keys(
                                                  container.ports
                                                ).join(", ")}
                                              </Text>
                                            )}
                                        </Stack>
                                      </Card.Body>
                                    </Card.Root>
                                  ))}
                                </Stack>
                              ) : (
                                <Text
                                  textAlign="center"
                                  py="8"
                                  color="brand.onSurfaceVariant"
                                >
                                  No containers found for this service
                                </Text>
                              )}
                            </Container>
                          </Stack>
                        </HStack>
                      </Stack>
                    </Tabs.Content>
                  ))}
                </Tabs.Root>
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </HStack>
    </Container>
  );
};

export default StackDetail;
