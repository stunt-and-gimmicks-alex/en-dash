// src/components/stacks/ServicesPane.tsx
// Services and containers overview pane for stack details

import React from "react";
import { Tabs } from "@chakra-ui/react";
import type { UnifiedService } from "@/types/unified";
import { ServiceTabsTrigger } from "./ServicetTabsTrigger";
import { ServiceTabsContent } from "./ServiceTabsContent";

interface ServicesPaneProps {
  services: UnifiedService[];
}

export const ServicesPane: React.FC<ServicesPaneProps> = ({ services }) => {
  return (
    <Tabs.Root
      defaultValue={services[0]?.name || "main"}
      orientation="vertical"
      colorPalette="brand"
      size="lg"
      maxH="100%"
      justifyContent="start"
    >
      <ServiceTabsTrigger services={services} />
      <ServiceTabsContent services={services} />
    </Tabs.Root>
  );
};
