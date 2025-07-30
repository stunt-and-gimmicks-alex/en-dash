"use client";

import {
  Badge,
  ColorSwatch,
  Group,
  HStack,
  Select,
  Span,
  Text,
  createListCollection,
  useSelectContext,
} from "@chakra-ui/react";
import { useMemo } from "react";
import { type StackContainer } from "@/services/apiService";

interface ContainerSelectorProps {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  items: StackContainer[];
}

export function ContainerSelector(props: ContainerSelectorProps) {
  const { defaultValue, value, onChange, items = [] } = props;
  const containers = useMemo(
    () =>
      createListCollection({
        items,
        itemToValue: (item) => item.id,
        itemToString: (item) => item.label,
      }),
    [items]
  );

  return (
    <Select.Root
      collection={containers}
      size="sm"
      defaultValue={defaultValue ? [defaultValue] : undefined}
      value={value ? [value] : undefined}
      onValueChange={(e) => onChange?.(e.value[0])}
      variant="subtle"
    >
      <Select.HiddenSelect />
      <Select.Label>
        <Text textStyle="sm" fontWeight="medium" color="fg.muted">
          Service Containers
        </Text>
      </Select.Label>
      <Select.Control bg="brand.surfaceContainerLowest">
        <Select.Trigger bg="brand.surfaceContainerLowest">
          <ValueContainer />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Select.Positioner>
        <Select.Content bg="brand.surfaceContainerLowest">
          {containers.items.map((container) => (
            <Select.Item
              item={container}
              key={container.id}
              bg="brand.surfaceContainerLowest"
              boxShadow="none"
            >
              <HStack>
                <Select.ItemIndicator />
                {container.label}
              </HStack>
              <Group attached maxW="80px" grow>
                <Badge variant="solid" colorPalette="gray" p="1">
                  <ColorSwatch
                    value={
                      container.status === "running"
                        ? "green"
                        : container.status === "partial"
                        ? "yellow"
                        : container.status === "stopped"
                        ? "red"
                        : "gray"
                    }
                    size="sm"
                  />
                  {container.status}
                </Badge>
              </Group>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
}

function ValueContainer() {
  const api = useSelectContext();
  const [container] = api.selectedItems as StackContainer[];

  // Use Select.ValueText for proper integration with ChakraUI v3 Select
  return (
    <Select.ValueText placeholder="Select container">
      {container && (
        <HStack gap="3" justify="flex-start">
          <Span>{container.label}</Span>
          <HStack gap="1">
            <Group attached maxW="80px" grow>
              <Badge
                variant="outline"
                colorPalette={
                  container.status === "running"
                    ? "green"
                    : container.status === "partial"
                    ? "yellow"
                    : container.status === "stopped"
                    ? "red"
                    : "gray"
                }
              >
                {container.status}
              </Badge>
            </Group>
          </HStack>
        </HStack>
      )}
    </Select.ValueText>
  );
}
