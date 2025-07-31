// frontend/src/components/navigation/Sidebar.tsx
// Fixed sidebar using working API hooks and proper Docker module structure

import React, { useState } from "react";
import { Stack, Box, Text } from "@chakra-ui/react";
import {
  LayoutDashboard,
  BarChart3,
  HardDrive,
  Cpu,
  Network,
  Shield,
  Database,
  Container,
  Globe,
  Activity,
  HelpCircle,
  Settings,
} from "lucide-react";

import { Logo } from "./Logo";
import { SearchField } from "./SearchField";
import { SidebarLink } from "./SidebarLink";
import { UserProfile } from "./UserProfile";
import { ModuleDropdown } from "./ModuleDropdown";

// USING NEW WEBSOCKET API with unified backend processing
import { useStacks } from "@/hooks/useNewApi";
// import { useDockgeStacks } from "@/hooks/useApi"; // OLD API - remove when confirmed working

import type {
  NavigationProps,
  NavigationItem,
  ModuleGroup,
} from "@/types/navigation";

// Server management navigation items
const serverLinks: NavigationItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "system-monitor", label: "System Monitor", icon: BarChart3 },
  { key: "storage", label: "Storage", icon: HardDrive },
  { key: "processes", label: "Processes", icon: Cpu },
  { key: "network", label: "Network", icon: Network },
  { key: "security", label: "Security", icon: Shield },
];

// Static module groups (non-Docker services)
const staticModuleGroups: ModuleGroup[] = [
  {
    key: "databases-overview",
    label: "Databases",
    icon: Database,
    items: ["MySQL", "PostgreSQL", "Redis", "MongoDB"],
  },
  {
    key: "web-services-overview",
    label: "Web Services",
    icon: Globe,
    items: ["Nginx", "Apache", "SSL Certificates", "Virtual Hosts"],
  },
  {
    key: "monitoring-overview",
    label: "Monitoring",
    icon: Activity,
    items: ["Metrics", "Alerts", "Logs", "Uptime"],
  },
];

export const Sidebar: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
}) => {
  const [openModule, setOpenModule] = useState<string | null>(null);

  // Get live Docker stacks using NEW WebSocket API with unified processing
  const { stacks, connected, loading, error } = useStacks();

  const handleModuleToggle = (moduleLabel: string) => {
    setOpenModule(openModule === moduleLabel ? null : moduleLabel);
  };

  // Create Docker module with proper structure
  const dockerModuleItems = [
    "Overview", // NEW: Real overview page
    "Stacks", // EXISTING: Current docker-overview content
    "Containers",
    "Images",
    "Networks",
    "Volumes",
  ];

  // Add status indicator for Docker label
  const getDockerStatus = () => {
    if (loading) return " (Connecting...)";
    if (!connected) return " (Disconnected)";
    if (error) return " (Error)";
    if (stacks.length === 0) return " (No Stacks)";
    return ` (${stacks.length} stacks)`;
  };

  const dockerModule: ModuleGroup = {
    key: "docker-overview", // Still maps to docker-overview for now
    label: `Docker${getDockerStatus()}`,
    icon: Container,
    items: dockerModuleItems,
  };

  return (
    <Stack
      h="100vh"
      justify="space-between"
      bg="brand.surfaceContainerLowest"
      borderRightWidth="1px"
      borderColor="brand.subtle"
      p="6"
      overflowY="auto"
    >
      {/* Main content */}
      <Stack gap="8">
        {/* Header */}
        <Stack gap="6">
          <Logo />
          <SearchField />
        </Stack>

        {/* Navigation sections */}
        <Stack gap="6">
          {/* Server Management Section */}
          <Stack gap="2">
            <Text
              fontWeight="semibold"
              fontSize="xs"
              color="brand.contrast"
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
                >
                  <link.icon size="16" /> {link.label}
                </SidebarLink>
              ))}
            </Stack>
          </Stack>

          {/* Modules Section */}
          <Stack gap="2">
            <Text
              fontWeight="semibold"
              fontSize="xs"
              color="brand.contrast"
              textTransform="uppercase"
              letterSpacing="wider"
              px="3"
            >
              Modules
            </Text>
            <Stack gap="1">
              {/* Docker Module with Live Data */}
              <ModuleDropdown
                key={dockerModule.key}
                icon={dockerModule.icon}
                label={dockerModule.label}
                items={dockerModule.items}
                isOpen={openModule === dockerModule.label}
                onToggle={() => handleModuleToggle(dockerModule.label)}
                isMainActive={currentPage === dockerModule.key}
                onHeaderClick={() => onNavigate(dockerModule.key)}
              />

              {/* Static Modules */}
              {staticModuleGroups.map((module) => (
                <ModuleDropdown
                  key={module.key}
                  icon={module.icon}
                  label={module.label}
                  items={module.items}
                  isOpen={openModule === module.label}
                  onToggle={() => handleModuleToggle(module.label)}
                  isMainActive={currentPage === module.key}
                  onHeaderClick={() => onNavigate(module.key)}
                />
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Stack>

      {/* Footer */}
      <Stack gap="4">
        <Box borderTop="1px" borderColor="brand.subtle" pt="4">
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
