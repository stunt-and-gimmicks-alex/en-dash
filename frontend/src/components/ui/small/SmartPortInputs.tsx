// SmartPortInput.tsx - Intelligent port mapping with conflict detection and suggestions
"use client";

import { useState, useEffect } from "react";
import {
  HStack,
  Input,
  IconButton,
  Text,
  Box,
  Field,
  Badge,
  Stack,
  Button,
} from "@chakra-ui/react";
import {
  PiX,
  PiArrowRight,
  PiWarning,
  PiArrowsClockwise,
} from "react-icons/pi";
import { stackSelectors } from "@/stores/v06-stackStore";

// =============================================================================
// TYPES
// =============================================================================
interface PortMapping {
  hostPort: string;
  containerPort: string;
  protocol?: "tcp" | "udp";
}

interface SmartPortInputProps {
  value: string; // Docker port string format like "8080:80" or "8080:80/tcp"
  onChange: (value: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  placeholder?: {
    host?: string;
    container?: string;
  };
  autoSuggest?: boolean; // Whether to auto-suggest available ports
}

interface UsedPort {
  hostPort: string;
  containerPort: string;
  stackName: string;
  serviceName: string;
  protocol: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const parsePortString = (portString: string): PortMapping => {
  // Handle formats: "8080:80", "8080:80/tcp", "127.0.0.1:8080:80"
  const parts = portString.split(":");
  let hostPort = "";
  let containerPort = "";
  let protocol = "tcp";

  if (parts.length === 2) {
    // Format: "8080:80" or "8080:80/tcp"
    hostPort = parts[0];
    const containerPart = parts[1];
    if (containerPart.includes("/")) {
      const [port, proto] = containerPart.split("/");
      containerPort = port;
      protocol = proto as "tcp" | "udp";
    } else {
      containerPort = containerPart;
    }
  } else if (parts.length === 3) {
    // Format: "127.0.0.1:8080:80" - ignore IP for now
    hostPort = parts[1];
    containerPort = parts[2];
  }

  return { hostPort, containerPort, protocol: protocol as "tcp" | "udp" };
};

const buildPortString = (mapping: PortMapping): string => {
  const { hostPort, containerPort, protocol } = mapping;

  if (!hostPort || !containerPort) return "";

  // Only include protocol if it's not TCP (default)
  if (protocol && protocol !== "tcp") {
    return `${hostPort}:${containerPort}/${protocol}`;
  }
  return `${hostPort}:${containerPort}`;
};

const generateSecurePort = (
  usedPorts: Set<string>,
  basePort?: string
): string => {
  const ephemeralStart = 49152; // Start of ephemeral port range
  const ephemeralEnd = 65535; // End of ephemeral port range

  // If a base port is provided, try variations around it first
  if (basePort) {
    const base = parseInt(basePort);
    if (!isNaN(base) && base >= 1024) {
      // Try the original port first
      if (!usedPorts.has(basePort)) return basePort;

      // Try ports around the base (±100)
      for (let offset = 1; offset <= 100; offset++) {
        const higher = base + offset;
        const lower = base - offset;

        if (higher <= ephemeralEnd && !usedPorts.has(higher.toString())) {
          return higher.toString();
        }
        if (lower >= 1024 && !usedPorts.has(lower.toString())) {
          return lower.toString();
        }
      }
    }
  }

  // Generate a random port in the ephemeral range
  for (let attempts = 0; attempts < 100; attempts++) {
    const randomPort =
      Math.floor(Math.random() * (ephemeralEnd - ephemeralStart + 1)) +
      ephemeralStart;
    if (!usedPorts.has(randomPort.toString())) {
      return randomPort.toString();
    }
  }

  // Fallback: find first available port in range
  for (let port = ephemeralStart; port <= ephemeralEnd; port++) {
    if (!usedPorts.has(port.toString())) {
      return port.toString();
    }
  }

  return "50000"; // Ultimate fallback
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const SmartPortInput: React.FC<SmartPortInputProps> = ({
  value,
  onChange,
  onRemove,
  disabled = false,
  placeholder = {
    host: "8080",
    container: "80",
  },
  autoSuggest = true,
}) => {
  // Get live stack data to check for port conflicts
  const stacks = stackSelectors.useStacks();

  // Parse current value into separate fields
  const mapping = parsePortString(value);
  const [hostPort, setHostPort] = useState(mapping.hostPort);
  const [containerPort, setContainerPort] = useState(mapping.containerPort);
  const [protocol, setProtocol] = useState<"tcp" | "udp">(
    mapping.protocol || "tcp"
  );

  // Track used ports across all stacks
  const [usedPorts, setUsedPorts] = useState<Set<string>>(new Set());
  const [portConflicts, setPortConflicts] = useState<UsedPort[]>([]);

  // Extract used ports from all stacks
  useEffect(() => {
    const allUsedPorts = new Set<string>();
    const conflicts: UsedPort[] = [];

    stacks.forEach((stack) => {
      Object.entries(stack.services || {}).forEach(([serviceName, service]) => {
        const actualPorts = (service as any).actual_ports || [];
        actualPorts.forEach((port: any) => {
          const hostPortStr = port.host_port || port.hostPort;
          if (hostPortStr) {
            allUsedPorts.add(hostPortStr);
            conflicts.push({
              hostPort: hostPortStr,
              containerPort: port.container_port || port.containerPort || "",
              stackName: stack.name,
              serviceName,
              protocol: port.protocol || "tcp",
            });
          }
        });
      });
    });

    setUsedPorts(allUsedPorts);
    setPortConflicts(conflicts);
  }, [stacks]);

  // Check if current host port has conflicts
  const currentConflict = portConflicts.find(
    (conflict) => conflict.hostPort === hostPort && hostPort !== ""
  );

  // Auto-suggest available port when component mounts or container port changes
  useEffect(() => {
    if (autoSuggest && containerPort && !hostPort) {
      const suggestedPort = generateSecurePort(usedPorts, containerPort);
      setHostPort(suggestedPort);
      updatePortString(suggestedPort, containerPort, protocol);
    }
  }, [containerPort, usedPorts, autoSuggest, hostPort]);

  // Update the port string when individual fields change
  const updatePortString = (
    newHost: string,
    newContainer: string,
    newProtocol: "tcp" | "udp"
  ) => {
    const newMapping: PortMapping = {
      hostPort: newHost,
      containerPort: newContainer,
      protocol: newProtocol,
    };

    const portString = buildPortString(newMapping);
    onChange(portString);
  };

  // Handle host port changes
  const handleHostPortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHostPort(newValue);
    updatePortString(newValue, containerPort, protocol);
  };

  // Handle container port changes
  const handleContainerPortChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = e.target.value;
    setContainerPort(newValue);
    updatePortString(hostPort, newValue, protocol);
  };

