// FilterableCombobox.tsx - Fixed implementation following ChakraUI v3 patterns
// Based on https://chakra-ui.com/docs/components/combobox

import { useMemo } from "react";
import {
  Combobox,
  Portal,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";

// =============================================================================
// GENERIC TYPES - Reusable for any data
// =============================================================================
export interface ComboboxItem {
  value: string;
  label: string;
  disabled?: boolean;
  data?: any; // Allow arbitrary data attachment
}

export interface FilterableComboboxProps {
  items: ComboboxItem[];
  value?: string;
  onValueChange?: (value: string | null, item: ComboboxItem | null) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "outline" | "subtle" | "flushed";
  width?: string;
  filterEnabled?: boolean;
  emptyMessage?: string;
}

// =============================================================================
// MAIN COMPONENT - Following ChakraUI v3 patterns exactly
// =============================================================================
export const FilterableCombobox: React.FC<FilterableComboboxProps> = ({
  items,
  value,
  onValueChange,
  placeholder = "Select an option...",
  label,
  disabled = false,
  size = "sm",
  variant = "outline",
  width = "full",
  filterEnabled = true,
  emptyMessage = "No items found",
}) => {
  // ChakraUI v3 filtering hook
  const { contains } = useFilter({ sensitivity: "base" });

  // Create collection with proper filtering
  const { collection, filter } = useListCollection({
    initialItems: items,
    filter: filterEnabled ? contains : undefined,
  });

  // Handle selection changes - ChakraUI v3 way
  const handleValueChange = (details: any) => {
    const selectedValue = details.value?.[0] || null;
    const selectedItem = selectedValue
      ? items.find((item) => item.value === selectedValue) || null
      : null;

    console.log("FilterableCombobox handleValueChange:", {
      details,
      selectedValue,
      selectedItem,
    });

    onValueChange?.(selectedValue, selectedItem);
  };

  // Handle input changes for filtering
  const handleInputValueChange = (details: any) => {
    if (filterEnabled) {
      filter(details.inputValue);
    }
  };

  console.log("FilterableCombobox render:", {
    value,
    items: items.length,
    collection: collection.items.length,
  });

  return (
    <Combobox.Root
      collection={collection}
      value={value ? [value] : []} // ChakraUI v3 expects array
      onValueChange={handleValueChange}
      onInputValueChange={handleInputValueChange}
      disabled={disabled}
      size={size}
      variant={variant}
      width={width}
    >
      {label && <Combobox.Label>{label}</Combobox.Label>}
      <Combobox.Control>
        <Combobox.Input placeholder={placeholder} />
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content>
            <Combobox.Empty>{emptyMessage}</Combobox.Empty>
            {collection.items.map((item) => (
              <Combobox.Item item={item} key={item.value}>
                {item.label}
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  );
};

// =============================================================================
// SERVICE-SPECIFIC TYPES - For the Docker service use case
// =============================================================================
export interface DockerService {
  id: string;
  service_name: string;
  suggested_roles: string[];
  image: string;
  description: string;
  category: string;
  tags: string[];
  default_ports: string[];
  environment_vars: Array<{
    key: string;
    description: string;
    required: boolean;
  }>;
  github_url?: string;
  docker_hub_url?: string;
  updated_at: string;
  popularity_score: number;
}

// =============================================================================
// SERVICE SELECTOR LOGIC - Converts services to combobox items
// =============================================================================
export const useServiceComboboxData = (
  services: DockerService[],
  selectedRole?: string
) => {
  return useMemo(() => {
    // Filter services by role if specified
    const filteredServices = selectedRole
      ? services.filter((service) =>
          service.suggested_roles.includes(selectedRole)
        )
      : services;

    // Sort by popularity score (highest first)
    const sortedServices = [...filteredServices].sort(
      (a, b) => b.popularity_score - a.popularity_score
    );

    // Convert to combobox items
    return sortedServices.map((service) => ({
      value: service.id,
      label: service.service_name,
      data: service, // Attach full service data
    }));
  }, [services, selectedRole]);
};

// =============================================================================
// ROLE SELECTOR DATA - Predefined roles
// =============================================================================
export const DOCKER_ROLES: ComboboxItem[] = [
  { value: "database", label: "Database" },
  { value: "web-server", label: "Web Server" },
  { value: "cache", label: "Cache / Memory Store" },
  { value: "proxy", label: "Reverse Proxy" },
  { value: "monitoring", label: "Monitoring & Observability" },
  { value: "storage", label: "File Storage & Backup" },
  { value: "development", label: "Development Tools" },
  { value: "communication", label: "Communication & Chat" },
  { value: "media", label: "Media Processing" },
  { value: "security", label: "Security & Authentication" },
  { value: "automation", label: "Automation & CI/CD" },
  { value: "analytics", label: "Analytics & Business Intelligence" },
];

// =============================================================================
// MOCK SERVICE DATA - TODO: Replace with API call
// =============================================================================
export const MOCK_DOCKER_SERVICES: DockerService[] = [
  {
    id: "surrealdb",
    service_name: "SurrealDB",
    suggested_roles: ["database", "primary-db", "analytics-db", "cache"],
    image: "surrealdb/surrealdb:latest",
    description:
      "Multi-model database for web, mobile, serverless, and traditional applications",
    category: "database",
    tags: ["database", "multi-model", "realtime", "graph"],
    default_ports: ["8000:8000"],
    environment_vars: [
      { key: "SURREAL_USER", description: "Database user", required: true },
      { key: "SURREAL_PASS", description: "Database password", required: true },
    ],
    github_url: "https://github.com/surrealdb/surrealdb",
    docker_hub_url: "https://hub.docker.com/r/surrealdb/surrealdb",
    updated_at: "2024-01-15T00:00:00Z",
    popularity_score: 75,
  },
  {
    id: "postgres",
    service_name: "PostgreSQL",
    suggested_roles: ["database", "primary-db", "analytics-db"],
    image: "postgres:16",
    description: "Advanced open source relational database",
    category: "database",
    tags: ["database", "sql", "relational", "acid"],
    default_ports: ["5432:5432"],
    environment_vars: [
      { key: "POSTGRES_DB", description: "Database name", required: true },
      { key: "POSTGRES_USER", description: "Database user", required: true },
      {
        key: "POSTGRES_PASSWORD",
        description: "Database password",
        required: true,
      },
    ],
    github_url: "https://github.com/postgres/postgres",
    docker_hub_url: "https://hub.docker.com/_/postgres",
    updated_at: "2024-01-10T00:00:00Z",
    popularity_score: 95,
  },
  {
    id: "redis",
    service_name: "Redis",
    suggested_roles: ["cache", "session-store", "message-broker"],
    image: "redis:7-alpine",
    description:
      "In-memory data structure store used as database, cache, and message broker",
    category: "cache",
    tags: ["cache", "memory", "session", "pubsub"],
    default_ports: ["6379:6379"],
    environment_vars: [
      { key: "REDIS_PASSWORD", description: "Redis password", required: false },
    ],
    github_url: "https://github.com/redis/redis",
    docker_hub_url: "https://hub.docker.com/_/redis",
    updated_at: "2024-01-12T00:00:00Z",
    popularity_score: 90,
  },
  {
    id: "nginx",
    service_name: "NGINX",
    suggested_roles: ["web-server", "proxy", "load-balancer"],
    image: "nginx:alpine",
    description: "High-performance HTTP server and reverse proxy",
    category: "web-server",
    tags: ["web-server", "proxy", "load-balancer", "http"],
    default_ports: ["80:80", "443:443"],
    environment_vars: [],
    github_url: "https://github.com/nginx/nginx",
    docker_hub_url: "https://hub.docker.com/_/nginx",
    updated_at: "2024-01-08T00:00:00Z",
    popularity_score: 88,
  },
];
