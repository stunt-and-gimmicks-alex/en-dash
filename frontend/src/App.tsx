// frontend/src/App.tsx
// Clean App component using navigation and refresh contexts

import React, { useState } from "react";
import { Box } from "@chakra-ui/react";

// Clean imports using centralized types
import type { PageKey } from "@/types/navigation";
import { PAGE_CONFIG } from "@/types/navigation";

// Contexts
import { NavigationProvider } from "@/contexts/NavigationContext";
import { RefreshProvider } from "@/contexts/RefreshContext";

// Page components
import { DashboardPage } from "@/pages/DashboardPage";
import { SystemMonitorPage } from "@/pages/SystemMonitorPage";
import { DockerOverviewPage } from "@/components/docker/pages/DockerOverviewPage";
import { DockerStacksPage } from "@/components/docker/pages/DockerStacksPage";
import { DockerStackDetailPage } from "@/components/docker/pages/DockerStackDetailPage";
import { NewDockerApplication } from "@/components/docker/pages/NewDockerAppPage";
import { StoragePage } from "@/pages/StoragePage";
import { ProcessesPage } from "@/pages/ProcessPage";
import { NetworkPage } from "@/pages/NetworkPage";
import { SecurityPage } from "@/pages/SecurityPage";
import { DatabasesPage } from "@/pages/DatabasesPage";
import { WebServicesPage } from "@/pages/WebServicesPage";
import { MonitoringPage } from "@/pages/MonitoringPage";

// Layout
import { AppLayout } from "@/components/layout/AppLayout";

// Page configuration - cleaner than switch statements
const PAGE_COMPONENTS: Record<PageKey, React.ComponentType> = {
  dashboard: DashboardPage,
  "system-monitor": SystemMonitorPage,
  "docker-overview": DockerOverviewPage,
  "docker-stacks": DockerStacksPage,
  "docker-stack-detail": DockerStackDetailPage,
  "new-docker-application": NewDockerApplication,
  storage: StoragePage,
  processes: ProcessesPage,
  network: NetworkPage,
  security: SecurityPage,
  "databases-overview": DatabasesPage,
  "web-services-overview": WebServicesPage,
  "monitoring-overview": MonitoringPage,
} as const;

const App: React.FC = () => {
  // Simple state-based routing (we'll upgrade to React Router later)
  const [currentPage, setCurrentPage] = useState<PageKey>("dashboard");

  // Get the current page configuration
  const pageConfig = PAGE_CONFIG[currentPage];
  const PageComponent = PAGE_COMPONENTS[currentPage];

  const handlePageChange = (page: PageKey) => {
    setCurrentPage(page);
    // Later we'll replace this with navigate() from React Router
    console.log(`Navigating to: ${page}`);
  };

  return (
    <RefreshProvider>
      <NavigationProvider
        currentPage={currentPage}
        onNavigate={handlePageChange}
      >
        <Box minH="100dvh" bg="brand.background">
          <AppLayout
            currentPage={currentPage}
            onNavigate={handlePageChange}
            pageTitle={pageConfig.title}
            pageDescription={pageConfig.description}
          >
            {/* Clean page rendering - no prop drilling needed! */}
            <PageComponent />
          </AppLayout>
        </Box>
      </NavigationProvider>
    </RefreshProvider>
  );
};

export default App;
