// frontend/src/App.tsx
// Clean App component using centralized navigation types

import React, { useState } from "react";
import { Box } from "@chakra-ui/react";

// Clean imports using centralized types
import type { PageKey } from "@/types/navigation";
import { PAGE_CONFIG } from "@/types/navigation";

// Page components
import { DashboardPage } from "@/pages/DashboardPage";
import { SystemMonitorPage } from "@/pages/SystemMonitorPage";
import { DockerOverviewPage } from "@/pages/DockerOverviewPage";
import { DockerStacksPage } from "@/pages/DockerStacksPage";
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
    <Box minH="100vh" bg="brand.surfaceContainerLowest">
      <AppLayout
        currentPage={currentPage}
        onNavigate={handlePageChange}
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