  // Handle protocol toggle
  const handleProtocolToggle = () => {
    const newProtocol = protocol === "tcp" ? "udp" : "tcp";
    setProtocol(newProtocol);
    updatePortString(hostPort, containerPort, newProtocol);
  };

  // Suggest new available port
  const handleSuggestPort = () => {
    const suggestedPort = generateSecurePort(usedPorts, containerPort);
    setHostPort(suggestedPort);
    updatePortString(suggestedPort, containerPort, protocol);
  };

  return (
    <Box>
      {/* Main port mapping inputs */}
      <HStack gap="2" align="end">
        {/* Host port section */}
        <Box flex="1">
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted" mb="1">
              Host Port
            </Field.Label>
            <HStack gap="1">
              <Input
                value={hostPort}
                onChange={handleHostPortChange}
                placeholder={placeholder.host}
                disabled={disabled}
                size="sm"
                flex="1"
                borderColor={currentConflict ? "red.500" : undefined}
              />
              <IconButton
                aria-label="Suggest available port"
                onClick={handleSuggestPort}
                disabled={disabled}
                size="sm"
                variant="outline"
                title="Generate secure port suggestion"
              >
                <PiArrowsClockwise />
              </IconButton>
            </HStack>
          </Field.Root>
        </Box>

        {/* Arrow indicator */}
        <Box pb="2">
          <PiArrowRight size="16" color="var(--chakra-colors-fg-muted)" />
        </Box>

        {/* Container port section */}
        <Box flex="1">
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted" mb="1">
              Container Port
            </Field.Label>
            <Input
              value={containerPort}
              onChange={handleContainerPortChange}
              placeholder={placeholder.container}
              disabled={disabled}
              size="sm"
            />
          </Field.Root>
        </Box>

        {/* Protocol toggle */}
        <Box pb="2">
          <Button
            size="sm"
            variant={protocol === "udp" ? "solid" : "outline"}
            colorScheme={protocol === "udp" ? "blue" : "gray"}
            onClick={handleProtocolToggle}
            disabled={disabled}
            title={protocol === "tcp" ? "TCP Protocol" : "UDP Protocol"}
            minW="12"
          >
            {protocol.toUpperCase()}
          </Button>
        </Box>

        {/* Remove button */}
        <Box pb="2">
          <IconButton
            aria-label="Remove port mapping"
            onClick={onRemove}
            disabled={disabled}
            size="sm"
            variant="outline"
            colorScheme="red"
          >
            <PiX />
          </IconButton>
        </Box>
      </HStack>

      {/* Status indicators */}
      <Stack gap="1" mt="1" pl="1">
        {/* Port mapping preview */}
        <Text fontSize="xs" color="fg.muted">
          Maps host{" "}
          <Text as="span" fontFamily="mono">
            {hostPort || placeholder.host}
          </Text>{" "}
          → container{" "}
          <Text as="span" fontFamily="mono">
            {containerPort || placeholder.container}
          </Text>{" "}
          ({protocol})
        </Text>

        {/* Conflict warning */}
        {currentConflict && (
          <HStack gap="1" color="red.500">
            <PiWarning size="12" />
            <Text fontSize="xs">
              Port {hostPort} already used by {currentConflict.stackName}/
              {currentConflict.serviceName}
            </Text>
            <Button
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={handleSuggestPort}
            >
              Fix
            </Button>
          </HStack>
        )}

        {/* Security indicator for high ports */}
        {hostPort && parseInt(hostPort) >= 49152 && (
          <HStack gap="1" color="green.600">
            <Badge size="xs" colorScheme="green" variant="subtle">
              Secure Range
            </Badge>
            <Text fontSize="xs">
              Port {hostPort} is in the secure ephemeral range (49152-65535)
            </Text>
          </HStack>
        )}
      </Stack>
    </Box>
  );
};

export default SmartPortInput;
