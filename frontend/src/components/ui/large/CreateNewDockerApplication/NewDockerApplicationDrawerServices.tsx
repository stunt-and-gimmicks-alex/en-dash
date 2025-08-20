// NewDockerApplicationDrawerServices.tsx - Tabbed version with TypeScript fixes

import { useState, useEffect } from "react";
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
  Tabs,
  Text,
  Box,
} from "@chakra-ui/react";
import { PropertySection } from "./NewDockerApplicationDrawerPropSection";
import { PiPlus, PiX } from "react-icons/pi";

import {
  ServicesComboBox,
  type ServicesComboBoxItem,
} from "@/components/ui/small/ServiceSelectorComboBox";

import { NetworkSelectorComboBox } from "@/components/ui/small/NetworkSelectorComboBox";
import { VolumeMappingInput } from "@/components/ui/small/VolumeMappingInput";
import { SmartPortInput } from "@/components/ui/small/SmartPortInputs";

// =============================================================================
// INTERFACES
// =============================================================================
interface ServiceDrawerProps {
  serviceId?: string;
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

  // Service state - ALL existing state preserved
  const [serviceName, setServiceName] = useState("");
  const [serviceRole, setServiceRole] = useState("");
  const [selectedComboValue, setSelectedComboValue] = useState<string>("");
  const [serviceImage, setServiceImage] = useState("");
  const [serviceRestart, setServiceRestart] = useState("unless-stopped");
  const [servicePorts, setServicePorts] = useState<string[]>([]);
  const [serviceEnvironment, setServiceEnvironment] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceTags, setServiceTags] = useState<string[]>([]);

  // NEW: Additional state for new fields (Tab 1 - Basic)
  const [serviceNetworks, setServiceNetworks] = useState<string[]>([]);
  const [serviceVolumes, setServiceVolumes] = useState<string[]>([]);
  const [serviceCommand, setServiceCommand] = useState("");

  // NEW: Additional state for Additional Options (Tab 2) - only used ones for now
  const [serviceWorkingDir, setServiceWorkingDir] = useState("");
  const [serviceUser, setServiceUser] = useState("");
  const [serviceHealthcheck, setServiceHealthcheck] = useState("");

  // NEW: Advanced state for Advanced Options (Tab 3) - only used ones for now
  const [serviceDeploy, setServiceDeploy] = useState("");
  const [serviceLogging, setServiceLogging] = useState("");
  const [servicePrivileged, setServicePrivileged] = useState(false);

  const isEditing = !!serviceId;
  const fieldsDisabled = !selectedComboValue && !isEditing;

  // ALL existing useEffect and handler logic preserved - just adding new field clearing
  useEffect(() => {
    if (serviceId && newStack.services?.[serviceId]) {
      const service = newStack.services[serviceId];
      setServiceName(service.name || serviceId);
      // FIX: x-meta doesn't have role property, using custom logic
      setServiceRole(""); // Will implement role logic separately
      setServiceImage(service.image || "");
      setServiceRestart(service.restart || "unless-stopped");

      // FIX: Handle ports array conversion properly
      const portsArray = service.ports || [];
      const portsStringArray = portsArray.map((port) =>
        typeof port === "string" ? port : `${port}`
      );
      setServicePorts(portsStringArray);

      const envPairs = service.environment
        ? Object.entries(service.environment).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        : [];
      setServiceEnvironment(envPairs);

      setServiceCategory(service["x-meta"]?.category || "");
      setServiceTags(service["x-meta"]?.tags || []);
      setSelectedComboValue(`service:${serviceId}`);

      // FIX: Handle networks array conversion properly
      const networksData = service.networks;
      if (Array.isArray(networksData)) {
        setServiceNetworks(networksData);
      } else if (typeof networksData === "object" && networksData) {
        setServiceNetworks(Object.keys(networksData));
      } else {
        setServiceNetworks([]);
      }

      // FIX: Handle volumes array conversion properly
      const volumesArray = service.volumes || [];
      const volumesStringArray = volumesArray.map((volume) =>
        typeof volume === "string" ? volume : JSON.stringify(volume)
      );
      setServiceVolumes(volumesStringArray);

      // FIX: Handle command string/array conversion properly
      const commandData = service.command;
      if (Array.isArray(commandData)) {
        setServiceCommand(commandData.join(" "));
      } else if (typeof commandData === "string") {
        setServiceCommand(commandData);
      } else {
        setServiceCommand("");
      }
    } else {
      // Reset ALL fields for new service
      setServiceName("");
      setServiceRole("");
      setServiceImage("");
      setServiceRestart("unless-stopped");
      setServicePorts([]);
      setServiceEnvironment([]);
      setServiceCategory("");
      setServiceTags([]);
      setSelectedComboValue("");

      // Reset new fields
      setServiceNetworks([]);
      setServiceVolumes([]);
      setServiceCommand("");
      setServiceWorkingDir("");
      setServiceUser("");
      setServiceHealthcheck("");
      setServiceDeploy("");
      setServiceLogging("");
      setServicePrivileged(false);
    }
  }, [serviceId, newStack.services]);

  // EXISTING handleServiceSelection logic with new field clearing
  const handleServiceSelection = (
    value: string | null,
    item: ServicesComboBoxItem | null
  ) => {
    setSelectedComboValue(value || "");

    if (!item) {
      // Clear ALL fields including new ones
      setServiceImage("");
      setServiceName("");
      setServiceRole("");
      setServicePorts([]);
      setServiceEnvironment([]);
      setServiceCategory("");
      setServiceTags([]);
      setServiceRestart("unless-stopped");

      // Clear new fields
      setServiceNetworks([]);
      setServiceVolumes([]);
      setServiceCommand("");
      setServiceWorkingDir("");
      setServiceUser("");
      setServiceHealthcheck("");
      setServiceDeploy("");
      setServiceLogging("");
      setServicePrivileged(false);
      return;
    }

    switch (item.type) {
      case "service":
        if (item.data) {
          setServiceImage(item.data.image);
          setServiceName(item.data.service_name);
          setServiceCategory(item.data.category);
          setServiceTags(item.data.tags);
          setServiceRole(item.data.suggested_roles[0] || "");

          if (item.data.default_ports.length > 0) {
            setServicePorts(item.data.default_ports);
          } else {
            setServicePorts([]);
          }
          setServiceEnvironment([]);
        }
        break;

      case "custom":
        setServiceImage("");
        setServiceName("");
        setServiceRole("");
        setServicePorts([]);
        setServiceEnvironment([]);
        setServiceCategory("");
        setServiceTags([]);
        break;
    }
  };

  // EXISTING handleSave logic - just need to include new fields
  const handleSave = () => {
    if (!serviceName.trim() || !serviceImage.trim()) return;

    const finalServiceId =
      serviceId || serviceName.toLowerCase().replace(/[^a-z0-9]/g, "_");

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

        // Include new fields if they have values
        ...(serviceNetworks.length > 0 && { networks: serviceNetworks }),
        ...(serviceVolumes.length > 0 && { volumes: serviceVolumes }),
        ...(serviceCommand.trim() && { command: serviceCommand }),

        "x-meta": {
          category: serviceCategory,
          tags: serviceTags.filter((tag) => tag.trim()),
          role: serviceRole.trim() || undefined,
        },
      };
    });

    onClose?.();
  };

  const handleCancel = () => {
    onClose?.();
  };

  // ALL existing helper functions preserved
  const addPort = () => setServicePorts([...servicePorts, ""]);
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

  // NEW: Helper functions for new fields
  const addNetwork = () => setServiceNetworks([...serviceNetworks, ""]);
  const updateNetwork = (index: number, value: string) => {
    const newNetworks = [...serviceNetworks];
    newNetworks[index] = value;
    setServiceNetworks(newNetworks);
  };
  const removeNetwork = (index: number) => {
    setServiceNetworks(serviceNetworks.filter((_, i) => i !== index));
  };

  const addVolume = () => setServiceVolumes([...serviceVolumes, ""]);
  const updateVolume = (index: number, value: string) => {
    const newVolumes = [...serviceVolumes];
    newVolumes[index] = value;
    setServiceVolumes(newVolumes);
  };
  const removeVolume = (index: number) => {
    setServiceVolumes(serviceVolumes.filter((_, i) => i !== index));
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
          {/* Service Selection Section - Always visible */}
          <PropertySection title="Service Selection">
            <ServicesComboBox
              value={selectedComboValue}
              onValueChange={handleServiceSelection}
              label="Search for a service role or specific Docker service"
              placeholder="Type to search roles, services, or add custom..."
              size="sm"
            />
          </PropertySection>

          {/* TABS for configuration sections */}
          <Tabs.Root defaultValue="basic" variant="line">
            <Tabs.List>
              <Tabs.Trigger value="basic">Basic Configuration</Tabs.Trigger>
              <Tabs.Trigger value="additional">Additional Options</Tabs.Trigger>
              <Tabs.Trigger value="advanced">Advanced Options</Tabs.Trigger>
            </Tabs.List>

            {/* TAB 1: Basic Service Configuration */}
            <Tabs.Content value="basic">
              <Stack gap="6" pt="4">
                <PropertySection title="Service Details">
                  <Stack gap="4">
                    <Field.Root>
                      <Field.Label>Service Role</Field.Label>
                      <Input
                        value={serviceRole}
                        onChange={(e) => setServiceRole(e.target.value)}
                        placeholder="database, web-server, cache, etc."
                        disabled={fieldsDisabled}
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
                        disabled={fieldsDisabled}
                      />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Docker Image</Field.Label>
                      <Input
                        value={serviceImage}
                        onChange={(e) => setServiceImage(e.target.value)}
                        placeholder="nginx:latest"
                        disabled={fieldsDisabled}
                      />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Restart Policy</Field.Label>
                      <select
                        value={serviceRestart}
                        onChange={(e) => setServiceRestart(e.target.value)}
                        disabled={fieldsDisabled}
                        style={{
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          width: "100%",
                          opacity: fieldsDisabled ? 0.5 : 1,
                          cursor: fieldsDisabled ? "not-allowed" : "pointer",
                        }}
                      >
                        {restartOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Command Override</Field.Label>
                      <Input
                        value={serviceCommand}
                        onChange={(e) => setServiceCommand(e.target.value)}
                        placeholder="custom command to override default"
                        disabled={fieldsDisabled}
                      />
                      <Field.HelperText>
                        Optional: Override the default container command
                      </Field.HelperText>
                    </Field.Root>
                  </Stack>
                </PropertySection>

                <PropertySection title="Port Mappings">
                  <Stack gap="4">
                    <Field.Root>
                      <HStack justify="space-between">
                        <Field.Label>External Access Ports</Field.Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={addPort}
                          disabled={fieldsDisabled}
                        >
                          <PiPlus />
                          Add Port
                        </Button>
                      </HStack>
                      <Field.HelperText fontSize="xs">
                        Expose container ports to your host system for external
                        access
                      </Field.HelperText>
                    </Field.Root>

                    {servicePorts.length === 0 ? (
                      <Text
                        fontSize="sm"
                        color="fg.muted"
                        fontStyle="italic"
                        p="4"
                        textAlign="center"
                      >
                        No port mappings configured. Services will only be
                        accessible internally.
                      </Text>
                    ) : (
                      <Stack gap="3">
                        {servicePorts.map((port, index) => (
                          <SmartPortInput
                            key={index}
                            value={port}
                            onChange={(newValue) => updatePort(index, newValue)}
                            onRemove={() => removePort(index)}
                            disabled={fieldsDisabled}
                            placeholder={{
                              host: `${50000 + index}`, // Secure default suggestions
                              container: index === 0 ? "80" : `${8000 + index}`,
                            }}
                            autoSuggest={true}
                          />
                        ))}
                      </Stack>
                    )}

                    {/* Port guidance for common services */}
                    {servicePorts.length === 0 && (
                      <Box bg="brand.surfaceContainer" p="3" borderRadius="md">
                        <Text
                          fontSize="xs"
                          fontWeight="medium"
                          mb="2"
                          color="fg.muted"
                        >
                          Common Container Ports:
                        </Text>
                        <Stack gap="1" fontSize="xs" color="fg.muted">
                          <Text fontFamily="mono">80 → HTTP web servers</Text>
                          <Text fontFamily="mono">443 → HTTPS web servers</Text>
                          <Text fontFamily="mono">3000 → Node.js apps</Text>
                          <Text fontFamily="mono">8080 → Java/Tomcat apps</Text>
                          <Text fontFamily="mono">
                            5432 → PostgreSQL database
                          </Text>
                          <Text fontFamily="mono">3306 → MySQL database</Text>
                        </Stack>
                      </Box>
                    )}

                    {/* Security tip */}
                    {servicePorts.length > 0 && (
                      <Box
                        bg="green.50"
                        borderLeft="4px solid"
                        borderColor="green.500"
                        p="3"
                        borderRadius="md"
                      >
                        <Text
                          fontSize="xs"
                          fontWeight="medium"
                          mb="1"
                          color="green.700"
                        >
                          Security Tip:
                        </Text>
                        <Text fontSize="xs" color="green.600">
                          High ports (49152-65535) are automatically suggested
                          to avoid conflicts and reduce exposure to port
                          scanners.
                        </Text>
                      </Box>
                    )}
                  </Stack>
                </PropertySection>

                <PropertySection title="Networks">
                  <Stack gap="4">
                    <NetworkSelectorComboBox
                      value={
                        serviceNetworks.length > 0 ? serviceNetworks[0] : ""
                      }
                      onValueChange={(value, item) => {
                        console.log("Network selected:", { value, item });
                        if (value) {
                          // Replace the first network or add if none exist
                          if (serviceNetworks.length > 0) {
                            updateNetwork(0, value);
                          } else {
                            setServiceNetworks([value]);
                          }
                        } else {
                          // Clear selection
                          if (serviceNetworks.length > 0) {
                            removeNetwork(0);
                          }
                        }
                      }}
                      label="Primary Network"
                      placeholder="Search existing networks or create new..."
                      size="sm"
                      disabled={fieldsDisabled}
                    />

                    {/* Additional networks (if more than one) */}
                    {serviceNetworks.length > 1 && (
                      <Stack gap="2">
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="fg.muted">
                            Additional Networks
                          </Text>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={addNetwork}
                            disabled={fieldsDisabled}
                          >
                            <PiPlus />
                            Add Network
                          </Button>
                        </HStack>

                        {serviceNetworks.slice(1).map((network, index) => (
                          <HStack key={index + 1} gap="2">
                            <NetworkSelectorComboBox
                              value={network}
                              onValueChange={(value) => {
                                if (value) {
                                  updateNetwork(index + 1, value);
                                } else {
                                  removeNetwork(index + 1);
                                }
                              }}
                              placeholder="Select additional network..."
                              size="sm"
                              disabled={fieldsDisabled}
                            />
                            <IconButton
                              variant="outline"
                              colorScheme="red"
                              onClick={() => removeNetwork(index + 1)}
                              disabled={fieldsDisabled}
                            >
                              <PiX />
                            </IconButton>
                          </HStack>
                        ))}
                      </Stack>
                    )}

                    {/* Add additional network button (only show if we have just one network) */}
                    {serviceNetworks.length === 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addNetwork}
                        disabled={fieldsDisabled}
                        alignSelf="start"
                      >
                        <PiPlus />
                        Add Additional Network
                      </Button>
                    )}

                    {/* Help text */}
                    <Text fontSize="xs" color="fg.muted">
                      The primary network is required. Additional networks are
                      optional for multi-network connectivity.
                    </Text>
                  </Stack>
                </PropertySection>

                <PropertySection title="Volume Mounts">
                  <Stack gap="4">
                    <Field.Root>
                      <HStack justify="space-between">
                        <Field.Label>Container Volume Mappings</Field.Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={addVolume}
                          disabled={fieldsDisabled}
                        >
                          <PiPlus />
                          Add Volume
                        </Button>
                      </HStack>
                      <Field.HelperText fontSize="xs">
                        Map local folders to container paths for persistent data
                        storage
                      </Field.HelperText>
                    </Field.Root>

                    {serviceVolumes.length === 0 ? (
                      <Text
                        fontSize="sm"
                        color="fg.muted"
                        fontStyle="italic"
                        p="4"
                        textAlign="center"
                      >
                        No volume mappings configured. Click "Add Volume" to
                        mount local folders.
                      </Text>
                    ) : (
                      <Stack gap="3">
                        {serviceVolumes.map((volume, index) => (
                          <VolumeMappingInput
                            key={index}
                            value={volume}
                            onChange={(newValue) =>
                              updateVolume(index, newValue)
                            }
                            onRemove={() => removeVolume(index)}
                            disabled={fieldsDisabled}
                            placeholder={{
                              local: `./app-data-${index + 1}`,
                              container: `/app/data${
                                index > 0 ? `-${index + 1}` : ""
                              }`,
                            }}
                          />
                        ))}
                      </Stack>
                    )}

                    {/* Quick volume suggestions for common use cases */}
                    {serviceVolumes.length === 0 && (
                      <Box bg="brand.surfaceContainer" p="3" borderRadius="md">
                        <Text
                          fontSize="xs"
                          fontWeight="medium"
                          mb="2"
                          color="fg.muted"
                        >
                          Common Volume Patterns:
                        </Text>
                        <Stack gap="1" fontSize="xs" color="fg.muted">
                          <Text fontFamily="mono">
                            ./config → /app/config (app configuration)
                          </Text>
                          <Text fontFamily="mono">
                            ./data → /app/data (application data)
                          </Text>
                          <Text fontFamily="mono">
                            ./logs → /app/logs (log files)
                          </Text>
                          <Text fontFamily="mono">
                            ./uploads → /app/uploads (user uploads)
                          </Text>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </PropertySection>

                <PropertySection title="Environment Variables">
                  <Stack gap="4">
                    <Field.Root>
                      <HStack justify="space-between">
                        <Field.Label>Environment Variables</Field.Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={addEnvironmentVar}
                          disabled={fieldsDisabled}
                        >
                          <PiPlus />
                          Add Variable
                        </Button>
                      </HStack>
                    </Field.Root>

                    {serviceEnvironment.map((env, index) => (
                      <HStack key={index} gap="2">
                        <Input
                          value={env.key}
                          onChange={(e) =>
                            updateEnvironmentVar(index, "key", e.target.value)
                          }
                          placeholder="VARIABLE_NAME"
                          disabled={fieldsDisabled}
                        />
                        <Input
                          value={env.value}
                          onChange={(e) =>
                            updateEnvironmentVar(index, "value", e.target.value)
                          }
                          placeholder="value"
                          disabled={fieldsDisabled}
                        />
                        <IconButton
                          variant="outline"
                          colorScheme="red"
                          onClick={() => removeEnvironmentVar(index)}
                          disabled={fieldsDisabled}
                        >
                          <PiX />
                        </IconButton>
                      </HStack>
                    ))}
                  </Stack>
                </PropertySection>
              </Stack>
            </Tabs.Content>

            {/* TAB 2: Additional Options */}
            <Tabs.Content value="additional">
              <Stack gap="6" pt="4">
                <PropertySection title="Additional Configuration">
                  <Stack gap="4">
                    <Field.Root>
                      <Field.Label>Working Directory</Field.Label>
                      <Input
                        value={serviceWorkingDir}
                        onChange={(e) => setServiceWorkingDir(e.target.value)}
                        placeholder="/app"
                        disabled={fieldsDisabled}
                      />
                      <Field.HelperText>
                        Override container working directory
                      </Field.HelperText>
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>User</Field.Label>
                      <Input
                        value={serviceUser}
                        onChange={(e) => setServiceUser(e.target.value)}
                        placeholder="1000:1000"
                        disabled={fieldsDisabled}
                      />
                      <Field.HelperText>
                        Run as specific user instead of root
                      </Field.HelperText>
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Health Check</Field.Label>
                      <Input
                        value={serviceHealthcheck}
                        onChange={(e) => setServiceHealthcheck(e.target.value)}
                        placeholder="curl -f http://localhost/ || exit 1"
                        disabled={fieldsDisabled}
                      />
                      <Field.HelperText>
                        Command to check service health
                      </Field.HelperText>
                    </Field.Root>
                  </Stack>
                </PropertySection>
              </Stack>
            </Tabs.Content>

            {/* TAB 3: Advanced Options */}
            <Tabs.Content value="advanced">
              <Stack gap="6" pt="4">
                <PropertySection title="Advanced Configuration">
                  <Stack gap="4">
                    <Field.Root>
                      <Field.Label>Deploy Configuration</Field.Label>
                      <Input
                        value={serviceDeploy}
                        onChange={(e) => setServiceDeploy(e.target.value)}
                        placeholder="resources: {limits: {memory: 512M}}"
                        disabled={fieldsDisabled}
                      />
                      <Field.HelperText>
                        Production deployment constraints and resource limits
                      </Field.HelperText>
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Logging Configuration</Field.Label>
                      <Input
                        value={serviceLogging}
                        onChange={(e) => setServiceLogging(e.target.value)}
                        placeholder="driver: json-file, options: {max-size: 10m}"
                        disabled={fieldsDisabled}
                      />
                      <Field.HelperText>
                        Custom logging drivers and options
                      </Field.HelperText>
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Privileged Mode</Field.Label>
                      <input
                        type="checkbox"
                        checked={servicePrivileged}
                        onChange={(e) => setServicePrivileged(e.target.checked)}
                        disabled={fieldsDisabled}
                        style={{ marginLeft: "8px" }}
                      />
                      <Field.HelperText>
                        Run with elevated privileges (security risk)
                      </Field.HelperText>
                    </Field.Root>
                  </Stack>
                </PropertySection>
              </Stack>
            </Tabs.Content>
          </Tabs.Root>
        </Stack>
      </Drawer.Body>

      <Drawer.Footer gap="3">
        <Button variant="outline" onClick={handleCancel}>
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
