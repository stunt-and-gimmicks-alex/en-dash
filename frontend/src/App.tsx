// src/App.tsx - Clean router-based App replacing the Layout switch statement
import React from "react";
import { Box } from "@chakra-ui/react";

// We'll need to install react-router-dom first
// Run: npm install react-router-dom @types/react-router-dom

// For now, let's create a cleaner version using a simplified router pattern
// This eliminates the giant switch statement in Layout.tsx

// Clean page component imports
import { DashboardPage } from "@/pages/DashboardPage";
import { SystemMonitorPage } from "@/pages/DashboardPage";
import { DockerOverviewPage } from "@/pages/DashboardPage";
import { StoragePage } from "@/pages/DashboardPage";
import { ProcessesPage } from "@/pages/DashboardPage";
import { NetworkPage } from "@/pages/DashboardPage";
import { SecurityPage } from "@/pages/DashboardPage";
import { DatabasesPage } from "@/pages/DashboardPage";
import { WebServicesPage } from "@/pages/DashboardPage";
import { MonitoringPage } from "@/pages/DashboardPage";

// Clean layout components
import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";

// Define our page types (moved from Layout.tsx)
export type PageKey =
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

// Page configuration - much cleaner than switch statements
const PAGE_CONFIG = {
  dashboard: {
    component: DashboardPage,
    title: "Server Dashboard",
    description: "Overview of your home server status, performance metrics, and system health."
  },
  "system-monitor": {
    component: SystemMonitorPage,
    title: "System Monitor",
    description: "Real-time monitoring of CPU, memory, disk usage, and system performance metrics."
  },
  "docker-overview": {
    component: DockerOverviewPage,
    title: "Docker Management",
    description: "Professional Docker Compose management with real-time monitoring, seamless deployments, and enterprise-grade reliability."
  },
  storage: {
    component: StoragePage,
    title: "Storage Management",
    description: "Manage disk space, volumes, and storage allocation across your server."
  },
  processes: {
    component: ProcessesPage,
    title: "Process Manager",
    description: "View and manage running processes, services, and system resources."
  },
  network: {
    component: NetworkPage,
    title: "Network Configuration",
    description: "Configure network settings, ports, and connectivity options."
  },
  security: {
    component: SecurityPage,
    title: "Security Center",
    description: "Monitor security events, manage access controls, and system hardening."
  },
  "databases-overview": {
    component: DatabasesPage,
    title: "Database Management",
    description: "Manage MySQL, PostgreSQL, Redis, and other database services."
  },
  "web-services-overview": {
    component: WebServicesPage,
    title: "Web Services",
    description: "Configure web servers, SSL certificates, and virtual hosts."
  },
  "monitoring-overview": {
    component: MonitoringPage,
    title: "System Monitoring",
    description: "Advanced monitoring, alerting, and logging for your entire infrastructure."
  }
} as const;

const App: React.FC = () => {
  // Simple state-based routing for now (we'll upgrade to React Router next)
  const [currentPage, setCurrentPage] = useState<PageKey>("dashboard");

  // Get the current page configuration
  const pageConfig = PAGE_CONFIG[currentPage];
  const PageComponent = pageConfig.component;

  const handlePageChange = (page: PageKey) => {
    setCurrentPage(page);
    // Later we'll replace this with navigate() from React Router
    console.log(`Navigating to: ${page}`);
  };

  return (
    <Box minH="100vh" bg="brand.surfaceContainerLowest">
      <AppLayout
        currentPage={currentPage}
        onPageChange={handlePageChange}
        pageTitle={pageConfig.title}
        pageDescription={pageConfig.description}
      >
        {/* Clean page rendering - no more switch statements! */}
        <PageComponent />
      </AppLayout>
    </Box>
  );
};

export default App;




Just as a note, I have "@/" bound to app home, so instead of "./pages.DashboardPage", we can use "@/pages/DashboardPage"

Alright. I've updated the files in github and synced them with the project knowledge. Let's start with App.tsx? As a note, I am using ChakraUI v3, whereas your training data ends at ChakraUI v2, so a lot of the framework has changed (for the better -- it's faster and much more opinionated not). So before changing any Chakra-related stuff, either check the docs - https://chakra-ui.com/docs/ - or else ask me to supply documentation for a specific component.