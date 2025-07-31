// frontend/src/components/navigation/ModuleDropdown.tsx
// Clean module dropdown component using ChakraUI v3 and Collapsible

import React from "react";
import { Button, Stack, Box, HStack, Text } from "@chakra-ui/react";
import { Collapsible } from "@chakra-ui/react";
import { Status } from "@chakra-ui/react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { SidebarLink } from "./SidebarLink";

interface ModuleDropdownItem {
  name: string;
  status?: "active" | "inactive" | "exited";
}

interface ModuleDropdownProps {
  icon: LucideIcon;
  label: string;
  items: string[] | ModuleDropdownItem[];
  isOpen?: boolean;
  onToggle?: () => void;
  isMainActive?: boolean;
  onHeaderClick?: () => void;
}

export const ModuleDropdown: React.FC<ModuleDropdownProps> = ({
  icon: Icon,
  label,
  items,
  isOpen = false,
  onToggle,
  isMainActive = false,
  onHeaderClick,
}) => {
  // Convert items to consistent format
  const normalizedItems: ModuleDropdownItem[] = items.map((item) => {
    if (typeof item === "string") {
      return { name: item };
    }
    return item;
  });

  return (
    <Collapsible.Root open={isOpen}>
      {/* Header Button */}
      <Box>
        <Button
          variant="ghost"
          width="full"
          justifyContent="space-between"
          px="3"
          py="2"
          h="auto"
          fontWeight="normal"
          color={isMainActive ? "brand.primary" : "brand.onSurface"}
          bg={isMainActive ? "brand.primaryContainer" : "transparent"}
          _hover={{
            bg: isMainActive
              ? "brand.primaryContainer"
              : "brand.surfaceContainer",
            color: isMainActive
              ? "brand.onPrimaryContainer"
              : "brand.onSurface",
          }}
          borderRadius="md"
          onClick={() => {
            onHeaderClick?.();
            onToggle?.();
          }}
        >
          <HStack gap="3">
            <Icon size="16" />
            <Text fontSize="sm">{label}</Text>
          </HStack>
          <ChevronDown
            size="16"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </Button>
      </Box>

      {/* Collapsible Content */}
      <Collapsible.Content>
        <Stack gap="1" pl="3" pt="1">
          {normalizedItems.map((item) => {
            // Handle simple string items
            if (!item.status) {
              return (
                <SidebarLink key={item.name} ps="9" fontSize="sm">
                  {item.name}
                </SidebarLink>
              );
            }

            // Handle items with status indicators
            const statusColor =
              item.status === "active"
                ? "green"
                : item.status === "exited"
                ? "red"
                : "gray";

            return (
              <SidebarLink key={item.name} ps="9" fontSize="sm">
                <HStack justify="space-between" width="full">
                  <Text>{item.name}</Text>
                  <Status.Root colorPalette={statusColor} size="sm">
                    <Status.Indicator />
                  </Status.Root>
                </HStack>
              </SidebarLink>
            );
          })}
        </Stack>
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
