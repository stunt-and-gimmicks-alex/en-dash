// NewDockerApplicationDrawerServices.tsx - Clean slate for your implementation
"use client";

import React, { useState, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";
import {
  Button,
  Drawer,
  Stack,
  HStack,
  Span,
  IconButton,
  CloseButton,
  Input,
  Field,
} from "@chakra-ui/react";
import { PropertySection } from "./NewDockerApplicationDrawerPropSection";
import { PiPlus, PiX } from "react-icons/pi";

// Import test data from ServiceSelectorComboBox
import {
  MOCK_DOCKER_SERVICES,
  DOCKER_ROLES,
  OrgSwitcherMenu,
  ProjectSwitcherMenu,
} from "@/components/ui/small/ServiceSelectorComboBox";

import {
  type Organization,
  type Project,
  organizations,
} from "../../small/DataFetcher";

// =============================================================================
// INTERFACES
// =============================================================================
interface ServiceDrawerProps {
  serviceId?: string; // If provided, we're editing; if not, we're creating
  onClose?: () => void;
}

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

// =============================================================================
// MAIN DRAWER COMPONENT
// =============================================================================
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

  // Handle role selection (ready for your implementation)
  const handleRoleChange = (role: string) => {
    console.log("Role changed to:", role);
    setSelectedRole(role);
    // Reset service selection when role changes
    setSelectedDockerService(null);
    setServiceImage("");
    setServiceName("");
  };

  // Handle service selection (ready for your implementation)
  const handleServiceChange = (
    serviceId: string,
    service: DockerService | null
  ) => {
    console.log("Service changed to:", serviceId, service);
    setSelectedDockerService(service);
    if (service) {
      setServiceImage(service.image);
      setServiceName(service.service_name);
      setServiceCategory(service.category);
      setServiceTags(service.tags);

      // Set default ports if available
      if (service.default_ports.length > 0) {
        setServicePorts(service.default_ports);
      }
    }
  };

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

  // Helper functions for dynamic arrays
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

  const restartOptions = [
    { value: "no", label: "No restart" },
    { value: "always", label: "Always restart" },
    { value: "unless-stopped", label: "Unless stopped" },
    { value: "on-failure", label: "On failure" },
  ];

  const [selectedOrg, setSelectedOrg] = useState<Organization>(
    organizations[0]
  );
  const [selectedProject, setSelectedProject] = useState<Project>(
    organizations[0].projects[0]
  );

  const handleOrgChange = (id: string) => {
    const org = organizations.find((org) => org.id === id);
    if (!org) return;
    setSelectedOrg(org);
    setSelectedProject(org.projects[0]);
  };

  const handleProjectChange = (id: string) => {
    const project = selectedOrg.projects.find((project) => project.id === id);
    if (!project) return;
    setSelectedProject(project);
  };

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
          {/* Service Selection Section - READY FOR YOUR IMPLEMENTATION */}
          <PropertySection title="Service Selection">
            <Stack gap="4">
              {/* YOUR ROLE SELECTOR GOES HERE */}

              <HStack gap="3">
                <OrgSwitcherMenu
                  selectedId={selectedOrg.id}
                  items={organizations}
                  onSelect={handleOrgChange}
                />
                <Span color="fg.subtle">/</Span>
                <ProjectSwitcherMenu
                  selectedId={selectedProject.id}
                  items={selectedOrg.projects}
                  onSelect={handleProjectChange}
                />
              </HStack>
            </Stack>
          </PropertySection>

          {/* Basic Configuration */}
          <PropertySection title="Basic Configuration">
            <Stack gap="4">
              <Field.Root>
                <Field.Label>Service Name</Field.Label>
                <Input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="my-service"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Docker Image</Field.Label>
                <Input
                  value={serviceImage}
                  onChange={(e) => setServiceImage(e.target.value)}
                  placeholder="nginx:latest"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Restart Policy</Field.Label>
                <select
                  value={serviceRestart}
                  onChange={(e) => setServiceRestart(e.target.value)}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    width: "100%",
                  }}
                >
                  {restartOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field.Root>
            </Stack>
          </PropertySection>

          {/* Ports Configuration */}
          <PropertySection title="Port Mapping">
            <Stack gap="2">
              {servicePorts.map((port, index) => (
                <HStack key={index}>
                  <Input
                    value={port}
                    onChange={(e) => updatePort(index, e.target.value)}
                    placeholder="8080:80"
                    flex="1"
                  />
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => removePort(index)}
                  >
                    <PiX />
                  </IconButton>
                </HStack>
              ))}
              <Button variant="outline" size="sm" onClick={addPort}>
                <PiPlus /> Add Port
              </Button>
            </Stack>
          </PropertySection>

          {/* Environment Variables */}
          <PropertySection title="Environment Variables">
            <Stack gap="2">
              {serviceEnvironment.map((env, index) => (
                <HStack key={index}>
                  <Input
                    value={env.key}
                    onChange={(e) =>
                      updateEnvironmentVar(index, "key", e.target.value)
                    }
                    placeholder="VARIABLE_NAME"
                    flex="1"
                  />
                  <Input
                    value={env.value}
                    onChange={(e) =>
                      updateEnvironmentVar(index, "value", e.target.value)
                    }
                    placeholder="value"
                    flex="1"
                  />
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEnvironmentVar(index)}
                  >
                    <PiX />
                  </IconButton>
                </HStack>
              ))}
              <Button variant="outline" size="sm" onClick={addEnvironmentVar}>
                <PiPlus /> Add Environment Variable
              </Button>
            </Stack>
          </PropertySection>
        </Stack>
      </Drawer.Body>

      <Drawer.Footer>
        <Button
          onClick={handleSave}
          disabled={!serviceName.trim() || !serviceImage.trim()}
          colorPalette="secondaryBrand"
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
