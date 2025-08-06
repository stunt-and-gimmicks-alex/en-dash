// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░ Functionality Imports ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import React, { useState, useMemo, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░   Component Imports   ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  Center,
  CheckboxCard,
  CloseButton,
  Container,
  Drawer,
  Field,
  Flex,
  Group,
  Heading,
  HStack,
  Icon,
  IconButton,
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
import { PiGhost, PiPencilSimple, PiX } from "react-icons/pi";
import { NewDockDrawerStart } from "./NewDockerApplicationDrawer1";
import { NewDockDrawerServices } from "./NewDockerApplicationDrawerServices";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      All The Rest     ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
export const AppConfigCard = () => {
  const { newStack, setNewStack, resetStack } = useNewStackStore();
  const [open, setOpen] = useState(false);
  const [drawerStep, setDrawer] = useState("1");

  return (
    <Group attached borderWidth="1px" w="full" orientation="horizontal">
      <CheckboxCard.Root
        size="sm"
        h="1.8lh"
        justifyContent="center"
        borderRadius="0"
        borderWidth="0"
        orientation="horizontal"
      >
        <CheckboxCard.HiddenInput />
        <HStack>
          <CheckboxCard.Control>
            <CheckboxCard.Label color="fg">
              App: <Text color="brandSecondary.500">{newStack.name}</Text>
            </CheckboxCard.Label>
          </CheckboxCard.Control>
          <IconButton aria-label="Edit Component" variant="ghost" size="sm">
            <PiPencilSimple />
          </IconButton>
          <IconButton
            aria-label="Search database"
            variant="ghost"
            size="sm"
            colorPalette="redBrand"
          >
            <PiX />
          </IconButton>
        </HStack>
      </CheckboxCard.Root>
    </Group>
  );
};
