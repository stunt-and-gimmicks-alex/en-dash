// NewDockerApplicationForm.tsx - Updated wizard with card display for basic config

import React, { useState } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";
import {
  Button,
  Card,
  Center,
  Container,
  Drawer,
  Flex,
  Heading,
  HStack,
  Icon,
  Portal,
  Stack,
  Steps,
  Text,
} from "@chakra-ui/react";
import { PiGhost } from "react-icons/pi";
import { NewDockDrawerStart } from "./NewDockerAppDrawerBasic";
import { NewDockDrawerServices } from "./NewDockerApplicationDrawerServices";
import { AppConfigCard } from "./NewDockerAppItemCard";

export const NewDockerAppWizard = () => {
  const { newStack, setNewStack } = useNewStackStore();
  const [open, setOpen] = useState(false);
  const [drawerStep, setDrawer] = useState("1");

  // Helper functions to check completion status
  const hasBasicInfo = !!newStack.name;
  const hasServices =
    newStack.services && Object.keys(newStack.services).length > 0;
  const hasNetworks =
    newStack.networks && Object.keys(newStack.networks).length > 0;

  const handleOpenDrawer = (step: string) => {
    setDrawer(step);
    setOpen(true);
  };

  const handleCloseDrawer = () => {
    setOpen(false);
  };

  const renderDrawerContent = () => {
    switch (drawerStep) {
      case "1":
        return <NewDockDrawerStart onClose={handleCloseDrawer} />;
      case "2":
        return <NewDockDrawerServices onClose={handleCloseDrawer} />;
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
    <Container maxW="7xl" py="20" colorPalette="secondaryBrand">
      <Stack gap="10">
        {/* Step 1: Basic Configuration */}
        <Flex
          direction="row"
          justify="space-between"
          align="center"
          gap="6"
          py="0"
        >
          <HStack gap="6" w="1/2">
            <Stack>
              <Steps.Item title="Step 1" index={0}>
                <Steps.Indicator />
                <Steps.Separator />
              </Steps.Item>
            </Stack>
            <Stack gap="0.5" justify="left">
              <Heading as="h3">Basic Configuration</Heading>
              <Text>Name your application and provide basic details.</Text>
            </Stack>
          </HStack>

          <Card.Root w="1/2">
            <Card.Header
              gap="6"
              flexDirection={{ base: "column", md: "row" }}
              justifyContent="center"
              alignItems="center"
              p="3"
            >
              <Card.Title textStyle="xs" pb="0">
                {hasBasicInfo
                  ? `Application: ${newStack.name}`
                  : "Application Setup"}
              </Card.Title>
            </Card.Header>

            <Card.Body gap="4" px="6" pt="1">
              {hasBasicInfo ? (
                <AppConfigCard
                  labels={newStack.name}
                  onEdit={() => handleOpenDrawer("1")} // Opens basic config drawer
                  onDelete={() => {
                    // Clear the basic config
                    setNewStack((stack) => {
                      stack.name = "";
                      stack.description = "";
                      // Maybe clear other basic fields too
                    });
                  }}
                />
              ) : (
                <Center
                  userSelect="none"
                  borderWidth="2px"
                  borderStyle="dashed"
                  rounded="lg"
                  padding="2"
                >
                  <Icon size="md" color="brandGray.600">
                    <PiGhost />
                  </Icon>
                </Center>
              )}
            </Card.Body>

            <Card.Footer>
              <Button
                w="full"
                variant="ghost"
                onClick={() => handleOpenDrawer("1")}
              >
                {hasBasicInfo ? "Edit Basics" : "Start Here"}
              </Button>
            </Card.Footer>
          </Card.Root>
        </Flex>

        {/* Step 2: Services */}
        <Flex
          direction="row"
          justify="space-between"
          align="center"
          gap="6"
          py="0"
        >
          <HStack gap="6" w="1/2">
            <Stack>
              <Steps.Item title="Step 2" index={1}>
                <Steps.Indicator />
                <Steps.Separator />
              </Steps.Item>
            </Stack>
            <Stack gap="0.5" justify="left">
              <Heading as="h3">Docker Services</Heading>
              <Text>Configure the containers for your application.</Text>
            </Stack>
          </HStack>

          <Card.Root w="1/2">
            <Card.Header
              gap="6"
              flexDirection={{ base: "column", md: "row" }}
              justifyContent="center"
              alignItems="center"
              p="3"
            >
              <Card.Title textStyle="xs" pb="0">
                {hasServices
                  ? `${
                      Object.keys(newStack.services).length
                    } Service(s) Configured`
                  : "No Services Yet"}
              </Card.Title>
            </Card.Header>

            <Card.Body gap="4" px="6" pt="1">
              {hasServices ? (
                Object.entries(newStack.services).map(
                  ([serviceId, service]) => (
                    <AppConfigCard
                      key={serviceId}
                      labels={service.name}
                      onEdit={() => {
                        // Handle edit - maybe set serviceId and open drawer
                      }}
                      onDelete={() => {
                        // Handle delete - remove from store
                        setNewStack((stack) => {
                          delete stack.services[serviceId];
                        });
                      }}
                    />
                  )
                )
              ) : (
                <Center
                  userSelect="none"
                  borderWidth="2px"
                  borderStyle="dashed"
                  rounded="lg"
                  padding="2"
                >
                  <Icon size="lg" color="brandGray.600">
                    <PiGhost />
                  </Icon>
                </Center>
              )}
            </Card.Body>

            <Card.Footer>
              <Button
                w="full"
                disabled={!hasBasicInfo}
                variant="ghost"
                onClick={() => handleOpenDrawer("2")}
              >
                {hasServices ? "Add Another Service" : "Add Services"}
              </Button>
            </Card.Footer>
          </Card.Root>
        </Flex>

        {/* Step 3: Networks (placeholder) */}
        <Flex
          direction="row"
          justify="space-between"
          align="center"
          gap="6"
          py="0"
        >
          <HStack gap="6" w="1/2">
            <Stack>
              <Steps.Item title="Step 3" index={2}>
                <Steps.Indicator />
                <Steps.Separator />
              </Steps.Item>
            </Stack>
            <Stack gap="0.5" justify="left">
              <Heading as="h3">Network Configuration</Heading>
              <Text>Set up networking for container communication.</Text>
            </Stack>
          </HStack>

          <Card.Root w="1/2">
            <Card.Header
              gap="6"
              flexDirection={{ base: "column", md: "row" }}
              justifyContent="center"
              alignItems="center"
              p="3"
            >
              <Card.Title textStyle="xs" pb="0">
                Coming Soon
              </Card.Title>
            </Card.Header>

            <Card.Body gap="4" px="6" pt="1">
              <Center
                userSelect="none"
                borderWidth="2px"
                borderStyle="dashed"
                rounded="lg"
                padding="2"
              >
                {hasNetworks ? (
                  Object.entries(newStack.networks).map(
                    ([networkId, network]) => (
                      <AppConfigCard
                        key={networkId}
                        labels={network.name || networkId}
                        onEdit={() => handleOpenDrawer("3")} // Opens network drawer
                        onDelete={() => {
                          // Remove network from store
                          setNewStack((stack) => {
                            delete stack.networks[networkId];
                          });
                        }}
                      />
                    )
                  )
                ) : (
                  <Icon size="lg" color="brandGray.600">
                    <PiGhost />
                  </Icon>
                )}
              </Center>
            </Card.Body>

            <Card.Footer>
              <Button
                w="full"
                disabled={!hasServices} // Networks depend on having services
                variant="ghost"
                onClick={() => handleOpenDrawer("3")}
              >
                {hasNetworks ? "Edit Networks" : "Configure Networks"}
              </Button>
            </Card.Footer>
          </Card.Root>
        </Flex>
      </Stack>

      {/* Drawer for all configuration steps */}
      <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} size="lg">
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
