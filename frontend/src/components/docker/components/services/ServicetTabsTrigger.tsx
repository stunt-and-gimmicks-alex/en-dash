import React from "react";
import { HStack, Stack, Tabs, Text } from "@chakra-ui/react";

import type { UnifiedService } from "@/types/unified";
import {
  PiCallBell,
  PiHardDrives,
  PiNetwork,
  PiShippingContainer,
} from "react-icons/pi";

interface ServicesTabsProps {
  services: UnifiedService[];
}

export const ServiceTabsTrigger: React.FC<ServicesTabsProps> = ({
  services,
}) => {
  return (
    <Tabs.List>
      {services.map((s) => (
        <Tabs.Trigger key={s.name} value={s.name} h="fit" alignItems="top">
          <Stack gap="0.5" justifyContent="left" px="2">
            <HStack w="full">
              <PiCallBell />
              <Text textStyle="lg">{s.name}</Text>
            </HStack>
            <HStack w="100%" p="1" gap="4">
              <HStack gap="1">
                <Text textStyle="sm">{s.networks.length}</Text>
                <PiNetwork />
              </HStack>
              <HStack gap="1">
                <Text textStyle="sm">{s.volumes.length}</Text>
                <PiHardDrives />
              </HStack>
              <HStack gap="1">
                <Text textStyle="sm">{s.container_count}</Text>
                <PiShippingContainer />
              </HStack>
            </HStack>
          </Stack>
        </Tabs.Trigger>
      ))}
      <Tabs.Indicator rounded="l2" />
    </Tabs.List>
  );
};
