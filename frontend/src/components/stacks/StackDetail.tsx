// frontend/src/components/stacks/StackDetail.tsx
// MIGRATED - Original StackDetail layout restored using UnifiedStack + ChakraUI v3

import React, { useMemo } from "react";
import {
  Badge,
  Button,
  Card,
  Code,
  Container,
  HStack,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuFileSymlink, LuInfo } from "react-icons/lu";
import type { UnifiedStack } from "@/types/unified";
import { stringify } from "yaml";
import { Tooltip } from "@/components/ui/tooltip";
import { InfoField } from "@/components/ui/small/InfoField";
import { EditableCodeViewDialog } from "@/components/ui/small/EditableCodeViewDialog";
import { StackControlButtons } from "@/components/ui/small/StackControlButtons";
import { ServicesPane } from "./ServicesPane";
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
  const services = Object.values(stack.services || {});

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
          bg="brand.surfaceContainerLowest"
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
                      <Card.Description color="brand.onSecondaryContainer">
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
                      <StackControlButtons
                        status={stack.status}
                        onStart={() => onStart(stack.name)}
                        onStop={() => onStop(stack.name)}
                        onRestart={() => onRestart(stack.name)}
                        disabled={disabled}
                        loading={loading}
                        orientation="horizontal"
                      />
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
        <ServicesPane services={services} />
      </HStack>
    </Container>
  );
};

export default StackDetail;
