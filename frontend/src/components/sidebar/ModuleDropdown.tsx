// src/components/sidebar/ModuleDropdown.tsx - Fixed active state logic
import React from "react";
import {
  Button,
  Collapsible,
  HStack,
  Icon,
  Stack,
  Badge,
  Status,
} from "@chakra-ui/react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { SidebarLink } from "./SidebarLink";

interface ModuleDropdownProps {
  icon: LucideIcon;
  label: string;
  items:
    | string[]
    | { name: string; status: "active" | "exited" | "inactive" }[];
  isOpen: boolean;
  onToggle: () => void;
  onHeaderClick?: () => void;
  isMainActive?: boolean;
}

export const ModuleDropdown: React.FC<ModuleDropdownProps> = ({
  icon: IconComponent,
  label,
  items,
  isOpen,
  onToggle,
  onHeaderClick,
  isMainActive = false,
}) => {
  const handleHeaderClick = () => {
    if (onHeaderClick) {
      onHeaderClick();
    }
    onToggle();
  };

  return (
    <Collapsible.Root open={isOpen}>
      <Collapsible.Trigger asChild>
        <Button
          variant="ghost"
          width="full"
          justifyContent="start"
          colorPalette="brandText"
          // Only show active styles when isMainActive is true, not when just expanded
          color={
            isMainActive
              ? { base: "brand.900", _dark: "brand.400" }
              : { base: "brandGray.50", _dark: "brandGray.50/75" }
          }
          bg={
            isMainActive
              ? { base: "brand.400", _dark: "brand.900" }
              : "transparent"
          }
          _hover={{
            bg: { base: "brand.400/75", _dark: "brand.900/75" },
            color: { base: "brand.900/75", _dark: "brand.400/75" },
          }}
          // Remove _expanded styles that were conflicting with isMainActive
          px="3"
          py="2"
          h="auto"
          fontWeight={isMainActive ? "semibold" : "normal"}
          borderRadius="md"
          onClick={handleHeaderClick}
        >
          <HStack justifyContent="space-between" width="full">
            <HStack gap="3">
              <IconComponent size={16} />
              {label}
            </HStack>
            <Icon
              aria-hidden
              transition="transform 0.2s"
              transformOrigin="center"
              transform={isOpen ? "rotate(180deg)" : undefined}
            >
              <ChevronDown size={16} />
            </Icon>
          </HStack>
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Stack gap="1" py="1" mt="1">
          {items.map((item) => {
            // Handle both string arrays and stack objects
            if (typeof item === "string") {
              return (
                <SidebarLink key={item} ps="12" fontSize="sm">
                  {item}
                </SidebarLink>
              );
            } else {
              // Handle stack objects with status
              const statusColor =
                item.status === "active"
                  ? "green"
                  : item.status === "exited"
                  ? "red"
                  : "gray";
              return (
                <SidebarLink key={item.name} ps="12" fontSize="sm">
                  <HStack justify="space-between" width="full">
                    <span>{item.name}</span>
                    <Status.Root colorPalette={statusColor} size="lg">
                      <Status.Indicator />
                    </Status.Root>
                  </HStack>
                </SidebarLink>
              );
            }
          })}
        </Stack>
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
