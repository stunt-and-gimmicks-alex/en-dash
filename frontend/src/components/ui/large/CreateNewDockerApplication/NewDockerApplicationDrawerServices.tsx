// NewDockerApplicationDrawerServices.tsx - Single service configuration drawer

import { useState, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";
import {
  Button,
  Drawer,
  Stack,
  HStack,
  Text,
  IconButton,
  CloseButton,
  Input,
  Field,
} from "@chakra-ui/react";
import { SelectField } from "./NewDockerApplicationDrawerFields";
import { PropertySection } from "./NewDockerApplicationDrawerPropSection";
import { PiPlus, PiX } from "react-icons/pi";
import { SmartTagInput } from "../../small/SmartTagInput";

import { FilterableCombobox } from "../../small/ServiceSelectorComboBox";

// =============================================================================
// MOCK DATA - Move to API later
// =============================================================================
const DOCKER_ROLES = [
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

const MOCK_DOCKER_SERVICES = [
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

// Helper function to filter services by role
const useServiceComboboxData = (
  services: typeof MOCK_DOCKER_SERVICES,
  selectedRole?: string
) => {
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
};

interface ServiceDrawerProps {
  serviceId?: string; // If provided, we're editing; if not, we're creating
  onClose?: () => void;
}

export const NewDockDrawerServices = ({
  serviceId,
  onClose,
}: ServiceDrawerProps = {}) => {
  const { newStack, setNewStack } = useNewStackStore();

  // Service state
  const [serviceName, setServiceName] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedDockerService, setSelectedDockerService] =
    useState<DockerService | null>(null);
  const [serviceImage, setServiceImage] = useState("");
  const [serviceRestart, setServiceRestart] = useState("unless-stopped");
  const [servicePorts, setServicePorts] = useState<string[]>([]);
  const [serviceEnvironment, setServiceEnvironment] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceTags, setServiceTags] = useState<string[]>([]);

  const isEditing = !!serviceId;

  // Load existing service data if editing
  useEffect(() => {
    if (serviceId && newStack.services?.[serviceId]) {
      const service = newStack.services[serviceId];
      setServiceName(service.name || serviceId);
      setServiceImage(service.image || "");
      setServiceRestart(service.restart || "unless-stopped");
      setServicePorts(service.ports || []);

      // Convert environment object to key-value pairs
      const envPairs = service.environment
        ? Object.entries(service.environment).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        : [];
      setServiceEnvironment(envPairs);

      // Load x-meta if it exists
      setServiceCategory(service["x-meta"]?.category || "");
      setServiceTags(service["x-meta"]?.tags || []);
    } else {
      // Reset for new service
      setServiceName("");
      setServiceImage("");
      setServiceRestart("unless-stopped");
      setServicePorts([]);
      setServiceEnvironment([]);
      setServiceCategory("");
      setServiceTags([]);
    }
  }, [serviceId, newStack.services]);

  const handleSave = () => {
    if (!serviceName.trim() || !serviceImage.trim()) return;

    const finalServiceId =
      serviceId || serviceName.toLowerCase().replace(/[^a-z0-9]/g, "_");

    // Convert environment pairs back to object
    const environmentObj = serviceEnvironment.reduce((acc, { key, value }) => {
      if (key.trim()) {
        acc[key.trim()] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    setNewStack((stack) => {
      if (!stack.services) stack.services = {};

      stack.services[finalServiceId] = {
        name: serviceName,
        image: serviceImage,
        restart: serviceRestart || "unless-stopped",
        ports: servicePorts.filter((port) => port.trim()),
        environment: environmentObj,
        "x-meta": {
          category: serviceCategory,
          tags: serviceTags.filter((tag) => tag.trim()),
        },
      };
    });

    onClose?.();
  };

  const addPort = () => {
    setServicePorts([...servicePorts, ""]);
  };

  const updatePort = (index: number, value: string) => {
    const newPorts = [...servicePorts];
    newPorts[index] = value;
    setServicePorts(newPorts);
  };

  const removePort = (index: number) => {
    setServicePorts(servicePorts.filter((_, i) => i !== index));
  };

  const addEnvironmentVar = () => {
    setServiceEnvironment([...serviceEnvironment, { key: "", value: "" }]);
  };

  const updateEnvironmentVar = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newEnv = [...serviceEnvironment];
    newEnv[index][field] = value;
    setServiceEnvironment(newEnv);
  };

  const removeEnvironmentVar = (index: number) => {
    setServiceEnvironment(serviceEnvironment.filter((_, i) => i !== index));
  };

  const addTag = () => {
    setServiceTags([...serviceTags, ""]);
  };

  const updateTag = (index: number, value: string) => {
    const newTags = [...serviceTags];
    newTags[index] = value;
    setServiceTags(newTags);
  };

  const removeTag = (index: number) => {
    setServiceTags(serviceTags.filter((_, i) => i !== index));
  };

  const restartOptions = [
    { value: "no", label: "No restart" },
    { value: "always", label: "Always restart" },
    { value: "unless-stopped", label: "Unless stopped" },
    { value: "on-failure", label: "On failure" },
  ];

  const serviceCategoryOptions = [
    { value: "", label: "Select a category..." },
    { value: "proxy", label: "Proxy" },
    { value: "media-player", label: "Media Player" },
    { value: "devops", label: "DevOps" },
    { value: "database", label: "Database" },
    { value: "web-server", label: "Web Server" },
    { value: "monitoring", label: "Monitoring" },
    { value: "security", label: "Security" },
    { value: "storage", label: "Storage" },
    { value: "communication", label: "Communication" },
    { value: "productivity", label: "Productivity" },
    { value: "development", label: "Development" },
  ];

  const serviceItems = useServiceComboboxData(
    MOCK_DOCKER_SERVICES,
    selectedRole
  );

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>
          {isEditing
            ? `Edit Service: ${serviceName}`
            : "Add New Docker Service"}
        </Drawer.Title>
      </Drawer.Header>

      <Drawer.Body colorPalette="secondaryBrand">
        <Stack px="4" pt="4" pb="6" gap="6">
          <PropertySection title="Basic Configuration">
            {/*}
            <Field.Root orientation="horizontal" gap="10">
              <Field.Label color="fg.muted">Service Name</Field.Label>
              <Input
                size="sm"
                maxW="var(--max-width)"
                flex="1"
                value={serviceName}
                placeholder="e.g., web, database, redis"
                onChange={(e) => setServiceName(e.target.value)}
              />
            </Field.Root>
            */}

            <FilterableCombobox
              items={DOCKER_ROLES}
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value || "")}
              label="Service Role"
              placeholder="Select a service role..."
            />

            {selectedRole && (
              <FilterableCombobox
                items={serviceItems}
                value={selectedDockerService?.id}
                onValueChange={(value, item) => {
                  setSelectedDockerService(item?.data || null);
                  if (item?.data) {
                    setServiceImage(item.data.image);
                  }
                }}
                label="Available Services"
                placeholder="Choose from registry..."
              />
            )}

            <SelectField
              label="Restart Policy"
              options={restartOptions}
              defaultValue={serviceRestart}
              onChange={(e) => setServiceRestart(e.target.value)}
            />
          </PropertySection>

          {/* Metadata Section */}
          <PropertySection title="Organization & Metadata">
            <SelectField
              label="Service Category"
              options={serviceCategoryOptions}
              defaultValue={serviceCategory}
              onChange={(e) => setServiceCategory(e.target.value)}
            />

            <Stack gap="2">
              <SmartTagInput
                label="Service Tags"
                value={serviceTags}
                onChange={setServiceTags}
                placeholder="Enter service tags like: frontend, api, cache..."
                maxTags={5}
                size="sm"
              />
            </Stack>
          </PropertySection>

          {/* Port Configuration */}
          <PropertySection title="Port Mappings">
            <Stack gap="3">
              <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">
                  Map container ports to host ports (format: host:container)
                </Text>
                <Button size="xs" variant="ghost" onClick={addPort}>
                  <PiPlus />
                </Button>
              </HStack>

              <Stack gap="2">
                {servicePorts.map((port, index) => (
                  <HStack key={index} gap="2">
                    <Field.Root orientation="horizontal" gap="10" flex="1">
                      <Input
                        size="sm"
                        flex="1"
                        value={port}
                        placeholder="8080:80"
                        onChange={(e) => updatePort(index, e.target.value)}
                      />
                    </Field.Root>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => removePort(index)}
                    >
                      <PiX />
                    </IconButton>
                  </HStack>
                ))}

                {servicePorts.length === 0 && (
                  <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                    No port mappings configured
                  </Text>
                )}
              </Stack>
            </Stack>
          </PropertySection>

          {/* Environment Variables */}
          <PropertySection title="Environment Variables">
            <Stack gap="3">
              <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">
                  Set environment variables for the container
                </Text>
                <Button size="xs" variant="ghost" onClick={addEnvironmentVar}>
                  <PiPlus />
                </Button>
              </HStack>

              <Stack gap="2">
                {serviceEnvironment.map((env, index) => (
                  <HStack key={index} gap="2">
                    <Input
                      size="sm"
                      flex="1"
                      value={env.key}
                      placeholder="VARIABLE_NAME"
                      onChange={(e) =>
                        updateEnvironmentVar(index, "key", e.target.value)
                      }
                    />
                    <Text fontSize="sm" color="fg.muted">
                      =
                    </Text>
                    <Input
                      size="sm"
                      flex="1"
                      value={env.value}
                      placeholder="value"
                      onChange={(e) =>
                        updateEnvironmentVar(index, "value", e.target.value)
                      }
                    />
                    <IconButton
                      size="sm"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => removeEnvironmentVar(index)}
                    >
                      <PiX />
                    </IconButton>
                  </HStack>
                ))}

                {serviceEnvironment.length === 0 && (
                  <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                    No environment variables configured
                  </Text>
                )}
              </Stack>
            </Stack>
          </PropertySection>
        </Stack>
      </Drawer.Body>

      <Drawer.Footer gap="3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          colorPalette="brand"
          disabled={!serviceName.trim() || !serviceImage.trim()}
          onClick={handleSave}
        >
          {isEditing ? "Update Service" : "Add Service"}
        </Button>
      </Drawer.Footer>

      <Drawer.CloseTrigger asChild>
        <CloseButton size="sm" />
      </Drawer.CloseTrigger>
    </>
  );
};
