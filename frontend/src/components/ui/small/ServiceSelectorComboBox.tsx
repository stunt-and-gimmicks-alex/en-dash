// FilterableCombobox.tsx - Reusable, generic combobox component
// Focuses on logic and data handling, minimal UI styling

import { useMemo } from "react";
import {
  Combobox,
  Portal,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";

// =============================================================================
// GENERIC TYPES - Reusable for any data
// =============================================================================
export interface ComboboxItem {
  value: string;
  label: string;
  disabled?: boolean;
  data?: any; // Allow arbitrary data attachment
}

export interface FilterableComboboxProps {
  items: ComboboxItem[];
  value?: string;
  onValueChange?: (value: string | null, item: ComboboxItem | null) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "outline" | "subtle" | "flushed";
  width?: string;
  filterEnabled?: boolean;
  emptyMessage?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const FilterableCombobox: React.FC<FilterableComboboxProps> = ({
  items,
  value,
  onValueChange,
  placeholder = "Select an option...",
  label,
  disabled = false,
  size = "sm",
  variant = "outline",
  width = "full",
  filterEnabled = true,
  emptyMessage = "No items found",
}) => {
  // ChakraUI v3 filtering hook
  const { contains } = useFilter({ sensitivity: "base" });

  // Create collection with proper filtering
  const { collection, filter } = useListCollection({
    initialItems: items,
    filter: filterEnabled ? contains : undefined,
    itemToValue: (item) => item.value,
    itemToString: (item) => item.label,
    isItemDisabled: (item) => item.disabled || false,
  });

  // Handle selection changes
  const handleValueChange = (details: any) => {
    const selectedValue = details.value?.[0] || null;
    const selectedItem = selectedValue
      ? items.find((item) => item.value === selectedValue) || null
      : null;

    onValueChange?.(selectedValue, selectedItem);
  };

  return (
    <Combobox.Root
      collection={collection}
      value={value ? [value] : []}
      onValueChange={handleValueChange}
      onInputValueChange={
        filterEnabled ? (e) => filter(e.inputValue) : undefined
      }
      disabled={disabled}
      size={size}
      variant={variant}
      width={width}
    >
      {label && <Combobox.Label>{label}</Combobox.Label>}
      <Combobox.Control>
        <Combobox.Input placeholder={placeholder} />
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content>
            <Combobox.Empty>{emptyMessage}</Combobox.Empty>
            {collection.items.map((item) => (
              <Combobox.Item item={item} key={item.value}>
                {item.label}
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  );
};

// =============================================================================
// SERVICE-SPECIFIC TYPES - For the Docker service use case
// =============================================================================
export interface DockerService {
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
// SERVICE SELECTOR LOGIC - Converts services to combobox items
// =============================================================================
export const useServiceComboboxData = (
  services: DockerService[],
  selectedRole?: string
) => {
  return useMemo(() => {
    // Filter services by role if specified
    const filteredServices = selectedRole
      ? services.filter((service) =>
          service.suggested_roles.includes(selectedRole)
        )
      : services;

    // Sort by popularity score (highest first)
    const sortedServices = [...filteredServices].sort(
      (a, b) => b.popularity_score - a.popularity_score
    );

    // Convert to combobox items
    return sortedServices.map((service) => ({
      value: service.id,
      label: service.service_name,
      data: service, // Attach full service data
    }));
  }, [services, selectedRole]);
};
