// NewDockerApplicationDrawerServices.tsx - Clean implementation with ServicesComboBox
"use client";

import React, { useState, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";
import {
  Button,
  Drawer,
  Stack,
  HStack,
  IconButton,
  CloseButton,
  Input,
  Field,
} from "@chakra-ui/react";
import { PropertySection } from "./NewDockerApplicationDrawerPropSection";
import { PiPlus, PiX } from "react-icons/pi";

import {
  ServicesComboBox,
  type ServicesComboBoxItem,
} from "@/components/ui/small/ServiceSelectorComboBox";

import { type DockerService } from "@/components/ui/small/ServiceSelectorComboBox";

// =============================================================================
// INTERFACES
// =============================================================================
interface ServiceDrawerProps {
  serviceId?: string; // If provided, we're editing; if not, we're creating
  onClose?: () => void;
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
  const [serviceRole, setServiceRole] = useState(""); // New role field
  const [selectedComboValue, setSelectedComboValue] = useState<string>("");
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
      setServiceRole(service["x-meta"]?.role || ""); // Load existing role
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
      setServiceRole(""); // Reset role
      setServiceImage("");
      setServiceRestart("unless-stopped");
      setServicePorts([]);
      setServiceEnvironment([]);
      setServiceCategory("");
      setServiceTags([]);
      setSelectedComboValue("");
      setSelectedDockerService(null);
    }
  }, [serviceId, newStack.services]);

  // Handle service/role selection from combobox
  const handleServiceSelection = (
    value: string | null,
    item: ServicesComboBoxItem | null
  ) => {
    console.log("Service selection handler:", { value, item });

    setSelectedComboValue(value || "");

    if (!item) {
      // Clear selection
      setSelectedDockerService(null);
      setServiceImage("");
      setServiceName("");
      return;
    }

    switch (item.type) {
      case "service":
        // User selected a specific service
        if (item.data) {
          setSelectedDockerService(item.data);
          setServiceImage(item.data.image);
          setServiceName(item.data.service_name);
          setServiceCategory(item.data.category);
          setServiceTags(item.data.tags);

          // Set the service role to the first suggested role (or empty if none)
          setServiceRole(item.data.suggested_roles[0] || "");

          // Set default ports if available
          if (item.data.default_ports.length > 0) {
            setServicePorts(item.data.default_ports);
          }
        }
        break;

      case "role":
        // User selected a role - clear service-specific data but keep the selection
        setSelectedDockerService(null);
        setServiceImage("");
        setServiceName("");
        // TODO: Could filter services by role in the future
        break;

      case "custom":
        // User wants to add a custom service
        setSelectedDockerService(null);
        setServiceImage("");
        setServiceName(""); // Let them fill this out manually
        break;
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
          role: serviceRole.trim() || undefined, // Save the role if provided
        },
      };
    });

    onClose?.();
  };

  const handleCancel = () => {
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
          {/* Service Selection Section */}
          <PropertySection title="Service Selection">
            <Stack gap="4">
              <ServicesComboBox
                value={selectedComboValue}
                onValueChange={handleServiceSelection}
                label="Search for a service role or specific Docker service"
                placeholder="Type to search roles, services, or add custom..."
                size="sm"
              />
            </Stack>
          </PropertySection>

          {/* Basic Configuration */}
          <PropertySection title="Basic Configuration">
            <Stack gap="4">
              <Field.Root>
                <Field.Label>Service Role</Field.Label>
                <Input
                  value={serviceRole}
                  onChange={(e) => setServiceRole(e.target.value)}
                  placeholder="database, web-server, cache, etc."
                />
                <Field.HelperText>
                  Optional: The role this service plays in your stack
                </Field.HelperText>
              </Field.Root>

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
                    placeholder="KEY"
                    flex="1"
                  />
                  <Input
                    value={env.value}
                    onChange={(e) =>
                      updateEnvironmentVar(index, "value", e.target.value)
                    }
                    placeholder="value"
                    flex="2"
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
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!serviceName.trim() || !serviceImage.trim()}
        >
          {isEditing ? "Update Service" : "Add Service"}
        </Button>
      </Drawer.Footer>
    </>
  );
};
