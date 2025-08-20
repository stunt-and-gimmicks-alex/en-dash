// VolumeMappingInput.tsx - User-friendly volume mapping with split inputs
"use client";

import { useState } from "react";
import {
  HStack,
  Input,
  IconButton,
  Button,
  Text,
  Stack,
  Box,
  Field,
} from "@chakra-ui/react";
import { PiX, PiArrowRight, PiInfo } from "react-icons/pi";

// =============================================================================
// TYPES
// =============================================================================
interface VolumeMapping {
  localPath: string;
  containerPath: string;
  mode?: "ro" | "rw"; // read-only or read-write
}

interface VolumeMappingInputProps {
  value: string; // Docker volume string format like "./data:/app/data:ro"
  onChange: (value: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  placeholder?: {
    local?: string;
    container?: string;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const parseVolumeString = (volumeString: string): VolumeMapping => {
  const parts = volumeString.split(":");
  return {
    localPath: parts[0] || "",
    containerPath: parts[1] || "",
    mode: (parts[2] as "ro" | "rw") || "rw",
  };
};

const buildVolumeString = (mapping: VolumeMapping): string => {
  const { localPath, containerPath, mode } = mapping;

  if (!localPath || !containerPath) return "";

  // Only include mode if it's read-only (rw is default)
  if (mode === "ro") {
    return `${localPath}:${containerPath}:ro`;
  }
  return `${localPath}:${containerPath}`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const VolumeMappingInput: React.FC<VolumeMappingInputProps> = ({
  value,
  onChange,
  onRemove,
  disabled = false,
  placeholder = {
    local: "./app-data",
    container: "/app/data",
  },
}) => {
  // Parse current value into separate fields
  const mapping = parseVolumeString(value);
  const [localPath, setLocalPath] = useState(mapping.localPath);
  const [containerPath, setContainerPath] = useState(mapping.containerPath);
  const [mode, setMode] = useState<"ro" | "rw">(mapping.mode || "rw");

  // Update the volume string when individual fields change
  const updateVolumeString = (
    newLocal: string,
    newContainer: string,
    newMode: "ro" | "rw"
  ) => {
    const newMapping: VolumeMapping = {
      localPath: newLocal,
      containerPath: newContainer,
      mode: newMode,
    };

    const volumeString = buildVolumeString(newMapping);
    onChange(volumeString);
  };

  // Handle local path changes
  const handleLocalPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalPath(newValue);
    updateVolumeString(newValue, containerPath, mode);
  };

  // Handle container path changes
  const handleContainerPathChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = e.target.value;
    setContainerPath(newValue);
    updateVolumeString(localPath, newValue, mode);
  };

  // Handle mode toggle
  const handleModeToggle = () => {
    const newMode = mode === "rw" ? "ro" : "rw";
    setMode(newMode);
    updateVolumeString(localPath, containerPath, newMode);
  };

  return (
    <Box>
      {/* Main volume mapping inputs */}
      <HStack gap="2" align="end">
        {/* Local path section */}
        <Box flex="1">
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted" mb="1">
              Local Drive
            </Field.Label>
            <Input
              value={localPath}
              onChange={handleLocalPathChange}
              placeholder={placeholder.local}
              disabled={disabled}
              size="sm"
            />
          </Field.Root>
        </Box>

        {/* Arrow indicator */}
        <Box pb="2">
          <PiArrowRight size="16" color="var(--chakra-colors-fg-muted)" />
        </Box>

        {/* Container path section */}
        <Box flex="1">
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted" mb="1">
              Container Path
            </Field.Label>
            <Input
              value={containerPath}
              onChange={handleContainerPathChange}
              placeholder={placeholder.container}
              disabled={disabled}
              size="sm"
            />
          </Field.Root>
        </Box>

        {/* Mode toggle */}
        <Box pb="2">
          <Button
            size="sm"
            variant={mode === "ro" ? "solid" : "outline"}
            colorScheme={mode === "ro" ? "orange" : "gray"}
            onClick={handleModeToggle}
            disabled={disabled}
            title={mode === "ro" ? "Read-only" : "Read-write"}
            minW="12"
          >
            {mode === "ro" ? "RO" : "RW"}
          </Button>
        </Box>

        {/* Remove button */}
        <Box pb="2">
          <IconButton
            aria-label="Remove volume mapping"
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

      {/* Helper text with path examples */}
      <HStack gap="2" mt="1" pl="1">
        <Text fontSize="xs" color="fg.muted">
          Maps{" "}
          <Text as="span" fontFamily="mono">
            {localPath || placeholder.local}
          </Text>{" "}
          →{" "}
          <Text as="span" fontFamily="mono">
            {containerPath || placeholder.container}
          </Text>
          {mode === "ro" && " (read-only)"}
        </Text>
        <IconButton
          aria-label="Path format help"
          size="xs"
          variant="ghost"
          title="Local paths: Use relative paths like './data' or absolute paths like '/home/user/data'"
        >
          <PiInfo />
        </IconButton>
      </HStack>
    </Box>
  );
};

export default VolumeMappingInput;
