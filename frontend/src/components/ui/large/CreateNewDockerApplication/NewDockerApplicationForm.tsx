// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░ Functionality Imports ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import React, { useState, useMemo, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░   Component Imports   ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import {
  Button,
  ButtonGroup,
  Card,
  Center,
  CloseButton,
  Container,
  Drawer,
  Field,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Portal,
  Stack,
  Steps,
  Text,
} from "@chakra-ui/react";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      App Imports      ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import { NewDockerAppFormSection } from "@/components/ui/large/CreateNewDockerApplication/NewDockerApplicationFormSection";
import { PiGhost } from "react-icons/pi";
import { NewDockDrawerStart } from "./NewDockerApplicationDrawer1";
import { NewDockDrawerServices } from "./NewDockerApplicationDrawerServices";
import { AppConfigCard } from "./NewDockerAppItemCard";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      All The Rest     ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
export const NewDockerAppWizard = () => {
  const { newStack, setNewStack, resetStack } = useNewStackStore();
  const [open, setOpen] = useState(false);
  const [drawerStep, setDrawer] = useState("1");

  return (
    <Container maxW="7xl" py="20" colorPalette="secondaryBrand">
      <Stack gap="10">
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
              <Heading as="h3">Docker App Basics</Heading>
              <Text>
                Name your new application and provide initial configs.
              </Text>
            </Stack>
          </HStack>
          <Card.Root w="1/2">
            <Card.Header
              gap="6"
              flexDirection={{ base: "column", md: "row" }}
              justifyContent="center"
              alignItems="center"
              p="3"
              w="3/7"
            >
              <Card.Title textStyle="xs" pb="0">
                Let's Create A New Docker Application!
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
                {(newStack.name && (
                  <AppConfigCard labels={newStack.name} />
                )) || (
                  <Icon size="lg" color="brandGray.600">
                    <PiGhost />
                  </Icon>
                )}
              </Center>
            </Card.Body>
            <Card.Footer>
              <Button
                w="full"
                variant="ghost"
                onClick={() => {
                  setDrawer("1");
                  setOpen(true);
                }}
              >
                {(newStack.name && "Edit Basics") || "Start Here"}
              </Button>
            </Card.Footer>
          </Card.Root>
        </Flex>
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
              <Heading as="h3">Docker App Basics</Heading>
              <Text>
                Name your new application and provide initial configs.
              </Text>
            </Stack>
          </HStack>
          <Card.Root w="1/2">
            <Card.Header
              gap="6"
              flexDirection={{ base: "column", md: "row" }}
              justifyContent="center"
              alignItems="center"
              p="3"
              w="3/7"
            >
              <Card.Title textStyle="xs" pb="0">
                Let's Create A New Docker Application!
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
                <Icon size="lg" color="brandGray.600">
                  <PiGhost />
                </Icon>
              </Center>
            </Card.Body>
            <Card.Footer>
              <Button
                w="full"
                disabled={!newStack.name}
                variant="ghost"
                onClick={() => {
                  setDrawer("2");
                  setOpen(true);
                }}
              >
                Add A Service
              </Button>
            </Card.Footer>
          </Card.Root>
        </Flex>
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
              <Heading as="h3">Docker App Basics</Heading>
              <Text>
                Name your new application and provide some basic details.
              </Text>
            </Stack>
          </HStack>
          <Card.Root w="1/2">
            <Card.Header
              gap="6"
              flexDirection={{ base: "column", md: "row" }}
              justifyContent="center"
              alignItems="center"
              p="3"
              w="3/7"
            >
              <Card.Title textStyle="xs" pb="0">
                Let's Create A New Docker Application!
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
                <Icon size="lg" color="brandGray.600">
                  <PiGhost />
                </Icon>
              </Center>
            </Card.Body>
            <Card.Footer>
              <Button
                w="full"
                disabled={
                  !(
                    newStack.name &&
                    newStack.services &&
                    Object.keys(newStack.services).length > 0
                  )
                }
                variant="ghost"
              >
                Add A Network
              </Button>
            </Card.Footer>
          </Card.Root>
        </Flex>
        <Flex
          direction="row"
          justify="space-between"
          align="center"
          gap="6"
          py="0"
        >
          <HStack gap="6" w="1/2">
            <Stack>
              <Steps.Item title="Step 4" index={3}>
                <Steps.Indicator />
                <Steps.Separator />
              </Steps.Item>
            </Stack>
            <Stack gap="0.5" justify="left">
              <Heading as="h3">Getting Started</Heading>
              <Text>
                Name your new application and provide some basic details.
              </Text>
            </Stack>
          </HStack>
          <Card.Root w="1/2">
            <Card.Header
              gap="6"
              flexDirection={{ base: "column", md: "row" }}
              justifyContent="center"
              alignItems="center"
              p="3"
              w="3/7"
            >
              <Card.Title textStyle="xs" pb="0">
                Let's Create A New Docker Application!
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
                <Icon size="lg" color="brandGray.600">
                  <PiGhost />
                </Icon>
              </Center>
            </Card.Body>
            <Card.Footer>
              <Button
                w="full"
                disabled={
                  !(
                    newStack.name &&
                    newStack.services &&
                    Object.keys(newStack.services).length > 0 &&
                    newStack.networks.length > 0
                  )
                }
                variant="ghost"
              >
                Add A Volume
              </Button>
            </Card.Footer>
          </Card.Root>
        </Flex>
      </Stack>
      <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} size="md">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              {drawerStep === "1" ? (
                <NewDockDrawerStart />
              ) : drawerStep === "2" ? (
                <NewDockDrawerServices />
              ) : (
                <Center
                  userSelect="none"
                  borderWidth="2px"
                  borderStyle="dashed"
                  rounded="lg"
                  padding="2"
                >
                  <Icon size="2xl" color="brandGray.600">
                    <PiGhost />
                  </Icon>
                </Center>
              )}
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Container>
  );
};
