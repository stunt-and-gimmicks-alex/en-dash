// frontend/src/components/stacks/StackDetail.tsx
// MIGRATED - Original StackDetail layout restored using UnifiedStack + ChakraUI v3

import React, { useMemo } from "react";
import {
  Button,
  Card,
  Container,
  DataList,
  Field,
  Flex,
  HStack,
  Heading,
  Icon,
  Input,
  SimpleGrid,
  Stack,
  Status,
  Text,
  Textarea,
} from "@chakra-ui/react";
import type { UnifiedStack } from "@/types/unified";
import { stringify } from "yaml";
import { EditableCodeViewDialog } from "@/components/ui/small/EditableCodeViewDialog";
import { StackControlButtons } from "@/components/ui/small/StackControlButtons";
import { ServicesPane } from "../components/services/ServicesPane";
import { StackValidationAccordion } from "../components/applications/StackValidationAccordion";
import {
  PiAppWindow,
  PiArrowsClockwise,
  PiFileMagnifyingGlass,
  PiPencilSimpleLine,
} from "react-icons/pi";
import { UsageCard } from "@/components/ui/small/UsageCard";

// Keep container-block components as-is for now
// import { ContainerBlock } from "@/components/pageblocks/container-block/container-block";
// import { mapToStackContainers, apiService } from "@/services/apiService";
// import { validateStack } from "@/utils/stackValidation";

