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
import { useStacks, useStackActions } from "@/hooks/v06-stackHooks";

import type {
  NavigationProps,
  NavigationItem,
  ModuleGroup,
  PageKey,
} from "@/types/navigation";
import type { EnhancedUnifiedStack } from "@/types/unified";

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

export const Sidebar: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
}) => {
  const [openModule, setOpenModule] = useState<string | null>("Docker");

  // FIXED: Using v06 hooks correctly
  const { stacks, connected, connecting, error } = useStacks();
  const { isPerformingAction } = useStackActions();

  // Helper function to check if a page exists
  const isPageEnabled = (pageKey: PageKey): boolean => {
    return EXISTING_PAGES.includes(pageKey);
  };

  // Handle module toggle
  const handleModuleToggle = (moduleName: string) => {
    setOpenModule(openModule === moduleName ? null : moduleName);
  };

  // Handle Docker item clicks with mapping
  const handleDockerItemClick = (item: string) => {
    console.log("🐳 Docker item clicked:", item);

    // Map Docker items to navigation pages
    switch (item) {
      case "Stacks":
        console.log("🔍 Mapping Stacks → docker-stacks");
        onNavigate("docker-stacks");
        break;
      case "Containers":
        console.log("🔍 Mapping Containers → docker-containers");
        // onNavigate("docker-containers"); // Enable when page exists
        break;
      case "Images":
        console.log("🔍 Mapping Images → docker-images");
        // onNavigate("docker-images"); // Enable when page exists
        break;
      case "Networks":
        console.log("🔍 Mapping Networks → docker-networks");
        // onNavigate("docker-networks"); // Enable when page exists
        break;
      case "Volumes":
        console.log("🔍 Mapping Volumes → docker-volumes");
        // onNavigate("docker-volumes"); // Enable when page exists
        break;
      default:
        console.log("🔍 Unknown Docker item:", item);
    }
  };

  // Generate Docker module label with real-time data
  const getDockerLabel = (): React.ReactNode => {
    // FIXED: Check for actual data instead of unreliable connecting state
    if (error) {
      return (
        <HStack gap="2">
          <Text>Docker</Text>
          <Badge colorScheme="red" size="xs">
            Error
          </Badge>
        </HStack>
      );
    }

    if (stacks && stacks.length > 0) {
      // We have data - show the actual counts
      const runningStacks = stacks.filter(
        (stack: EnhancedUnifiedStack) => stack.status === "running"
      ).length;

      return (
        <HStack gap="2">
          <Text>Docker</Text>
          <Badge colorScheme="green" size="xs">
            {runningStacks}/{stacks.length}
          </Badge>
        </HStack>
      );
    }

    // No data yet - show loading spinner
    return (
      <HStack gap="2">
        <Text>Docker</Text>
        <Spinner size="xs" color="brand.onPrimary" />
      </HStack>
    );
  };

  // Docker module configuration
  const dockerModule = {
    key: "docker-overview" as PageKey,
    label: "Docker",
    icon: Container,
    items: ["Stacks", "Containers", "Images", "Networks", "Volumes"],
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
      {/* Main navigation */}
      <Stack gap="6" flex="1" overflowY="auto">
        {/* Logo */}
        <Box px="2">
          <Logo />
        </Box>

        {/* Search */}
        <Box px="1">
          <SearchField />
        </Box>

        <Stack gap="6" flex="1">
          {/* Server Links */}
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
                  onClick={
                    isPageEnabled(link.key)
                      ? () => onNavigate(link.key)
                      : undefined
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
                currentPage={currentPage}
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
                  currentPage={currentPage}
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
