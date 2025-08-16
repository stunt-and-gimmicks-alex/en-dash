// NewDockerApplicationDrawerServices.tsx - Single service configuration drawer

import { useState, useEffect, useRef } from "react";
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
  Combobox,
  useCombobox,
  Portal,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";
import { SelectField } from "./NewDockerApplicationDrawerFields";
import { PropertySection } from "./NewDockerApplicationDrawerPropSection";
import { PiPlus, PiX } from "react-icons/pi";
import { SmartTagInput } from "../../small/SmartTagInput";

import { FilterableCombobox } from "../../small/ServiceSelectorComboBox";

// =============================================================================
// MOCK DATA - Move to API later
// =============================================================================

interface DockerService {
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
      suggested_roles: ["database"],
      image: "surrealdb/surrealdb:latest",
      popularity_score: 75, // ADD THIS
    },
    {
      id: "postgres",
      service_name: "PostgreSQL",
      suggested_roles: ["database"],
      image: "postgres:16",
      popularity_score: 95, // ADD THIS
    },
    {
      id: "redis",
      service_name: "Redis",
      suggested_roles: ["cache"],
      image: "redis:7-alpine",
      popularity_score: 90, // ADD THIS
    },
    {
      id: "nginx",
      service_name: "NGINX",
      suggested_roles: ["web-server", "proxy"],
      image: "nginx:alpine",
      popularity_score: 88, // ADD THIS
    },
  ];

  const filteredServices = MOCK_DOCKER_SERVICES.filter((service) =>
    service.suggested_roles.includes(selectedRole)
  ).map((service) => ({
    label: service.service_name,
    value: service.id,
    data: service,
  }));

  const { contains } = useFilter({ sensitivity: "base" });

  const { collection, filter } = useListCollection({
    initialItems: filteredServices,
    filter: contains,
  });

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
          <PropertySection title="Service Selection">
            {(() => {
              const [inputValue, setInputValue] = useState("");
              const { collection, set } = useListCollection({
                initialItems: DOCKER_ROLES,
                itemToString: (item) => item.label,
                itemToValue: (item) => item.value,
              });

              const combobox = useCombobox({
                collection,
                value: selectedRole ? [selectedRole] : [],
                placeholder: "Select a service role...",
                inputValue,
                onInputValueChange: (e) => setInputValue(e.inputValue),
                onValueChange: (details) => {
                  const value = details.value?.[0] || "";
                  console.log("Role selected:", value);
                  setSelectedRole(value);
                },
              });

              // Rehydrate the value when selectedRole changes externally
              const hydrated = useRef(false);
              if (selectedRole && collection.size && !hydrated.current) {
                combobox.syncSelectedItems();
                hydrated.current = true;
              }

              return (
                <Combobox.RootProvider value={combobox} width="full">
                  <Combobox.Label>Service Role</Combobox.Label>
                  <Combobox.Control>
                    <Combobox.Input placeholder="Select a service role..." />
                    <Combobox.IndicatorGroup>
                      <Combobox.ClearTrigger />
                      <Combobox.Trigger />
                    </Combobox.IndicatorGroup>
                  </Combobox.Control>
                  <Portal>
                    <Combobox.Positioner>
                      <Combobox.Content>
                        <Combobox.Empty>No roles found</Combobox.Empty>
                        {collection.items.map((item) => (
                          <Combobox.Item key={item.value} item={item}>
                            {item.label}
                            <Combobox.ItemIndicator />
                          </Combobox.Item>
                        ))}
                      </Combobox.Content>
                    </Combobox.Positioner>
                  </Portal>
                </Combobox.RootProvider>
              );
            })()}

            {/* Service Selection Combobox - Only show if role is selected */}
            {selectedRole &&
              (() => {
                const filteredServices = MOCK_DOCKER_SERVICES.filter(
                  (service) => service.suggested_roles.includes(selectedRole)
                ).map((service) => ({
                  label: service.service_name,
                  value: service.id,
                  data: service,
                }));

                const [inputValue, setInputValue] = useState("");
                const { collection, set } = useListCollection({
                  initialItems: filteredServices,
                  itemToString: (item) => item.label,
                  itemToValue: (item) => item.value,
                });

                const combobox = useCombobox({
                  collection,
                  value: selectedDockerService
                    ? [selectedDockerService.id]
                    : [],
                  placeholder: "Choose from registry...",
                  inputValue,
                  onInputValueChange: (e) => setInputValue(e.inputValue),
                  onValueChange: (details) => {
                    const value = details.value?.[0] || "";
                    const selectedService = filteredServices.find(
                      (s) => s.value === value
                    );
                    console.log("Service selected:", value, selectedService);

                    if (selectedService) {
                      setSelectedDockerService(selectedService.data);
                      setServiceImage(selectedService.data.image);
                      setServiceName(selectedService.data.service_name);
                    }
                  },
                });

                // Rehydrate when selectedDockerService changes
                const hydrated = useRef(false);
                if (
                  selectedDockerService &&
                  collection.size &&
                  !hydrated.current
                ) {
                  combobox.syncSelectedItems();
                  hydrated.current = true;
                }

                return (
                  <Combobox.RootProvider value={combobox} width="full">
                    <Combobox.Label>
                      Available Services ({filteredServices.length} found)
                    </Combobox.Label>
                    <Combobox.Control>
                      <Combobox.Input placeholder="Choose from registry..." />
                      <Combobox.IndicatorGroup>
                        <Combobox.ClearTrigger />
                        <Combobox.Trigger />
                      </Combobox.IndicatorGroup>
                    </Combobox.Control>
                    <Portal>
                      <Combobox.Positioner>
                        <Combobox.Content>
                          <Combobox.Empty>No services found</Combobox.Empty>
                          {collection.items.map((item) => (
                            <Combobox.Item key={item.value} item={item}>
                              {item.label}
                              <Combobox.ItemIndicator />
                            </Combobox.Item>
                          ))}
                        </Combobox.Content>
                      </Combobox.Positioner>
                    </Portal>
                  </Combobox.RootProvider>
                );
              })()}

            {/* Manual image input as fallback */}
            <Field.Root orientation="horizontal" gap="10">
              <Field.Label color="fg.muted">Or Enter Custom Image</Field.Label>
              <Input
                size="sm"
                maxW="var(--max-width)"
                flex="1"
                value={serviceImage}
                placeholder="e.g., nginx:latest, custom/image:v1.0"
                onChange={(e) => setServiceImage(e.target.value)}
              />
            </Field.Root>
          </PropertySection>
          <PropertySection title="Basic Configuration">
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
