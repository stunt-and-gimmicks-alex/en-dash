// frontend/src/types/navigation.ts
// Updated navigation types with proper Docker page structure

export type PageKey =
  | "dashboard"
  | "system-monitor"
  | "storage"
  | "processes"
  | "network"
  | "security"
  | "docker-overview"
  | "docker-stack-detail"
  | "docker-stacks"
  | "new-docker-application"
  | "databases-overview"
  | "web-services-overview"
  | "monitoring-overview";

export interface NavigationItem {
  key: PageKey;
  label: string;
  icon: any; // Lucide icon component
  description?: string;
}

export interface ModuleGroup {
  key: PageKey;
  label: string;
  icon: any; // Lucide icon component
  items: string[];
  description?: string;
  isLive?: boolean; // Whether it uses live data
}

export interface NavigationProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey, stackData?: any) => void; //
}

// Page configuration for titles/descriptions
export const PAGE_CONFIG: Record<
  PageKey,
  { title: string; description: string }
> = {
  dashboard: {
    title: "Server Dashboard",
    description:
      "Overview of your home server status, performance metrics, and system health.",
  },
  "system-monitor": {
    title: "System Monitor",
    description:
      "Real-time monitoring of CPU, memory, disk usage, and system performance metrics.",
  },
  "docker-overview": {
    title: "Docker Overview",
    description:
      "Docker system status, resource usage, and quick actions for container management.",
  },
  "docker-stacks": {
    title: "Docker Stacks",
    description:
      "Professional Docker Compose stack management with real-time monitoring and deployments.",
  },
  "docker-stack-detail": {
    title: "Stack Details",
    description: "Detailed view and management of a Docker stack application.",
  },
  "new-docker-application": {
    title: "Create New Docker Application",
    description: "Create a new Docker application.",
  },
  storage: {
    title: "Storage Management",
    description:
      "Manage disk space, volumes, and storage allocation across your server.",
  },
  processes: {
    title: "Process Manager",
    description:
      "View and manage running processes, services, and system resources.",
  },
  network: {
    title: "Network Configuration",
    description: "Configure network settings, ports, and connectivity options.",
  },
  security: {
    title: "Security Center",
    description:
      "Monitor security events, manage access controls, and system hardening.",
  },
  "databases-overview": {
    title: "Database Management",
    description:
      "Manage MySQL, PostgreSQL, Redis, and other database services.",
  },
  "web-services-overview": {
    title: "Web Services",
    description: "Configure web servers, SSL certificates, and virtual hosts.",
  },
  "monitoring-overview": {
    title: "System Monitoring",
    description:
      "Advanced monitoring, alerting, and logging for your entire infrastructure.",
  },
} as const;
