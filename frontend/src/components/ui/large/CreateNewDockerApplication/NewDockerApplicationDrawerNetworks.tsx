// NewDockerApplicationDrawerNetworks.tsx - Network configuration drawer

import { useState, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";
import {
  Button,
  Drawer,
  Stack,
  HStack,
  Text,
  CloseButton,
  Input,
  Field,
  Textarea,
  IconButton,
} from "@chakra-ui/react";
import { SelectField } from "./NewDockerApplicationDrawerFields";
import { PropertySection } from "./NewDockerApplicationDrawerPropSection";
import { PiPlus, PiX } from "react-icons/pi";

interface NetworkDrawerProps {
  networkId?: string; // If provided, we're editing; if not, we're creating
  onClose?: () => void;
}

export const NewDockDrawerNetworks = ({
  networkId,
  onClose,
}: NetworkDrawerProps = {}) => {
  const { newStack, setNewStack } = useNewStackStore();

  // Network state
  const [networkName, setNetworkName] = useState("");
  const [networkDriver, setNetworkDriver] = useState("bridge");
  const [networkExternal, setNetworkExternal] = useState(false);
  const [networkLabels, setNetworkLabels] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [networkIpam, setNetworkIpam] = useState("");
  const [networkAttachable, setNetworkAttachable] = useState(false);

  const isEditing = !!networkId;

  // Load existing network data if editing
  useEffect(() => {
    if (networkId && newStack.networks?.[networkId]) {
      const network = newStack.networks[networkId];
      setNetworkName(network.name || networkId);
      setNetworkDriver(network.driver || "bridge");
      setNetworkExternal(network.external || false);
      setNetworkAttachable(network.attachable || false);
      setNetworkIpam(network.ipam ? JSON.stringify(network.ipam, null, 2) : "");

      // Convert labels object to key-value pairs
      const labelPairs = network.labels
        ? Object.entries(network.labels).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        : [];
      setNetworkLabels(labelPairs);
    } else {
      // Reset for new network
      setNetworkName("");
      setNetworkDriver("bridge");
      setNetworkExternal(false);
      setNetworkAttachable(false);
      setNetworkIpam("");
      setNetworkLabels([]);
    }
  }, [networkId, newStack.networks]);

  const handleSave = () => {
    if (!networkName.trim()) return;

    const finalNetworkId =
      networkId || networkName.toLowerCase().replace(/[^a-z0-9]/g, "_");

    // Convert labels pairs back to object
    const labelsObj = networkLabels.reduce((acc, { key, value }) => {
      if (key.trim()) {
        acc[key.trim()] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    // Parse IPAM if provided
    let ipamConfig = null;
    if (networkIpam.trim()) {
      try {
        ipamConfig = JSON.parse(networkIpam);
      } catch (e) {
        console.warn("Invalid IPAM JSON, ignoring:", e);
      }
    }

    setNewStack((stack) => {
      if (!stack.networks) stack.networks = {};

      stack.networks[finalNetworkId] = {
        name: networkName,
        driver: networkDriver,
        external: networkExternal,
        attachable: networkAttachable,
        labels: labelsObj,
        ...(ipamConfig && { ipam: ipamConfig }),
      };
    });

    onClose?.();
  };

  const handleCancel = () => {
    onClose?.();
  };

  const addLabel = () => {
    setNetworkLabels([...networkLabels, { key: "", value: "" }]);
  };

  const updateLabel = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const updated = [...networkLabels];
    updated[index][field] = value;
    setNetworkLabels(updated);
  };

  const removeLabel = (index: number) => {
    setNetworkLabels(networkLabels.filter((_, i) => i !== index));
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>
          {isEditing
            ? `Edit Network: ${networkName}`
            : "Add New Docker Network"}
        </Drawer.Title>
      </Drawer.Header>

      <Drawer.Body colorPalette="secondaryBrand">
        <Stack px="4" pt="4" pb="6" gap="6">
          {/* Basic Network Configuration */}
          <PropertySection title="Basic Configuration">
            <Field.Root orientation="horizontal" gap="10">
              <Field.Label color="fg.muted">Network Name</Field.Label>
              <Input
                size="sm"
                maxW="var(--max-width)"
                flex="1"
                value={networkName}
                placeholder="e.g., app-network, web-tier"
                onChange={(e) => setNetworkName(e.target.value)}
              />
            </Field.Root>

            <SelectField
              label="Driver"
              options={[
                { value: "bridge", label: "Bridge (default)" },
                { value: "host", label: "Host" },
                { value: "none", label: "None" },
                { value: "overlay", label: "Overlay (Swarm)" },
                { value: "macvlan", label: "Macvlan" },
                { value: "ipvlan", label: "IPvlan" },
              ]}
              defaultValue={networkDriver}
              onChange={(e) => setNetworkDriver(e.target.value)}
            />
          </PropertySection>

          {/* Network Options */}
          <PropertySection title="Network Options">
            <SelectField
              label="External Network"
              options={[
                { value: "false", label: "No - Create new network" },
                { value: "true", label: "Yes - Use existing external network" },
              ]}
              defaultValue={networkExternal ? "true" : "false"}
              onChange={(e) => setNetworkExternal(e.target.value === "true")}
            />

            <SelectField
              label="Attachable"
              options={[
                { value: "false", label: "No" },
                {
                  value: "true",
                  label: "Yes - Allow manual container attachment",
                },
              ]}
              defaultValue={networkAttachable ? "true" : "false"}
              onChange={(e) => setNetworkAttachable(e.target.value === "true")}
            />
          </PropertySection>

          {/* IPAM Configuration */}
          <PropertySection title="IPAM Configuration (Advanced)">
            <Field.Root orientation="horizontal" gap="10">
              <Field.Label color="fg.muted">IPAM Config (JSON)</Field.Label>
              <Textarea
                size="sm"
                maxW="var(--max-width)"
                flex="1"
                value={networkIpam}
                placeholder={`{
  "driver": "default",
  "config": [
    {
      "subnet": "172.20.0.0/24",
      "gateway": "172.20.0.1"
    }
  ]
}`}
                onChange={(e) => setNetworkIpam(e.target.value)}
                rows={6}
                fontFamily="mono"
              />
            </Field.Root>
          </PropertySection>

          {/* Labels */}
          <PropertySection title="Labels">
            <Stack gap="4">
              {networkLabels.map((label, index) => (
                <HStack key={index} gap="2">
                  <Input
                    size="sm"
                    placeholder="label.key"
                    value={label.key}
                    onChange={(e) => updateLabel(index, "key", e.target.value)}
                    flex="1"
                  />
                  <Input
                    size="sm"
                    placeholder="label.value"
                    value={label.value}
                    onChange={(e) =>
                      updateLabel(index, "value", e.target.value)
                    }
                    flex="1"
                  />
                  <IconButton
                    aria-label="Remove label"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLabel(index)}
                  >
                    <PiX />
                  </IconButton>
                </HStack>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addLabel}
                alignSelf="start"
              >
                <PiPlus /> Add Label
              </Button>

              {networkLabels.length === 0 && (
                <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                  No labels configured
                </Text>
              )}
            </Stack>
          </PropertySection>
        </Stack>
      </Drawer.Body>

      <Drawer.Footer gap="3">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          colorPalette="brand"
          onClick={handleSave}
          disabled={!networkName.trim()}
        >
          {isEditing ? "Update Network" : "Add Network"}
        </Button>
      </Drawer.Footer>

      <Drawer.CloseTrigger asChild>
        <CloseButton size="sm" />
      </Drawer.CloseTrigger>
    </>
  );
};