interface DockerStackDetailPageProps {
  stack: UnifiedStack;
  onStart: (stackName: string) => Promise<boolean>;
  onStop: (stackName: string) => Promise<boolean>;
  onRestart: (stackName: string) => Promise<boolean>;
  onToggle: (stack: UnifiedStack | null) => void;
  isSelected?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export const DockerStackDetailPage: React.FC<DockerStackDetailPageProps> = ({
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
    <Container
      w="full"
      h="100%"
      fluid
      overflow="clip"
      px="0"
      colorPalette="brand"
      bg="bg"
    >
      <HStack h="full" alignItems="top" gap={{ sm: "4", md: "6" }}>
        {/* Left Panel - Stack Overview */}
        <Container maxW={{ base: "2xl", md: "1/3" }} minW="1/3" py="4">
          <Stack gap="8">
            <Heading>Application Details</Heading>

            <Card.Root>
              <Card.Header
                gap="4"
                flexDirection={{ base: "column", md: "row" }}
                justifyContent="space-between"
              >
                <Stack gap="0">
                  <Card.Description>Application</Card.Description>
                  <Status.Root
                    size="lg"
                    colorPalette={
                      stack.status === "running"
                        ? "brand.solid"
                        : stack.status === "partial"
                        ? "brandYellow.solid"
                        : "brandRed.solid"
                    }
                  >
                    <Status.Indicator />
                    <Icon size="lg">
                      <PiAppWindow />
                    </Icon>
                    <Card.Title textStyle="xl">{stack.name}</Card.Title>
                  </Status.Root>
                </Stack>
                <StackControlButtons
                  status={stack.status}
                  onStart={() => onStart(stack.name)}
                  onStop={() => onStop(stack.name)}
                  onRestart={() => onRestart(stack.name)}
                  disabled={disabled}
                  loading={loading}
                  orientation="horizontal"
                />
              </Card.Header>
              <Card.Body gap="4">
                <DataList.Root orientation="horizontal">
                  <DataList.Item justifyContent="space-between">
                    <Field.Root
                      orientation={{ base: "vertical", md: "horizontal" }}
                    >
                      <Field.Label minW="1/3">
                        <DataList.ItemLabel>
                          Application Description
                        </DataList.ItemLabel>
                      </Field.Label>
                      <DataList.ItemValue flex="unset" w="full" maxW="2/3">
                        <Textarea
                          size="sm"
                          variant="subtle"
                          autoresize
                          defaultValue={
                            stack.description ||
                            "This is where the application description goes"
                          }
                          disabled
                        ></Textarea>
                      </DataList.ItemValue>
                    </Field.Root>
                  </DataList.Item>
                  <DataList.Item justifyContent="space-between">
                    <Field.Root
                      orientation={{ base: "vertical", md: "horizontal" }}
                    >
                      <Field.Label minW="1/3">
                        <DataList.ItemLabel>
                          Application Path
                        </DataList.ItemLabel>
                      </Field.Label>
                      <DataList.ItemValue flex="unset" w="full" maxW="2/3">
                        <Input
                          size="sm"
                          variant="subtle"
                          defaultValue={
                            stack.path || "No application path found... "
                          }
                          disabled
                        ></Input>
                      </DataList.ItemValue>
                    </Field.Root>
                  </DataList.Item>
                  <DataList.Item justifyContent="space-between">
                    <Field.Root
                      orientation={{ base: "vertical", md: "horizontal" }}
                    >
                      <Field.Label minW="1/3">
                        <DataList.ItemLabel>
                          Application Compose
                        </DataList.ItemLabel>
                      </Field.Label>
                      <DataList.ItemValue flex="unset" w="full">
                        <Input
                          size="sm"
                          variant="subtle"
                          defaultValue={
                            stack.compose_file ||
                            "No application compose file found... "
                          }
                          disabled
                        ></Input>
                        <EditableCodeViewDialog
                          code={yaml_file_text}
                          language="yaml"
                          title={stack.compose_file}
                          triggerText="View Compose"
                          triggerIcon={<PiFileMagnifyingGlass />}
                          onSave={handleSaveCompose}
                          editable={true}
                          editButtonText="Edit YAML"
                        />
                      </DataList.ItemValue>
                    </Field.Root>
                  </DataList.Item>
                </DataList.Root>
                <DataList.Root
                  orientation="vertical"
                  justifyContent="space-between"
                  flex="content"
                  variant="bold"
                >
                  <Flex direction="row" justifyContent="space-between">
                    <DataList.Item>
                      <DataList.ItemLabel>Status</DataList.ItemLabel>
                      <DataList.ItemValue flex="unset">
                        {stack.status}
                      </DataList.ItemValue>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.ItemLabel>Last Modified</DataList.ItemLabel>
                      <DataList.ItemValue flex="unset">
                        {stack.last_modified.slice(0, 16)}
                      </DataList.ItemValue>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.ItemLabel>
                        Application Health
                      </DataList.ItemLabel>{" "}
                      <DataList.ItemValue flex="unset">
                        {stack.health.overall_health}
                      </DataList.ItemValue>
                    </DataList.Item>
                  </Flex>
                </DataList.Root>
              </Card.Body>
              <Card.Footer>
                <Button w="full" size="xs" colorPalette="yellowBrand">
                  <PiPencilSimpleLine /> Edit Application Info
                </Button>
              </Card.Footer>
            </Card.Root>

            <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
              {" "}
              {/*TODO - Add Global App-level CPU/Memory/Network/Storage Usage stat to UnifiedStack */}
              <UsageCard title="CPU Use" description="" max={100} value={12} />
              <UsageCard
                title="Memory Use"
                description=""
                max={100}
                value={24}
              />
            </SimpleGrid>

            <Card.Root>
              <Card.Header
                gap="4"
                flexDirection={{ base: "column", md: "row" }}
                justifyContent="space-between"
              >
                <Stack gap="0">
                  <Card.Description>Sync Status</Card.Description>
                  <Card.Title textStyle="xl">
                    {stack.stats.syncStatus || "100%"} Synced{" "}
                    {/* TODO = Need to add a global sync state property to UnifiedStacks */}
                  </Card.Title>
                </Stack>
                <Button size="sm" variant="ghost" colorPalette="grayBrand">
                  <PiArrowsClockwise /> Sync App
                </Button>
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
                      <DataList.ItemLabel>Networks</DataList.ItemLabel>{" "}
                      {/* TODO - Need to add a Service- and Container-defined total Networks stat to UnifiedStack */}
                      <DataList.ItemValue flex="unset">
                        {stack.stats.networks.total}
                      </DataList.ItemValue>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.ItemLabel>Volumes</DataList.ItemLabel>{" "}
                      {/* TODO - Need to add a Service- and Container-defined total Volumes stat to UnifiedStack */}
                      <DataList.ItemValue flex="unset">
                        {stack.stats.volumes.total}
                      </DataList.ItemValue>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.ItemLabel>Ports</DataList.ItemLabel>{" "}
                      {/* TODO - Need to add a Service- and Container-defined Port list to UnifiedStack */}
                      <DataList.ItemValue flex="unset">
                        8080:8080
                      </DataList.ItemValue>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.ItemLabel>Container Status</DataList.ItemLabel>
                      <DataList.ItemValue flex="unset">
                        <Text color="brand.solid">
                          {stack.stats.containers.running} Running&ensp;/&ensp;
                        </Text>
                        <Text color="redBrand.solid">
                          {stack.stats.containers.stopped} Stopped&ensp;/&ensp;
                        </Text>
                        <Text color="secondaryBrand.solid">
                          {stack.stats.containers.total} Total
                        </Text>
                      </DataList.ItemValue>
                    </DataList.Item>
                  </Flex>
                </DataList.Root>
              </Card.Body>
            </Card.Root>
            <StackValidationAccordion stack={stack} />
          </Stack>
        </Container>
        <Container maxW={{ base: "3xl", md: "full" }} pt="4" bg="bg.subtle">
          <Stack gap="8">
            <Heading>Application Services</Heading>
            <ServicesPane services={services} />
          </Stack>
        </Container>
      </HStack>
    </Container>
  );
};

export default DockerStackDetailPage;
