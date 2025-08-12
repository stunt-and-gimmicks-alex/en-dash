import React from "react";
import {
  Card,
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Stack,
  StackSeparator,
  Status,
  Tabs,
  Text,
  Flex,
} from "@chakra-ui/react";

import { BsFileCodeFill } from "react-icons/bs";

import type { UnifiedService, UnifiedStack } from "@/types/unified";
import { StackControlButtons } from "@/components/ui/small/StackControlButtons";
import {
  PiAppWindow,
  PiHardDrives,
  PiNetwork,
  PiShippingContainer,
  PiTerminalWindow,
} from "react-icons/pi";

interface AppTabsProps {
  stacks: UnifiedStack[];
  onStart: (stackName: string) => Promise<boolean>;
  onStop: (stackName: string) => Promise<boolean>;
  onRestart: (stackName: string) => Promise<boolean>;
  onToggle: (stack: UnifiedStack | null) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const AppTabs: React.FC<AppTabsProps> = ({
  stacks,
  onStart,
  onStop,
  onRestart,
  onToggle,
  loading = false,
  disabled = false,
}) => {
  return (
    <Tabs.List w="full">
      {stacks.map((stack) => (
        <>
          <Tabs.Trigger
            key={stack.name}
            value={stack.name}
            h="fit"
            alignItems="top"
            fontWeight="normal"
            w="full"
          >
            <HStack gap="4" justifyContent="left" p="2">
              <HStack gap="4">
                <Status.Root
                  colorPalette={
                    stack.status === "running"
                      ? "green"
                      : status === "partial"
                      ? "yellow"
                      : "red"
                  }
                  size="lg"
                >
                  <Status.Indicator />
                </Status.Root>
                <Icon size="lg">
                  <PiAppWindow />
                </Icon>
              </HStack>
              <Stack gap="1" justifyContent="left">
                <HStack>
                  <Heading textStyle="lg">{stack.name}</Heading>
                </HStack>
                <Flex columnGap="10" rowGap="2" wrap="wrap">
                  <HStack gap="2">
                    <Icon size="md">
                      <PiShippingContainer />
                    </Icon>
                    <Text>Containers:</Text>
                    <Text>
                      {stack.stats?.containers?.running || 0} of{" "}
                      {stack.stats?.containers?.total || 0} running
                    </Text>
                  </HStack>
                  <HStack>
                    <Icon size="md">
                      <PiNetwork />
                    </Icon>
                    <Text>Networks:&ensp;</Text>
                    <Text>
                      {stack.stats?.networks?.external || 0} external /&nbsp;
                      {stack.stats?.networks?.total || 0} total
                    </Text>
                  </HStack>
                  <HStack>
                    <Icon size="md">
                      <PiHardDrives />
                    </Icon>
                    <Text>Volumes:&ensp;</Text>
                    <Text>
                      {stack.stats?.volumes?.external || 0} external /&nbsp;
                      {stack.stats?.volumes?.total || 0} total
                    </Text>
                  </HStack>
                </Flex>
              </Stack>
            </HStack>
          </Tabs.Trigger>
        </>
      ))}
    </Tabs.List>
  );
};
