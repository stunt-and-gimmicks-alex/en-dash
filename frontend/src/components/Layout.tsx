// src/components/Layout.tsx - Updated with working navigation system
import React, { useState } from "react";
import { Container, Flex, Stack, Box, Text } from "@chakra-ui/react";
import { ColorModeButton } from "@/components/ui/color-mode";
import { Navbar } from "./sidebar/Navbar";
import { Sidebar } from "./sidebar/Sidebar";
import { HeaderStatsBlock } from "./HeaderStatsBlock";
import { DockerOverview } from "./pages/DockerOverview";

// Define navigation state type
export type CurrentPage =
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

// Keep the placeholder components for pages we haven't built yet
export interface ContentPlaceholderProps {
  minH?: string | number;
  maxW?: string | { base?: string; lg?: string; md?: string };
  borderWidth?: string;
  borderBottomWidth?: string;
  borderRightWidth?: string;
  position?: string;
  top?: string;
  height?: string;
  flex?: string;
  children?: React.ReactNode;
  pageName?: string;
  [key: string]: any;
}

export const ContentPlaceholder: React.FC<ContentPlaceholderProps> = ({
  pageName = "Page",
  ...props
}) => (
  <Box
    {...props}
    bg={{ base: "gray.50", _dark: "gray.800" }}
    border="1px solid"
    borderColor={{ base: "gray.200", _dark: "gray.700" }}
    display="flex"
    w="100%"
    backgroundImage={`url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.2' fillRule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`}
    backgroundClip="padding-box"
    alignItems="center"
    justifyContent="center"
    flexDirection="column"
    gap="4"
  >
    <Text
      fontSize="xl"
      fontWeight="bold"
      color={{ base: "gray.600", _dark: "gray.400" }}
    >
      {pageName}
    </Text>
    <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.500" }}>
      This page is coming soon...
    </Text>
  </Box>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Box p="2">
    <Text
      color={{ base: "gray.500", _dark: "gray.400" }}
      fontWeight="medium"
      fontSize="sm"
      whiteSpace="nowrap"
    >
      {children}
    </Text>
  </Box>
);

export const Column: React.FC<ContentPlaceholderProps> = (props) => {
  return (
    <ContentPlaceholder
      borderWidth="1px"
      maxW={{ base: "full", lg: "sm" }}
      minH="40"
      {...props}
    >
      <Label>Column</Label>
    </ContentPlaceholder>
  );
};

export const Content: React.FC<ContentPlaceholderProps> = (props) => {
  return (
    <ContentPlaceholder minH="2xl" borderWidth="1px" {...props}>
      <Label>Content</Label>
    </ContentPlaceholder>
  );
};

// Component to render the appropriate page content in column/content layout
const PageContent: React.FC<{ currentPage: CurrentPage }> = ({
  currentPage,
}) => {
  switch (currentPage) {
    case "dashboard":
      return (
        <>
          <Column />
          <Content />
        </>
      );
    case "system-monitor":
      return (
        <>
          <Column />
          <Content />
        </>
      );
    case "storage":
      return (
        <>
          <Column />
          <Content />
        </>
      );
    case "processes":
      return (
        <>
          <Column />
          <Content />
        </>
      );
    case "network":
      return (
        <>
          <Column />
          <Content />
        </>
      );
    case "security":
      return (
        <>
          <Column />
          <Content />
        </>
      );
    case "docker-overview":
      return <DockerOverview />;
    case "databases-overview":
      return (
        <>
          <Column />
          <Content />
        </>
      );
    case "web-services-overview":
      return (
        <>
          <Column />
          <Content />
        </>
      );
    case "monitoring-overview":
      return (
        <>
          <Column />
          <Content />
        </>
      );
    default:
      return (
        <>
          <Column />
          <Content />
        </>
      );
  }
};

// Updated Sidebar component props interface
interface SidebarProps {
  currentPage: CurrentPage;
  onNavigate: (page: CurrentPage) => void;
}

// Create a wrapper for the Sidebar that accepts the navigation props
const SidebarWithNavigation: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
}) => {
  return <Sidebar currentPage={currentPage} onNavigate={onNavigate} />;
};

// Main Layout Component
export const Layout: React.FC = () => {
  // Lift navigation state to Layout level
  const [currentPage, setCurrentPage] = useState<CurrentPage>("dashboard");

  const handleNavigation = (page: CurrentPage) => {
    setCurrentPage(page);
    console.log(`Navigating to: ${page}`);
  };

  // Get page title for HeaderStatsBlock
  const getPageTitle = (page: CurrentPage): string => {
    switch (page) {
      case "dashboard":
        return "Server Dashboard";
      case "system-monitor":
        return "System Monitor";
      case "storage":
        return "Storage Management";
      case "processes":
        return "Process Manager";
      case "network":
        return "Network Configuration";
      case "security":
        return "Security Center";
      case "docker-overview":
        return "Docker Management";
      case "databases-overview":
        return "Database Management";
      case "web-services-overview":
        return "Web Services";
      case "monitoring-overview":
        return "System Monitoring";
      default:
        return "Home Server Management";
    }
  };

  const getPageDescription = (page: CurrentPage): string => {
    switch (page) {
      case "dashboard":
        return "Overview of your home server status, performance metrics, and system health.";
      case "docker-overview":
        return "Professional Docker Compose management with real-time monitoring, seamless deployments, and enterprise-grade reliability.";
      case "system-monitor":
        return "Real-time monitoring of CPU, memory, disk usage, and system performance metrics.";
      case "storage":
        return "Manage disk space, volumes, and storage allocation across your server.";
      case "processes":
        return "View and manage running processes, services, and system resources.";
      case "network":
        return "Configure network settings, ports, and connectivity options.";
      case "security":
        return "Monitor security events, manage access controls, and system hardening.";
      case "databases-overview":
        return "Manage MySQL, PostgreSQL, Redis, and other database services.";
      case "web-services-overview":
        return "Configure web servers, SSL certificates, and virtual hosts.";
      case "monitoring-overview":
        return "Advanced monitoring, alerting, and logging for your entire infrastructure.";
      default:
        return "Professional home server management platform.";
    }
  };

  return (
    <Box minH="100vh" bg={{ base: "brandGrey.100", _dark: "brandGray.950" }}>
      {/* Color Mode Toggle */}
      <Box position="fixed" top="4" right="4" zIndex="1000">
        <ColorModeButton />
      </Box>

      {/* Navbar - show only on mobile */}
      <Box display={{ base: "block", md: "none" }}>
        <Navbar />
      </Box>

      <Flex flex="1" minH="100vh">
        {/* Sidebar - show only on desktop, pass navigation props */}
        <Box display={{ base: "none", md: "block" }}>
          <Box w="280px" minW="280px" position="sticky" top="0" height="100vh">
            <SidebarWithNavigation
              currentPage={currentPage}
              onNavigate={handleNavigation}
            />
          </Box>
        </Box>

        <Stack gap="0" flex="1" alignItems="stretch">
          {/* Dynamic Header Stats Block */}
          <HeaderStatsBlock
            title={getPageTitle(currentPage)}
            description={getPageDescription(currentPage)}
          />

          {/* Main Content Area - restored original layout */}
          <Container display="flex" flex="1" maxW="full" py="8">
            <Stack gap="8" direction={{ base: "column", lg: "row" }} flex="1">
              <PageContent currentPage={currentPage} />
            </Stack>
          </Container>
        </Stack>
      </Flex>
    </Box>
  );
};

export default Layout;
