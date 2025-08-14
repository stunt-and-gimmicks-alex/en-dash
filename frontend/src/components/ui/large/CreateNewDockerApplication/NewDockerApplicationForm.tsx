// NewDockerApplicationForm.tsx - Enhanced wizard with real-time YAML preview

import { useState } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";
import {
  Button,
  Card,
  Center,
  Container,
  Drawer,
  Heading,
  HStack,
  Icon,
  Portal,
  Stack,
  Text,
  Grid,
  Badge,
  Separator,
} from "@chakra-ui/react";
import { PiGhost, PiPlus, PiCheckCircle, PiWarning } from "react-icons/pi";
import { NewDockDrawerStart } from "./NewDockerAppDrawerBasic";
import { NewDockDrawerServices } from "./NewDockerApplicationDrawerServices";
import { NewDockDrawerNetworks } from "./NewDockerApplicationDrawerNetworks";
import { AppConfigCard } from "./NewDockerAppItemCard";
import { YamlPreview } from "./YamlPreview";

export const NewDockerAppWizard = () => {
  const { newStack, setNewStack, validateStack, addService, removeService } =
    useNewStackStore();
  const [open, setOpen] = useState(false);
  const [drawerStep, setDrawer] = useState("1");
  const [editingServiceId, setEditingServiceId] = useState<
    string | undefined
  >();

  // Helper functions to check completion status
  const hasBasicInfo = !!newStack.name;
  const hasServices =
    newStack.services && Object.keys(newStack.services).length > 0;
  const hasNetworks =
    newStack.networks && Object.keys(newStack.networks).length > 0;
  const hasVolumes =
    newStack.volumes && Object.keys(newStack.volumes).length > 0;

  // Validation
  const validation = validateStack();
  const isReadyToDeploy =
    validation.errors.length === 0 && hasBasicInfo && hasServices;

  const handleOpenDrawer = (step: string, serviceId?: string) => {
    setDrawer(step);
    setEditingServiceId(serviceId);
    setOpen(true);
  };

  const handleCloseDrawer = () => {
    setOpen(false);
    setEditingServiceId(undefined);
  };

  const handleAddService = () => {
    const serviceId = `service-${Object.keys(newStack.services).length + 1}`;
    addService(serviceId);
    handleOpenDrawer("2", serviceId);
  };

  const handleEditService = (serviceId: string) => {
    handleOpenDrawer("2", serviceId);
  };

  const handleDeleteService = (serviceId: string) => {
    removeService(serviceId);
  };

  const renderDrawerContent = () => {
    switch (drawerStep) {
      case "1":
        return <NewDockDrawerStart onClose={handleCloseDrawer} />;
      case "2":
        return (
          <NewDockDrawerServices
            serviceId={editingServiceId}
            onClose={handleCloseDrawer}
          />
        );
      case "3":
        return <NewDockDrawerNetworks onClose={handleCloseDrawer} />;
      case "4":
        return (
          <Center p="8">
            <Stack gap="4" textAlign="center">
              <Icon size="xl" color="brandGray.600">
                <PiGhost />
              </Icon>
              <Text>Volumes configuration coming soon!</Text>
            </Stack>
          </Center>
        );
      default:
        return (
          <Center p="8">
            <Stack gap="4" textAlign="center">
              <Icon size="xl" color="brandGray.600">
                <PiGhost />
              </Icon>
              <Text>Coming soon!</Text>
            </Stack>
          </Center>
        );
    }
  };

  return (
    <Container maxW="full" py="6" colorPalette="secondaryBrand">
      <Grid templateColumns="1fr 400px" gap="8" minH="80vh">
        {/* Main Wizard Content */}
        <Stack gap="8">
          <Stack gap="6">
            <Heading as="h2" size="lg">
              Create New Docker Application
            </Heading>

            {/* Progress Overview */}
            <HStack
              gap="4"
              p="4"
              bg="bg.subtle"
              borderRadius="md"
              borderWidth="1px"
            >
              <HStack gap="2">
                <Icon color={hasBasicInfo ? "green.500" : "gray.400"}>
                  {hasBasicInfo ? <PiCheckCircle /> : <PiGhost />}
                </Icon>
                <Text
                  textStyle="sm"
                  color={hasBasicInfo ? "green.600" : "fg.muted"}
                >
                  Basic Info
                </Text>
              </HStack>

              <Separator orientation="vertical" height="4" />

              <HStack gap="2">
                <Icon color={hasServices ? "green.500" : "gray.400"}>
                  {hasServices ? <PiCheckCircle /> : <PiGhost />}
                </Icon>
                <Text
                  textStyle="sm"
                  color={hasServices ? "green.600" : "fg.muted"}
                >
                  Services ({Object.keys(newStack.services).length})
                </Text>
              </HStack>

              <Separator orientation="vertical" height="4" />

              <HStack gap="2">
                <Icon color={hasNetworks ? "green.500" : "gray.400"}>
                  {hasNetworks ? <PiCheckCircle /> : <PiGhost />}
                </Icon>
                <Text
                  textStyle="sm"
                  color={hasNetworks ? "green.600" : "fg.muted"}
                >
                  Networks ({Object.keys(newStack.networks).length})
                </Text>
              </HStack>

              <Separator orientation="vertical" height="4" />

              <HStack gap="2">
                <Icon color={hasVolumes ? "green.500" : "gray.400"}>
                  {hasVolumes ? <PiCheckCircle /> : <PiGhost />}
                </Icon>
                <Text
                  textStyle="sm"
                  color={hasVolumes ? "green.600" : "fg.muted"}
                >
                  Volumes ({Object.keys(newStack.volumes).length})
                </Text>
              </HStack>

              {validation.errors.length > 0 && (
                <>
                  <Separator orientation="vertical" height="4" />
                  <HStack gap="2">
                    <Icon color="red.500">
                      <PiWarning />
                    </Icon>
                    <Text textStyle="sm" color="red.600">
                      {validation.errors.length} error
                      {validation.errors.length !== 1 ? "s" : ""}
                    </Text>
                  </HStack>
                </>
              )}
            </HStack>
          </Stack>

          {/* Step 1: Basic Configuration */}
          <Card.Root>
            <Card.Header>
              <HStack justify="space-between">
                <Stack gap="1">
                  <HStack gap="2">
                    <Badge colorPalette="blue" size="sm">
                      Step 1
                    </Badge>
                    <Heading as="h3" size="md">
                      Basic Configuration
                    </Heading>
                    {hasBasicInfo && (
                      <Icon color="green.500" size="sm">
                        <PiCheckCircle />
                      </Icon>
                    )}
                  </HStack>
                  <Text color="fg.muted" textStyle="sm">
                    Name your application and provide basic details
                  </Text>
                </Stack>
              </HStack>
            </Card.Header>

            <Card.Body>
              {hasBasicInfo ? (
                <AppConfigCard
                  labels={`${newStack.name}${
                    newStack.description ? ` - ${newStack.description}` : ""
                  }`}
                  onEdit={() => handleOpenDrawer("1")}
                  onDelete={() => {
                    setNewStack((stack) => {
                      stack.name = "";
                      stack.description = "";
                    });
                  }}
                />
              ) : (
                <Center
                  userSelect="none"
                  borderWidth="2px"
                  borderStyle="dashed"
                  rounded="lg"
                  padding="8"
                  minH="20"
                >
                  <Stack gap="2" textAlign="center">
                    <Icon size="lg" color="gray.400">
                      <PiGhost />
                    </Icon>
                    <Text color="fg.muted">No basic configuration yet</Text>
                  </Stack>
                </Center>
              )}
            </Card.Body>

            <Card.Footer>
              <Button
                w="full"
                variant="outline"
                onClick={() => handleOpenDrawer("1")}
              >
                {hasBasicInfo ? "Edit Basic Info" : "Start Here"}
              </Button>
            </Card.Footer>
          </Card.Root>

          {/* Step 2: Services */}
          <Card.Root>
            <Card.Header>
              <HStack justify="space-between">
                <Stack gap="1">
                  <HStack gap="2">
                    <Badge colorPalette="green" size="sm">
                      Step 2
                    </Badge>
                    <Heading as="h3" size="md">
                      Docker Services
                    </Heading>
                    {hasServices && (
                      <Badge colorPalette="blue" size="sm">
                        {Object.keys(newStack.services).length}
                      </Badge>
                    )}
                  </HStack>
                  <Text color="fg.muted" textStyle="sm">
                    Configure the containers for your application
                  </Text>
                </Stack>

                <Button
                  size="sm"
                  colorPalette="green"
                  onClick={handleAddService}
                  disabled={!hasBasicInfo}
                >
                  <PiPlus />
                  Add Service
                </Button>
              </HStack>
            </Card.Header>

            <Card.Body>
              {hasServices ? (
                <Stack gap="3">
                  {Object.entries(newStack.services).map(
                    ([serviceId, service]) => (
                      <AppConfigCard
                        key={serviceId}
                        labels={[
                          `${serviceId}: ${service.image}`,
                          ...(service.ports?.length
                            ? [
                                `${service.ports.length} port${
                                  service.ports.length !== 1 ? "s" : ""
                                }`,
                              ]
                            : []),
                          ...(service.environment &&
                          Object.keys(service.environment).length
                            ? [
                                `${
                                  Object.keys(service.environment).length
                                } env var${
                                  Object.keys(service.environment).length !== 1
                                    ? "s"
                                    : ""
                                }`,
                              ]
                            : []),
                          ...(service.volumes?.length
                            ? [
                                `${service.volumes.length} volume${
                                  service.volumes.length !== 1 ? "s" : ""
                                }`,
                              ]
                            : []),
                        ]}
                        onEdit={() => handleEditService(serviceId)}
                        onDelete={() => handleDeleteService(serviceId)}
                      />
                    )
                  )}
                </Stack>
              ) : (
                <Center
                  userSelect="none"
                  borderWidth="2px"
                  borderStyle="dashed"
                  rounded="lg"
                  padding="8"
                  minH="20"
                >
                  <Stack gap="2" textAlign="center">
                    <Icon size="lg" color="gray.400">
                      <PiGhost />
                    </Icon>
                    <Text color="fg.muted">No services configured yet</Text>
                    <Text color="fg.muted" textStyle="xs">
                      {!hasBasicInfo
                        ? "Complete basic configuration first"
                        : "Click 'Add Service' to get started"}
                    </Text>
                  </Stack>
                </Center>
              )}
            </Card.Body>
          </Card.Root>

          {/* Step 3: Networks */}
          <Card.Root>
            <Card.Header>
              <HStack justify="space-between">
                <Stack gap="1">
                  <HStack gap="2">
                    <Badge colorPalette="purple" size="sm">
                      Step 3
                    </Badge>
                    <Heading as="h3" size="md">
                      Network Configuration
                    </Heading>
                    {hasNetworks && (
                      <Badge colorPalette="purple" size="sm">
                        {Object.keys(newStack.networks).length}
                      </Badge>
                    )}
                  </HStack>
                  <Text color="fg.muted" textStyle="sm">
                    Set up networking for container communication (Optional)
                  </Text>
                </Stack>

                <Button
                  size="sm"
                  colorPalette="purple"
                  variant="outline"
                  onClick={() => handleOpenDrawer("3")}
                  disabled={!hasServices}
                >
                  <PiPlus />
                  Configure Networks
                </Button>
              </HStack>
            </Card.Header>

            <Card.Body>
              {hasNetworks ? (
                <Stack gap="3">
                  {Object.entries(newStack.networks).map(
                    ([networkId, network]) => (
                      <AppConfigCard
                        key={networkId}
                        labels={`${networkId}: ${network.driver || "bridge"}`}
                        onEdit={() => handleOpenDrawer("3")}
                        onDelete={() => {
                          setNewStack((stack) => {
                            delete stack.networks[networkId];
                          });
                        }}
                      />
                    )
                  )}
                </Stack>
              ) : (
                <Center
                  userSelect="none"
                  borderWidth="2px"
                  borderStyle="dashed"
                  rounded="lg"
                  padding="6"
                  minH="16"
                >
                  <Stack gap="2" textAlign="center">
                    <Icon size="md" color="gray.400">
                      <PiGhost />
                    </Icon>
                    <Text color="fg.muted" textStyle="sm">
                      Using default network
                    </Text>
                    <Text color="fg.muted" textStyle="xs">
                      {!hasServices
                        ? "Add services first"
                        : "Custom networks are optional"}
                    </Text>
                  </Stack>
                </Center>
              )}
            </Card.Body>
          </Card.Root>

          {/* Step 4: Volumes */}
          <Card.Root opacity={!hasServices ? 0.6 : 1}>
            <Card.Header>
              <HStack justify="space-between">
                <Stack gap="1">
                  <HStack gap="2">
                    <Badge colorPalette="orange" size="sm">
                      Step 4
                    </Badge>
                    <Heading as="h3" size="md">
                      Volume Configuration
                    </Heading>
                    {hasVolumes && (
                      <Badge colorPalette="orange" size="sm">
                        {Object.keys(newStack.volumes).length}
                      </Badge>
                    )}
                  </HStack>
                  <Text color="fg.muted" textStyle="sm">
                    Create named volumes for persistent data (Optional)
                  </Text>
                </Stack>

                <Button
                  size="sm"
                  colorPalette="orange"
                  variant="outline"
                  onClick={() => handleOpenDrawer("4")}
                  disabled={!hasServices}
                >
                  <PiPlus />
                  Configure Volumes
                </Button>
              </HStack>
            </Card.Header>

            <Card.Body>
              <Center
                userSelect="none"
                borderWidth="2px"
                borderStyle="dashed"
                rounded="lg"
                padding="6"
                minH="16"
              >
                <Stack gap="2" textAlign="center">
                  <Icon size="md" color="gray.400">
                    <PiGhost />
                  </Icon>
                  <Text color="fg.muted" textStyle="sm">
                    Coming Soon
                  </Text>
                  <Text color="fg.muted" textStyle="xs">
                    Named volumes configuration will be available soon
                  </Text>
                </Stack>
              </Center>
            </Card.Body>
          </Card.Root>

          {/* Deploy Actions */}
          <Card.Root
            borderColor={isReadyToDeploy ? "green.200" : "border.muted"}
          >
            <Card.Header>
              <HStack justify="space-between" align="center">
                <Stack gap="1">
                  <HStack gap="2">
                    <Badge
                      colorPalette={isReadyToDeploy ? "green" : "gray"}
                      size="sm"
                    >
                      {isReadyToDeploy ? "Ready" : "Not Ready"}
                    </Badge>
                    <Heading as="h3" size="md">
                      Deploy Application
                    </Heading>
                  </HStack>
                  <Text color="fg.muted" textStyle="sm">
                    {isReadyToDeploy
                      ? "Your application is ready to deploy"
                      : "Complete the required steps to deploy"}
                  </Text>
                </Stack>

                <HStack gap="2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset the form
                      setNewStack(() => ({
                        name: "",
                        description: "",
                        version: "3.8",
                        services: {},
                        networks: {},
                        volumes: {},
                        secrets: {},
                        configs: {},
                        environment: {},
                      }));
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    colorPalette="green"
                    disabled={!isReadyToDeploy}
                    onClick={() => {
                      // Handle deployment
                      console.log("Deploying stack:", newStack);
                      // You would integrate with your deployment API here
                    }}
                  >
                    Deploy Stack
                  </Button>
                </HStack>
              </HStack>
            </Card.Header>

            {validation.errors.length > 0 && (
              <Card.Body pt="0">
                <Stack gap="2">
                  <Text textStyle="sm" fontWeight="medium" color="red.600">
                    Please fix these issues before deploying:
                  </Text>
                  <Stack gap="1" ml="4">
                    {validation.errors.map((error, index) => (
                      <Text key={index} textStyle="sm" color="red.600">
                        • {error}
                      </Text>
                    ))}
                  </Stack>
                </Stack>
              </Card.Body>
            )}
          </Card.Root>
        </Stack>

        {/* YAML Preview Sidebar */}
        <Stack gap="4" position="sticky" top="6" height="fit-content">
          <YamlPreview
            showValidation={true}
            showActions={true}
            maxHeight="70vh"
          />
        </Stack>
      </Grid>

      {/* Drawer for all configuration steps */}
      <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} size="xl">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>{renderDrawerContent()}</Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Container>
  );
};
