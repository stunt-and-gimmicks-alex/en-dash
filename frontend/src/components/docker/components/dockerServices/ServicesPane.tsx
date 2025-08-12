// src/components/stacks/ServicesPane.tsx
// Services and containers overview pane for stack details

import React from "react";
import { Box, Tabs } from "@chakra-ui/react";
import type { EnhancedUnifiedService } from "@/types/unified";
import { ServiceTabsTrigger } from "./ServicetTabsTrigger";
import { ServiceTabsContent } from "./ServiceTabsContent";
import { NewServiceLeftPane } from "./NewServiceLeftPane";

interface ServicesPaneProps {
  services: EnhancedUnifiedService[];
}

export const ServicesPane: React.FC<ServicesPaneProps> = ({ services }) => {
  return (
    <Box gap="10" pb="5">
      <NewServiceLeftPane services={services} />
      <Tabs.Root
        defaultValue={services[0]?.name || "main"}
        orientation="vertical"
        colorPalette="brand"
        size="lg"
        maxH="100%"
        justifyContent="start"
        pt="10"
      >
        <ServiceTabsTrigger services={services} />
        <ServiceTabsContent services={services} />
      </Tabs.Root>
    </Box>
  );
};
