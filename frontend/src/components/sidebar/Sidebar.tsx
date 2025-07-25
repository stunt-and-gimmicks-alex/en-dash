// src/components/sidebar/Sidebar.tsx - Updated to use live Docker data with existing structure
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

// Static module groups (non-Docker)
const staticModuleGroups = [
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
  const [openModule, setOpenModule] = useState<string | null>(null); // Start with no modules open

  // Get live Docker stacks data
  const { stacks, loading, error } = useDockgeStacks();

  const handleModuleToggle = (moduleLabel: string) => {
    setOpenModule(openModule === moduleLabel ? null : moduleLabel);
  };

  // Transform stack data for ModuleDropdown component
  const getDockerItems = () => {
    if (loading) {
      return [{ name: "Loading stacks...", status: "inactive" as const }];
    }

    if (error) {
      return [
        { name: "Connection Error", status: "exited" as const },
        { name: "Using Fallback Mode", status: "inactive" as const },
      ];
    }

    if (stacks.length === 0) {
      return [{ name: "No stacks found", status: "inactive" as const }];
    }

    // Map actual stack data to the format expected by ModuleDropdown
    return stacks.map((stack) => ({
      name: stack.name,
      status: mapStackStatus(stack.status),
    }));
  };

  // Helper function to map stack status to ModuleDropdown status format
  const mapStackStatus = (status: string): "active" | "inactive" | "exited" => {
    switch (status) {
      case "running":
        return "active";
      case "stopped":
        return "inactive";
      case "error":
      case "partial":
        return "exited";
      case "starting":
      case "stopping":
        return "inactive"; // Show as inactive during transitions
      default:
        return "inactive";
    }
  };

  // Create Docker module with live data
  const dockerModule = {
    icon: Container,
    label: "Docker", // Clean label
    key: "docker-overview" as const,
    items: getDockerItems(),
    // Add connection status info for the label
    isLoading: loading,
    hasError: !!error,
  };

  return (
    <Stack
      flex="1"
      p={{ base: "4", md: "6" }}
      bg="brand.bg"
      borderRightWidth="1px"
      borderColor="brand.muted"
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
              color="brand.contrast"
              textTransform="uppercase"
              letterSpacing="wider"
              px="3"
            >
              Core
            </Text>
            <Stack gap="1">
              {serverLinks.map((link) => (
                <SidebarLink
                  key={link.key}
                  isActive={currentPage === link.key}
                  onClick={() => onNavigate(link.key)}
                  aria-current={currentPage === link.key ? "page" : undefined}
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
                label={`${dockerModule.label}${
                  loading ? " (Loading...)" : error ? " (Offline)" : ""
                }`}
                items={dockerModule.items}
                isOpen={openModule === dockerModule.label}
                onToggle={() => handleModuleToggle(dockerModule.label)}
                isMainActive={currentPage === "docker-overview"} // Explicitly check for docker-overview
                onHeaderClick={() => onNavigate("docker-overview")} // Explicitly navigate to docker-overview
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
