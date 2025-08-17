// ServiceSelectorComboBox.tsx - Clean unified ServicesComboBox component
"use client";

import { useMemo, useState } from "react";
import {
  Combobox,
  useListCollection,
  HStack,
  Text,
  Badge,
  Stack,
  Span,
} from "@chakra-ui/react";

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
// CUSTOM FILTER LOGIC
// =============================================================================
const useCustomFilter = () => {
  return {
    filter: (
      itemText: string,
      filterText: string,
      item: UnifiedComboboxItem
    ): boolean => {
      if (!filterText.trim()) return true;

      const searchTerm = filterText.toLowerCase().trim();

      // Always show custom option when typing
      if (item.type === "custom") return true;

      // Search in label (service name)
      if (item.label.toLowerCase().includes(searchTerm)) return true;

      // Search in description
      if (item.description?.toLowerCase().includes(searchTerm)) return true;

      // Search in category
      if (item.category?.toLowerCase().includes(searchTerm)) return true;

      // Search in tags
      if (item.tags?.some((tag) => tag.toLowerCase().includes(searchTerm)))
        return true;

      // For services, also search in suggested roles
      if (item.type === "service" && item.data?.suggested_roles) {
        return item.data.suggested_roles.some((role) =>
          role.toLowerCase().includes(searchTerm)
        );
      }

      return false;
    },
  };
};

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

  // Fetch services from Docker Library API
  const { services, loading, error, source } = useDockerLibrary();

  // Create unified collection of services + custom option (using API data)
  const allItems = useMemo((): UnifiedComboboxItem[] => {
    const items: UnifiedComboboxItem[] = [];

    // Add services from Docker Library (roles are searchable via suggested_roles field)
    services.forEach((service) => {
      items.push({
        value: `service:${service.id}`,
        label: service.service_name,
        type: "service",
        description: service.description,
        category: service.category,
        tags: service.tags,
        data: service,
      });
    });

    // Add custom option (always available)
    items.push({
      value: "custom:new",
      label: `Add custom service: "${inputValue}"`,
      type: "custom",
      description: "Create a custom Docker service",
      data: null,
    });

    return items;
  }, [services, inputValue]);

  // Use custom filter with proper ChakraUI signature
  const { filter } = useCustomFilter();

  // Set up collection with custom filtering
  const { collection, filter: collectionFilter } = useListCollection({
    initialItems: allItems,
    filter: filter, // Now matches the expected signature
  });

  // Handle input changes
  const handleInputValueChange = (details: any) => {
    const newInputValue = details.inputValue;
    setInputValue(newInputValue);

    // Trigger custom filter
    collectionFilter(newInputValue);
  };

  // Handle selection
  const handleValueChange = (details: any) => {
    const selectedValue = details.value?.[0] || null;
    const selectedItem = selectedValue
      ? allItems.find((item) => item.value === selectedValue) || null
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

      {/* NO Portal - drawer context issue */}
      <Combobox.Positioner>
        <Combobox.Content>
          <Combobox.Empty>
            No matching services found in Docker Library
          </Combobox.Empty>
          {collection.items.map((item) => (
            <Combobox.Item item={item} key={item.value} padding="3" minH="16">
              {renderItem(item)}
              <Combobox.ItemIndicator />
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
};

// Export the item type for use in parent components
export type { UnifiedComboboxItem as ServicesComboBoxItem, DockerService };
