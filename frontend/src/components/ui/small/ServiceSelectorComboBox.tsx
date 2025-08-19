// ServiceSelectorComboBox.tsx - Fixed async implementation with ChakraUI v3 pattern
"use client";

import { useState } from "react";
import {
  Combobox,
  useListCollection,
  HStack,
  Text,
  Badge,
  Stack,
  Span,
  Spinner,
} from "@chakra-ui/react";
import { useAsync } from "react-use";

import {
  useDockerLibrary,
  type DockerService,
} from "@/hooks/v06-useDockerLibrary";

// =============================================================================
// TYPES
// =============================================================================
interface UnifiedComboboxItem {
  value: string;
  label: string;
  type: "service" | "custom";
  data?: DockerService | null;
  description?: string;
  category?: string;
  tags?: string[];
}

interface ServicesComboBoxProps {
  value?: string;
  onValueChange?: (
    value: string | null,
    item: UnifiedComboboxItem | null
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
export const ServicesComboBox: React.FC<ServicesComboBoxProps> = ({
  value,
  onValueChange,
  placeholder = "Search roles or services...",
  label,
  disabled = false,
  size = "sm",
  variant = "outline",
}) => {
  const [inputValue, setInputValue] = useState("");

  // Set up collection for async loading
  const { collection, set } = useListCollection<UnifiedComboboxItem>({
    initialItems: [],
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
  });

  // Fetch services from Docker Library API
  const { services, loading, error, source } = useDockerLibrary();

  // Use async pattern to update collection when services or inputValue changes
  const state = useAsync(async () => {
    // Wait for services to load first
    if (loading) return;

    // 🐛 DEBUG: Log the raw data structure received from backend
    console.log("🔍 DEBUG - Raw services data:", {
      services,
      servicesType: typeof services,
      isArray: Array.isArray(services),
      length: services?.length,
      firstItem: services?.[0],
      loading,
      error,
    });

    const items: UnifiedComboboxItem[] = [];
    const searchTerm = inputValue.toLowerCase().trim();

    // Add services from Docker Library (with filtering)
    if (services && Array.isArray(services)) {
      services.forEach((service) => {
        // Apply search filtering
        if (
          !searchTerm ||
          service.service_name.toLowerCase().includes(searchTerm) ||
          service.description.toLowerCase().includes(searchTerm) ||
          service.category.toLowerCase().includes(searchTerm) ||
          service.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
          service.suggested_roles.some((role) =>
            role.toLowerCase().includes(searchTerm)
          )
        ) {
          // FIX: Extract actual ID from SurrealDB object structure
          const serviceId =
            typeof service.id === "object" && service.id?.id
              ? service.id.id
              : service.id ||
                service.service_name.toLowerCase().replace(/[^a-z0-9]/g, "_");

          items.push({
            value: `service:${serviceId}`,
            label: service.service_name,
            type: "service",
            description: service.description,
            category: service.category,
            tags: service.tags,
            data: service,
          });
        }
      });
    }

    // Add custom option (always available when typing)
    if (inputValue.trim()) {
      items.push({
        value: "custom:new",
        label: `Add custom service: "${inputValue}"`,
        type: "custom",
        description: "Create a custom Docker service",
        data: null,
      });
    }

    // Update the collection
    set(items);
  }, [services, loading, inputValue, set]);

  // Handle input changes
  const handleInputValueChange = (details: any) => {
    setInputValue(details.inputValue);
  };

  // Handle selection
  const handleValueChange = (details: any) => {
    const selectedValue = details.value?.[0] || null;
    const selectedItem = selectedValue
      ? collection.items.find((item) => item.value === selectedValue) || null
      : null;

    console.log("ServicesComboBox selection:", {
      selectedValue,
      selectedItem,
    });

    onValueChange?.(selectedValue, selectedItem);
  };

  // Custom item renderer
  const renderItem = (item: UnifiedComboboxItem) => {
    switch (item.type) {
      case "service":
        return (
          <HStack justify="space-between" w="full">
            <Stack gap="1" flex="1">
              <Text fontWeight="medium" fontSize="sm">
                {item.label}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {item.description}
              </Text>
              {item.tags && item.tags.length > 0 && (
                <HStack gap="1" flexWrap="wrap">
                  {item.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} size="xs" variant="outline">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 && (
                    <Span fontSize="xs" color="fg.muted">
                      +{item.tags.length - 3} more
                    </Span>
                  )}
                </HStack>
              )}
            </Stack>
            <Badge size="sm" variant="subtle" colorScheme="green">
              Service
            </Badge>
          </HStack>
        );

      case "custom":
        return (
          <HStack justify="space-between" w="full">
            <Stack gap="1" flex="1">
              <Text fontWeight="medium" fontSize="sm">
                {inputValue ? `Add "${inputValue}"` : "Add custom service"}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Create a custom Docker service configuration
              </Text>
            </Stack>
            <Badge size="sm" variant="subtle" colorScheme="orange">
              Custom
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
          {/* Loading state */}
          {loading || state.loading ? (
            <HStack p="2">
              <Spinner size="xs" borderWidth="1px" />
              <Span>Loading services...</Span>
            </HStack>
          ) : error || state.error ? (
            /* Error state */
            <Span p="2" color="fg.error">
              {error || "Error loading services"}
            </Span>
          ) : collection.items.length === 0 ? (
            /* Empty state */
            <Combobox.Empty>
              No matching services found in Docker Library
            </Combobox.Empty>
          ) : (
            /* Items */
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
export type { UnifiedComboboxItem as ServicesComboBoxItem, DockerService };
