// src/components/sidebar/Sidebar.tsx - Updated with navigation logic and proper Collapsible usage
import React, { useState } from "react";
import { Stack, Box, Text, type StackProps } from "@chakra-ui/react";
import {
    LayoutDashboard,
    BarChart3,
    Clock,
    Bookmark,
    HelpCircle,
    Settings,
    Server,
    Activity,
    HardDrive,
    Cpu,
    Network,
    Shield,
    Database,
    Container,
    Globe,
} from "lucide-react";
import { Logo } from "./Logo";
import { SearchField } from "./SearchField";
import { SidebarLink } from "./SidebarLink";
import { UserProfile } from "./UserProfile";
import { ModuleDropdown } from "./ModuleDropdown";
import { useDockgeStacks } from "@/hooks/useDockge";

// Define navigation state type (this should match the one in Layout.tsx)
type CurrentPage =
    | "dashboard"
    | "system-monitor"
    | "storage"
    | "processes"
    | "network"
    | "security"
    | "docker-overview"
    | "databases-overview"
    | "web-services-overview"
    | "monitoring-overview";

const serverLinks = [
    { icon: LayoutDashboard, label: "Dashboard", key: "dashboard" as const },
    {
        icon: BarChart3,
        label: "System Monitor",
        key: "system-monitor" as const,
    },
    { icon: HardDrive, label: "Storage", key: "storage" as const },
    { icon: Cpu, label: "Processes", key: "processes" as const },
    { icon: Network, label: "Network", key: "network" as const },
    { icon: Shield, label: "Security", key: "security" as const },
];

const moduleGroups = [
    {
        icon: Container,
        label: "Docker (Dockge)",
        key: "docker-overview" as const,
        items: [
            { name: "homelab-monitoring", status: "active" as const },
            { name: "media-server", status: "active" as const },
            { name: "development", status: "inactive" as const },
            { name: "backup-system", status: "active" as const },
            { name: "web-services", status: "active" as const },
            { name: "database-cluster", status: "exited" as const },
        ],
    },
    {
        icon: Database,
        label: "Databases",
        key: "databases-overview" as const,
        items: ["MySQL", "PostgreSQL", "Redis", "MongoDB"],
    },
    {
        icon: Globe,
        label: "Web Services",
        key: "web-services-overview" as const,
        items: ["Nginx", "Apache", "SSL Certificates", "Virtual Hosts"],
    },
    {
        icon: Activity,
        label: "Monitoring",
        key: "monitoring-overview" as const,
        items: ["Metrics", "Alerts", "Logs", "Uptime"],
    },
];

// Add interface for navigation props
interface SidebarProps extends StackProps {
    currentPage: CurrentPage;
    onNavigate: (page: CurrentPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    currentPage,
    onNavigate,
    ...props
}) => {
    // State to manage which module dropdown is open (only one at a time)
    const [openModule, setOpenModule] = useState<string | null>(
        "Docker (Dockge)"
    ); // Open Docker by default

    const handleModuleToggle = (moduleLabel: string) => {
        setOpenModule(openModule === moduleLabel ? null : moduleLabel);
    };

    return (
        <Stack
            flex="1"
            p={{ base: "4", md: "6" }}
            bg={{ base: "gray.50", _dark: "gray.800" }}
            borderRightWidth="1px"
            borderColor={{ base: "gray.200", _dark: "gray.700" }}
            justifyContent="space-between"
            w="full"
            h="full"
            {...props}
        >
            <Stack gap="6">
                <Logo style={{ alignSelf: "start" }} />
                <SearchField />
                <Stack gap="6">
                    {/* Server Group */}
                    <Stack gap="2">
                        <Text
                            fontWeight="semibold"
                            fontSize="xs"
                            color={{ base: "gray.500", _dark: "gray.400" }}
                            textTransform="uppercase"
                            letterSpacing="wider"
                            px="3"
                        >
                            Server
                        </Text>
                        <Stack gap="1">
                            {serverLinks.map((link) => (
                                <SidebarLink
                                    key={link.key}
                                    isActive={currentPage === link.key}
                                    onClick={() => onNavigate(link.key)}
                                    aria-current={
                                        currentPage === link.key
                                            ? "page"
                                            : undefined
                                    }
                                >
                                    <link.icon size="16" /> {link.label}
                                </SidebarLink>
                            ))}
                        </Stack>
                    </Stack>

                    {/* Modules Group */}
                    <Stack gap="2">
                        <Text
                            fontWeight="semibold"
                            fontSize="xs"
                            color={{ base: "gray.500", _dark: "gray.400" }}
                            textTransform="uppercase"
                            letterSpacing="wider"
                            px="3"
                        >
                            Modules
                        </Text>
                        <Stack gap="1">
                            {moduleGroups.map((module) => (
                                <ModuleDropdown
                                    key={module.key}
                                    icon={module.icon}
                                    label={module.label}
                                    items={module.items}
                                    isOpen={openModule === module.label}
                                    onToggle={() =>
                                        handleModuleToggle(module.label)
                                    }
                                    isMainActive={currentPage === module.key}
                                    onHeaderClick={() => onNavigate(module.key)}
                                />
                            ))}
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>

            <Stack gap="4">
                <Box
                    borderTop="1px"
                    borderColor={{ base: "gray.200", _dark: "gray.700" }}
                    pt="4"
                >
                    <Stack gap="1">
                        <SidebarLink>
                            <HelpCircle size="16" /> Help Center
                        </SidebarLink>
                        <SidebarLink>
                            <Settings size="16" /> Settings
                        </SidebarLink>
                    </Stack>
                </Box>
                <UserProfile />
            </Stack>
        </Stack>
    );
};
