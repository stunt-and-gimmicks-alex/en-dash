// NetworkSelectorComboBox.tsx - Network selection combobox with live Docker data
"use client";

import { useState, useEffect } from "react";
import {
  Combobox,
  useListCollection,
  HStack,
  Text,
  Badge,
  Stack,
  Span,
} from "@chakra-ui/react";
import { stackSelectors } from "@/stores/v06-stackStore";

// =============================================================================
// TYPES
// =============================================================================
interface NetworkInfo {
  network: string;
  sources: string[];
  details: {
    compose?: {
      name: string;
      driver: string;
      external: boolean;
      source: string;
    };
    containers?: {
      name: string;
      containers: Array<{
        container_name: string;
        service?: string;
        ip_address?: string;
      }>;
      source: string;
    };
    docker?: {
      name: string;
      id: string;
      driver: string;
      scope: string;
      containers_connected: number;
      source: string;
    };
  };
  status: "active" | "defined";
}

interface UnifiedNetworkItem {
  value: string;
  label: string;
  type: "existing" | "custom";
  data?: NetworkInfo | null;
  description?: string;
  driver?: string;
  sources?: string[];
  status?: "active" | "defined";
  containerCount?: number;
}

interface NetworkSelectorComboBoxProps {
  value?: string;
  onValueChange?: (
    value: string | null,
    item: UnifiedNetworkItem | null
  ) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "outline" | "subtle" | "flushed";
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const NetworkSelectorComboBox: React.FC<
  NetworkSelectorComboBoxProps
> = ({
  value,
  onValueChange,
  placeholder = "Search existing networks or create new...",
  label,
  disabled = false,
  size = "sm",
  variant = "outline",
}) => {
  const [inputValue, setInputValue] = useState("");

  // Get live Docker networks data using individual primitive selectors
  const stacks = stackSelectors.useStacks();

  // Set up collection for direct updates (no async needed - data is already in memory)
  const { collection, set } = useListCollection<UnifiedNetworkItem>({
    initialItems: [],
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
  });

  // Process stack data and update collection when stacks or inputValue changes
  useEffect(() => {
    console.log("🔍 NetworkSelector: Processing data", {
      stackCount: stacks.length,
      inputValue,
    });

    const items: UnifiedNetworkItem[] = [];
    const seenNetworks = new Set<string>();
    const searchTerm = inputValue.toLowerCase().trim();

    // Process all networks from all stacks
    stacks.forEach((stack) => {
      const networks = stack.networks?.all || [];

      networks.forEach((networkInfo: NetworkInfo) => {
        const networkName = networkInfo.network;

        // Skip if we've already seen this network
        if (seenNetworks.has(networkName)) return;
        seenNetworks.add(networkName);

        // Apply search filtering
        const matchesSearch =
          !searchTerm ||
          networkName.toLowerCase().includes(searchTerm) ||
          networkInfo.sources.some((source) =>
            source.toLowerCase().includes(searchTerm)
          ) ||
          (networkInfo.details.docker?.driver || "")
            .toLowerCase()
            .includes(searchTerm);

        if (matchesSearch) {
          // Extract driver information
          const driver =
            networkInfo.details.docker?.driver ||
            networkInfo.details.compose?.driver ||
            "bridge";

          // Extract container count
          const containerCount =
            networkInfo.details.docker?.containers_connected ||
            networkInfo.details.containers?.containers?.length ||
            0;

          // Create description
          const sourceTypes = networkInfo.sources.join(", ");
          const statusText =
            networkInfo.status === "active" ? "Active" : "Defined";
          const description = `${driver} network • ${statusText} • ${containerCount} containers • Sources: ${sourceTypes}`;

          items.push({
            value: networkName,
            label: networkName,
            type: "existing",
            data: networkInfo,
            description,
            driver,
            sources: networkInfo.sources,
            status: networkInfo.status,
            containerCount,
          });
        }
      });
    });

    // Add custom network option if user is typing and it doesn't exist
    if (inputValue.trim() && !seenNetworks.has(inputValue.trim())) {
      items.push({
        value: inputValue.trim(),
        label: inputValue.trim(),
        type: "custom",
        data: null,
        description: "Create a new custom Docker network",
        driver: "bridge",
        sources: [],
        status: "defined",
        containerCount: 0,
      });
    }

    console.log("🔍 NetworkSelector: Setting collection", {
      itemCount: items.length,
      networks: items.map((i) => ({ name: i.label, type: i.type })),
    });

    // Update the collection directly
    set(items);
  }, [stacks, inputValue, set]);

  // Handle input value changes (search/filter)
  const handleInputValueChange = (details: any) => {
    setInputValue(details.inputValue);
  };

  // Handle selection changes
  const handleValueChange = (details: any) => {
    const selectedValue = details.value?.[0] || null;
    const selectedItem = selectedValue
      ? collection.items.find((item) => item.value === selectedValue) || null
      : null;

    console.log("NetworkSelectorComboBox selection:", {
      selectedValue,
      selectedItem,
    });

    onValueChange?.(selectedValue, selectedItem);
  };

  // Custom item renderer
  const renderItem = (item: UnifiedNetworkItem) => {
    switch (item.type) {
      case "existing":
        return (
          <HStack justify="space-between" w="full">
            <Stack gap="1" flex="1">
              <Text fontWeight="medium" fontSize="sm">
                {item.label}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {item.description}
              </Text>
              <HStack gap="1" flexWrap="wrap">
                <Badge size="xs" variant="outline" colorScheme="blue">
                  {item.driver}
                </Badge>
                {item.status === "active" && (
                  <Badge size="xs" variant="subtle" colorScheme="green">
                    Active
                  </Badge>
                )}
                {item.containerCount && item.containerCount > 0 && (
                  <Badge size="xs" variant="outline" colorScheme="gray">
                    {item.containerCount} containers
                  </Badge>
                )}
              </HStack>
            </Stack>
            <Badge size="sm" variant="subtle" colorScheme="blue">
              Existing
            </Badge>
          </HStack>
        );

      case "custom":
        return (
          <HStack justify="space-between" w="full">
            <Stack gap="1" flex="1">
              <Text fontWeight="medium" fontSize="sm">
                {inputValue
                  ? `Create "${inputValue}"`
                  : "Create custom network"}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Create a new Docker network with default bridge driver
              </Text>
              <HStack gap="1">
                <Badge size="xs" variant="outline" colorScheme="gray">
                  bridge (default)
                </Badge>
              </HStack>
            </Stack>
            <Badge size="sm" variant="subtle" colorScheme="orange">
              New
            </Badge>
          </HStack>
        );

      default:
        return <Text>{item.label}</Text>;
    }
  };

  return (
    <Combobox.Root
      collection={collection}
      value={value ? [value] : []}
      onValueChange={handleValueChange}
      onInputValueChange={handleInputValueChange}
      disabled={disabled}
      size={size}
      variant={variant}
      width="full"
      openOnClick
    >
      {label && <Combobox.Label>{label}</Combobox.Label>}
      <Combobox.Control>
        <Combobox.Input placeholder={placeholder} />
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Combobox.Positioner>
        <Combobox.Content>
          {collection.items.length === 0 && !inputValue ? (
            /* Empty state with no input */
            <Span p="2" color="fg.muted">
              No Docker networks found. Type to create a new one.
            </Span>
          ) : collection.items.length === 0 && inputValue ? (
            /* No matches but has input - this shouldn't happen due to custom option */
            <Combobox.Empty>No matching networks found</Combobox.Empty>
          ) : (
            /* Network items */
            collection.items.map((item) => (
              <Combobox.Item item={item} key={item.value} padding="3">
                {renderItem(item)}
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))
          )}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
};

// Export the item type for use in parent components
export type { UnifiedNetworkItem as NetworkSelectorItem, NetworkInfo };
