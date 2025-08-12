// frontend/src/components/navigation/ModuleDropdown.tsx
// Fixed module dropdown component - ONLY ADDED currentPage logic for sub-item highlighting

import React from "react";
import { Button, Stack, Box, HStack, Text } from "@chakra-ui/react";
import { Collapsible } from "@chakra-ui/react";
import { Status } from "@chakra-ui/react";
import { SidebarLink } from "./SidebarLink";
import { PiCaretDown } from "react-icons/pi";
import type { PageKey } from "@/types/navigation";

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
  currentPage?: PageKey; // ← ONLY FIX: Add currentPage prop
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
  currentPage, // ← ONLY FIX: Accept currentPage prop
}) => {
  // Convert items to consistent format
  const normalizedItems: ModuleDropdownItem[] = items.map((item) => {
    if (typeof item === "string") {
      return { name: item };
    }
    return item;
  });

  // ← ONLY FIX: Helper function to check if sub-item should be active
  const isItemActive = (itemName: string): boolean => {
    if (!currentPage) return false;

    // Map Docker sub-items to their corresponding pages (only existing pages)
    const itemPageMapping: Record<string, PageKey[]> = {
      Stacks: ["docker-stacks"],
      // TODO: Add other pages when they exist:
      // "Containers": ["docker-containers"],
      // "Images": ["docker-images"],
      // "Networks": ["docker-networks"],
      // "Volumes": ["docker-volumes"],
    };

    const mappedPages = itemPageMapping[itemName] || [];
    return mappedPages.includes(currentPage);
  };

  // ← ONLY FIX: Helper function to check if sub-item has an existing page
  const isItemEnabled = (itemName: string): boolean => {
    const itemPageMapping: Record<string, PageKey[]> = {
      Stacks: ["docker-stacks"],
      // TODO: Add other pages when they exist:
      // "Containers": ["docker-containers"],
      // "Images": ["docker-images"],
      // "Networks": ["docker-networks"],
      // "Volumes": ["docker-volumes"],
    };

    const mappedPages = itemPageMapping[itemName] || [];
    return mappedPages.length > 0; // Item is enabled if it has at least one mapped page
  };

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
            // ← ONLY FIX: Check if this sub-item should be active and enabled
            const isActive = isItemActive(item.name);
            const isEnabled = isItemEnabled(item.name);

            // Handle simple string items
            if (!item.status) {
              return (
                <SidebarLink
                  key={item.name}
                  ps="9"
                  fontSize="sm"
                  disabled={disabled || !isEnabled} // ← ONLY FIX: Auto-disable if no page exists
                  isActive={isActive}
                  onClick={() =>
                    !disabled && isEnabled && onItemClick?.(item.name)
                  } // ← ONLY FIX: Only call onClick if enabled
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
                disabled={disabled || !isEnabled} // ← ONLY FIX: Auto-disable if no page exists
                isActive={isActive}
                onClick={() =>
                  !disabled && isEnabled && onItemClick?.(item.name)
                } // ← ONLY FIX: Only call onClick if enabled
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
