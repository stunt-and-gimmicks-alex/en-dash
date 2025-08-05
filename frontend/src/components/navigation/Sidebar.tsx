// frontend/src/components/navigation/Sidebar.tsx
// Fixed sidebar maintaining existing structure and adding Docker item navigation

import React, { useState } from "react";
import { Stack, Box, Text, Spinner, Badge, HStack } from "@chakra-ui/react";
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

import type {
  NavigationProps,
  NavigationItem,
  ModuleGroup,
  PageKey,
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

// Pages that exist and should be enabled
const EXISTING_PAGES: PageKey[] = [
  "dashboard",
  "docker-overview",
  "docker-stacks",
];

// Check if a page exists and should be enabled
const isPageEnabled = (pageKey: PageKey): boolean => {
  return EXISTING_PAGES.includes(pageKey);
};

// Docker item to page mapping
const DOCKER_ITEM_MAPPING: Record<string, PageKey> = {
  Overview: "docker-overview",
  Stacks: "docker-stacks",
  Containers: "docker-overview", // TODO: Create separate containers page
  Images: "docker-overview", // TODO: Create separate images page
  Networks: "docker-overview", // TODO: Create separate networks page
  Volumes: "docker-overview", // TODO: Create separate volumes page
};

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

  // Docker item click handler
  const handleDockerItemClick = (item: string) => {
    console.log(`🐳 Docker item clicked: ${item}`);
    const pageKey = DOCKER_ITEM_MAPPING[item];
    if (pageKey && isPageEnabled(pageKey)) {
      console.log(`🔍 Mapping ${item} → ${pageKey}`);
      onNavigate(pageKey);
    } else if (!isPageEnabled(pageKey)) {
      console.warn(`⚠️ Page not yet implemented: ${pageKey}`);
    } else {
      console.warn(`⚠️ No mapping found for Docker item: ${item}`);
    }
  };

  // Calculate stack statistics for badges
  const getStackStats = () => {
    if (!stacks || stacks.length === 0) {
      return { running: 0, partial: 0, stopped: 0, total: 0 };
    }

    return stacks.reduce(
      (counts, stack) => {
        const runningContainers = stack.stats?.containers?.running || 0;
        const totalContainers = stack.stats?.containers?.total || 0;

        if (runningContainers === 0) {
          counts.stopped++;
        } else if (runningContainers === totalContainers) {
          counts.running++;
        } else {
          counts.partial++;
        }

        counts.total++;
        return counts;
      },
      { running: 0, partial: 0, stopped: 0, total: 0 }
    );
  };

  const stackStats = getStackStats();

  // Create Docker module with proper structure
  const dockerModuleItems = [
    "Overview", // NEW: Real overview page
    "Stacks", // EXISTING: Current docker-overview content
    "Containers",
    "Images",
    "Networks",
    "Volumes",
  ];

  // Build Docker label with status indicator
  const getDockerLabel = () => {
    // Show spinner if:
    // 1. Still loading, OR
    // 2. Connected but no stacks loaded yet (could be loading), OR
    // 3. Error but still attempting to connect
    if (
      loading ||
      (connected && stacks.length === 0 && !error) ||
      (error && !connected)
    ) {
      return (
        <HStack gap="2">
          <Text>Docker</Text>
          <Spinner size="sm" color="brand.onSurfaceVariant" />
        </HStack>
      );
    }

    // Only show error badge if there's a definitive error and we're not connected
    if (error && !connected) {
      return (
        <HStack gap="2">
          <Text>Docker</Text>
          <Badge colorPalette="red" size="sm">
            ✕
          </Badge>
        </HStack>
      );
    }

    // Show "0" badge only if connected, no error, AND we've confirmed there are no stacks
    if (connected && !error && stacks.length === 0) {
      return (
        <HStack gap="2">
          <Text>Docker</Text>
          <Badge colorPalette="gray" size="sm">
            0
          </Badge>
        </HStack>
      );
    }

    // Show color-coded badges for stack status when we have actual stack data
    if (connected && stacks.length > 0) {
      return (
        <HStack gap="2">
          <Text>Docker</Text>
          {stackStats.running > 0 && (
            <Badge colorPalette="green" size="sm">
              {stackStats.running}
            </Badge>
          )}
          {stackStats.partial > 0 && (
            <Badge colorPalette="yellow" size="sm">
              {stackStats.partial}
            </Badge>
          )}
          {stackStats.stopped > 0 && (
            <Badge colorPalette="red" size="sm">
              {stackStats.stopped}
            </Badge>
          )}
        </HStack>
      );
    }

    // Fallback: show spinner for any uncertain states
    return (
      <HStack gap="2">
        <Text>Docker</Text>
        <Spinner size="sm" color="brand.onSurfaceVariant" />
      </HStack>
    );
  };

  const dockerModule: ModuleGroup = {
    key: "docker-overview",
    label: "Docker", // Will be overridden by custom label
    icon: Container,
    items: dockerModuleItems,
  };

  return (
    <Stack
      h="100dvh"
      justify="space-between"
      bg="brand.primary"
      color="brand.onPrimary"
      borderRightWidth="1px"
      borderColor="brand.subtle"
      p="6"
      overflowY="auto"
      maxW="10dvw"
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
              color="brand.onPrimary"
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
                  onClick={() =>
                    isPageEnabled(link.key) ? onNavigate(link.key) : undefined
                  }
                  disabled={!isPageEnabled(link.key)}
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
              color="brand.onPrimary"
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
                label={getDockerLabel()} // Use custom label with badges/spinner
                items={dockerModule.items}
                isOpen={openModule === "Docker"} // Use consistent string
                onToggle={() => handleModuleToggle("Docker")}
                isMainActive={currentPage === dockerModule.key}
                onHeaderClick={() => onNavigate(dockerModule.key)}
                onItemClick={handleDockerItemClick}
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
                  onHeaderClick={() =>
                    isPageEnabled(module.key)
                      ? onNavigate(module.key)
                      : undefined
                  }
                  disabled={!isPageEnabled(module.key)}
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
            <SidebarLink disabled={true}>
              <HelpCircle size="16" /> Help Center
            </SidebarLink>
            <SidebarLink disabled={true}>
              <Settings size="16" /> Settings
            </SidebarLink>
          </Stack>
        </Box>
        <UserProfile />
      </Stack>
    </Stack>
  );
};
