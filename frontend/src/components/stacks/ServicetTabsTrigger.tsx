import React from "react";
import {
  Card,
  Code,
  Container,
  HStack,
  Heading,
  Stack,
  Tabs,
  Text,
  TreeView,
  createTreeCollection,
} from "@chakra-ui/react";

import {
  BsHddStackFill,
  BsFileCodeFill,
  BsDiagram2Fill,
  BsBoxSeamFill,
} from "react-icons/bs";

import type { UnifiedService } from "@/types/unified";

interface ServicesTabsProps {
  services: UnifiedService[];
}

export const ServiceTabsTrigger: React.FC<ServicesTabsProps> = ({
  services,
}) => {
  return (
    <Tabs.List>
      {services.map((s) => (
        <Tabs.Trigger
          key={s.name}
          value={s.name}
          h="fit"
          w="full"
          alignItems="top"
          pr="0"
          _focus={{ background: "brand.surfaceContainerHigh" }}
        >
          <Container w="full">
            <Stack w="full" gap="0.5" justifyContent="left">
              <HStack w="full">
                <BsFileCodeFill />
                <Text textStyle="lg">{s.name}</Text>
              </HStack>
              <HStack w="100%" p="1" color="brand.onSurfaceVariant" gap="4">
                <HStack gap="1">
                  <Text textStyle="xs">{s.networks.length}</Text>
                  <BsDiagram2Fill />
                </HStack>
                <HStack gap="1">
                  <Text textStyle="xs">{s.volumes.length}</Text>
                  <BsHddStackFill />
                </HStack>
                <HStack gap="1">
                  <Text textStyle="xs">{s.container_count}</Text>
                  <BsBoxSeamFill />
                </HStack>
              </HStack>
            </Stack>
          </Container>
        </Tabs.Trigger>
      ))}
      <Tabs.Indicator rounded="l2" />
    </Tabs.List>
  );
};
