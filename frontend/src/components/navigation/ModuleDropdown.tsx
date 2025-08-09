// frontend/src/components/navigation/ModuleDropdown.tsx
// Fixed module dropdown component with working item click handlers

import React from "react";
import { Button, Stack, Box, HStack, Text } from "@chakra-ui/react";
import { Collapsible } from "@chakra-ui/react";
import { Status } from "@chakra-ui/react";
import { SidebarLink } from "./SidebarLink";
import { PiCaretDown } from "react-icons/pi";

interface ModuleDropdownItem {
  name: string;
  status?: "active" | "inactive" | "exited";
}

interface ModuleDropdownProps {
  icon: any;
  label: string | React.ReactNode; // Update to accept React elements
  items: string[];
  isOpen: boolean;
  onToggle: () => void;
  isMainActive?: boolean;
  onHeaderClick?: () => void;
  onItemClick?: (item: string) => void;
  disabled?: boolean; // Add disabled prop
}

export const ModuleDropdown: React.FC<ModuleDropdownProps> = ({
  icon: Icon,
  label,
  items,
  isOpen = false,
  onToggle,
  isMainActive = false,
  onHeaderClick,
  onItemClick,
  disabled = false,
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
          color={isMainActive ? "brand.onPrimary" : "brand.onPrimary/95"}
          bg={isMainActive ? "brand.primaryContainer/25" : "transparent"}
          _hover={{
            bg: isMainActive
              ? "brand.primaryContainer/80"
              : "brand.primaryContainer",
            color: isMainActive
              ? "brand.onPrimaryContainer"
              : "brand.onPrimaryContainer",
          }}
          borderRadius="md"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              onHeaderClick?.();
              onToggle?.();
            }
          }}
        >
          <HStack gap="3">
            <Icon size="16" />
            {/* Handle both string and React element labels */}
            {typeof label === "string" ? (
              <Text fontSize="sm">{label}</Text>
            ) : (
              <Box fontSize="sm">{label}</Box>
            )}
          </HStack>
          <PiCaretDown
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
                <SidebarLink
                  key={item.name}
                  ps="9"
                  fontSize="sm"
                  disabled={disabled}
                  onClick={() => !disabled && onItemClick?.(item.name)}
                >
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
              <SidebarLink
                key={item.name}
                ps="9"
                fontSize="sm"
                disabled={disabled}
                onClick={() => !disabled && onItemClick?.(item.name)}
              >
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
