// src/components/stacks/ServicesPane.tsx
// Services and containers overview pane for stack details

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
} from "@chakra-ui/react";
import { LuWebhook } from "react-icons/lu";
import type { UnifiedService, DetailedContainer } from "@/types/unified";
import { ServiceTabsTrigger } from "./ServicetTabsTrigger";
import { ServiceTabsContent } from "./ServiceTabsContent";

interface ServicesPaneProps {
  services: UnifiedService[];
}

export const ServicesPane: React.FC<ServicesPaneProps> = ({ services }) => {
  return (
    <Container
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
            Service and Container Overview
          </Heading>

          <Stack>
            <Tabs.Root
              defaultValue={services[0]?.name || "main"}
              orientation="vertical"
              colorPalette="brand"
              size="md"
              maxH="82dvh"
              justify="start"
            >
              <ServiceTabsTrigger services={services} />
              <ServiceTabsContent services={services} />
            </Tabs.Root>
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
};
