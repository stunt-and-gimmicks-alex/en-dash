// components/ui/InfoField.tsx
// Generic reusable info field component for displaying label/value pairs
// Used across stacks, networks, containers, services, etc.

import React from "react";
import { Code, HStack, Button, Stack, Status, Text } from "@chakra-ui/react";
import { LuInfo } from "react-icons/lu";
import { Tooltip } from "@/components/ui/tooltip";

interface InfoFieldProps {
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
  tooltip?: string;
  helpText?: string;
  orientation?: "vertical" | "horizontal";
  labelWeight?: "normal" | "medium" | "semibold";
  size?: "sm" | "md" | "lg";
  cols?: number; // For grid layouts
  disabled?: boolean;
  variant?: "default" | "inline" | "minimal";
}

export const InfoField: React.FC<InfoFieldProps> = ({
  label,
  value,
  icon,
  tooltip,
  helpText,
  orientation = "vertical",
  labelWeight = "medium",
  size = "md",
  disabled = false,
  variant = "default",
}) => {
  // Size configurations
  const sizeConfig = {
    sm: {
      labelSize: "xs",
      valueSize: "sm",
      padding: "0.5",
      gap: "0.5",
    },
    md: {
      labelSize: "sm",
      valueSize: "md",
      padding: "1",
      gap: "0.5",
    },
    lg: {
      labelSize: "md",
      valueSize: "lg",
      padding: "1.5",
      gap: "1",
    },
  };

  const config = sizeConfig[size];

  // Label component
  const LabelComponent = (
    <HStack gap="1" alignItems="center">
      <Text
        textStyle={config.labelSize}
        fontWeight={labelWeight}
        color={
          disabled ? "brand.onSurfaceVariant/50" : "brand.onSurfaceVariant"
        }
      >
        {label}:
      </Text>
      {icon && icon}
      {tooltip && (
        <Tooltip content={tooltip} openDelay={150} closeDelay={100}>
          <Button size="xs" variant="plain" p="0" h="auto" minH="auto">
            <LuInfo size="12" />
          </Button>
        </Tooltip>
      )}
    </HStack>
  );

  // Value component
  const ValueComponent = (() => {
    switch (variant) {
      case "inline":
        return (
          <Text
            textStyle={config.valueSize}
            color={disabled ? "brand.onSurface/50" : "brand.onSurface"}
            fontFamily="mono"
          >
            {value}
          </Text>
        );

      case "minimal":
        return (
          <Text
            textStyle={config.valueSize}
            color={disabled ? "brand.onSurface/50" : "brand.onSurface"}
          >
            {value}
          </Text>
        );

      default:
        return (
          <Code
            textStyle={config.valueSize}
            bg={
              disabled
                ? "brand.surfaceContainer/50"
                : "brand.surfaceContainerLowest"
            }
            py={config.padding}
            pl="2"
            color={disabled ? "brand.onSurface/50" : undefined}
            opacity={disabled ? 0.6 : 1}
          >
            {value}
          </Code>
        );
    }
  })();

  // Layout based on orientation
  if (orientation === "horizontal") {
    return (
      <HStack gap="3" w="full" alignItems="flex-start">
        <Stack gap="0" minW="fit-content">
          {LabelComponent}
        </Stack>
        <Stack gap="0" flex="1">
          {ValueComponent}
          {helpText && (
            <Text textStyle="xs" color="brand.onSurfaceVariant/75" mt="1">
              {helpText}
            </Text>
          )}
        </Stack>
      </HStack>
    );
  }

  // Vertical layout (default)
  return (
    <Stack gap={config.gap} w="full">
      {LabelComponent}
      {ValueComponent}
      {helpText && (
        <Text textStyle="xs" color="brand.onSurfaceVariant/75" mt="0.5">
          {helpText}
        </Text>
      )}
    </Stack>
  );
};

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*
// Basic usage (replaces all your current label/Code blocks):
<InfoField label="Name" value={stack.name} />
<InfoField label="Path" value={stack.path} />
<InfoField label="Image" value={container.image} />

// With tooltip:
<InfoField 
  label="Containers" 
  value={<ContainerStatusDisplay running={3} total={5} />}
  tooltip="Total: Running / Paused / Stopped"
/>

// Horizontal layout for compact display:
<InfoField 
  label="Status" 
  value="Running"
  orientation="horizontal"
  variant="inline"
/>

// Different sizes:
<InfoField label="Port" value="8080:80" size="sm" />
<InfoField label="Description" value="Main service" size="lg" />

// Minimal styling for simple text:
<InfoField 
  label="Type" 
  value="Docker Container" 
  variant="minimal"
/>

// With help text:
<InfoField 
  label="Restart Policy" 
  value="unless-stopped"
  helpText="Container will restart automatically unless manually stopped"
/>

// Disabled state:
<InfoField 
  label="Config" 
  value="Not available" 
  disabled={true}
/>
*/

// =============================================================================
// COMPANION COMPONENTS
// =============================================================================

// For complex values that need custom formatting
interface ContainerStatusDisplayProps {
  running: number;
  total: number;
}

export const ContainerStatusDisplay: React.FC<ContainerStatusDisplayProps> = ({
  running,
  total,
}) => {
  return (
    <Status.Root
      colorPalette={
        running === total ? "green" : running > 0 ? "yellow" : "red"
      }
      size="sm"
    >
      <Status.Indicator />
      {running === total ? "Healthy" : running > 0 ? "Degraded" : "Down"} -{" "}
      {running}/{total} running
    </Status.Root>
  );
};

// For port displays with color coding
interface PortDisplayProps {
  ports: Array<{
    host_ip?: string;
    published?: string;
    target: string;
    protocol?: string;
  }>;
}

export const PortDisplay: React.FC<PortDisplayProps> = ({ ports }) => {
  if (!ports || ports.length === 0) {
    return <Text color="brand.onSurfaceVariant">No ports exposed</Text>;
  }

  return (
    <Stack gap="1">
      {ports.map((port, index) => (
        <Text key={index} fontFamily="mono" fontSize="sm">
          <Text as="span" color="purple.400">
            {port.host_ip && `${port.host_ip}:`}
          </Text>
          <Text as="span" color="cyan.400">
            {port.published && `${port.published}:`}
          </Text>
          <Text as="span" color="yellow.300">
            {port.target}
          </Text>
          <Text as="span" color="pink.300">
            {port.protocol && `/${port.protocol}`}
          </Text>
        </Text>
      ))}
    </Stack>
  );
};
