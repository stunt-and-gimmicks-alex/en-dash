// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░ Functionality Imports ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import React, { useState, useMemo, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░   Component Imports   ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀

import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  Center,
  CloseButton,
  Container,
  Drawer,
  Flex,
  HStack,
  Icon,
  Input,
  NativeSelect,
  Portal,
  SimpleGrid,
  Skeleton,
  Spacer,
  Stack,
  Status,
  StatusIndicator,
  Steps,
  Tabs,
  Text,
  useSteps,
} from "@chakra-ui/react";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      Icon Imports     ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import { PiAppWindow, PiCarrot, PiLightning, PiPlus } from "react-icons/pi";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      App Imports      ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import { useStacks } from "@/hooks/useNewApi";
import type { UnifiedStack } from "@/types/unified";
import { StackBlocks } from "@/components/docker/components/applications/StackBlocks";
import { StackDetail } from "@/components/docker/components/applications/StackDetail";
import { useNavigation } from "@/contexts/NavigationContext";
import { NewDockerAppWizard } from "@/components/ui/large/CreateNewDockerApplication/NewDockerApplicationForm";
import { FaHatWizard } from "react-icons/fa";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      All The Rest     ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
export const NewDockerApplication: React.FC = () => {
  const { newStack, setNewStack, resetStack } = useNewStackStore();

  const [step, setStep] = useState(1);

  const items = [
    {
      title: "Step 1",
      description: "Step 1 description",
    },
    {
      title: "Step 2",
      description: "Step 2 description",
    },
    {
      title: "Step 3",
      description: "Step 3 description",
    },
  ];

  const steps = useSteps({
    defaultStep: 0,
    count: items.length,
  });

  return (
    <Box colorPalette="brand" w="full" p="6" bg="bg" justifyItems="center">
      <Flex justify="space-evenly" w="3/5">
        <Card.Root w="full">
          <Card.Header
            gap="6"
            flexDirection={{ base: "column", md: "row" }}
            justifyContent="center"
            alignItems="center"
            pb="2"
          >
            <Icon size="2xl">
              <FaHatWizard />
            </Icon>
            <Stack gap="0" pb="0">
              <Card.Description>Docker Application Wizard</Card.Description>
              <Card.Title textStyle="3xl" pb="0">
                Let's Create A New Docker Application!
              </Card.Title>
            </Stack>
          </Card.Header>
          <Card.Body gap="4" px="6" py="1">
            <Steps.RootProvider orientation="vertical" value={steps}>
              <Steps.List w="full">
                <NewDockerAppWizard />
              </Steps.List>
              <Steps.CompletedContent>
                All steps are complete!
              </Steps.CompletedContent>
            </Steps.RootProvider>
          </Card.Body>
          <Card.Footer p="6" justifyContent="right">
            <ButtonGroup>
              <Button colorPalette="redBrand" variant="solid" color="white">
                Cancel
              </Button>

              <Button
                disabled={
                  !(
                    newStack.name &&
                    newStack.services &&
                    Object.keys(newStack.services).length > 0 &&
                    newStack.networks.length > 0 &&
                    newStack.volumes.length > 0
                  )
                }
              >
                Save and Deploy <PiLightning />
              </Button>
            </ButtonGroup>
          </Card.Footer>
        </Card.Root>
      </Flex>
    </Box>
  );
};
