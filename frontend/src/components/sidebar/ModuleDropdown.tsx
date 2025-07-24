// src/components/sidebar/ModuleDropdown.tsx - Updated with controlled state and dynamic stacks
import React from "react";
import {
    Button,
    Collapsible,
    HStack,
    Icon,
    Stack,
    Badge,
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
                    color={
                        isMainActive
                            ? "brand.600"
                            : { base: "gray.700", _dark: "gray.300" }
                    }
                    bg={
                        isMainActive
                            ? { base: "brand.50", _dark: "brand.900" }
                            : "transparent"
                    }
                    _hover={{
                        bg: { base: "brand.50", _dark: "brand.900" },
                        color: "brand.600",
                    }}
                    _expanded={{
                        bg: { base: "brand.50", _dark: "brand.900" },
                        color: "brand.600",
                    }}
                    px="3"
                    py="2"
                    h="auto"
                    fontWeight="normal"
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
                                <SidebarLink
                                    key={item.name}
                                    ps="12"
                                    fontSize="sm"
                                >
                                    <HStack
                                        justify="space-between"
                                        width="full"
                                    >
                                        <span>{item.name}</span>
                                        <Badge
                                            colorPalette={statusColor}
                                            variant="solid"
                                            size="xs"
                                        />
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
