"use client";

import {
  Badge,
  ColorSwatch,
  Group,
  HStack,
  Select,
  Span,
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
  const containers = useMemo(() => createListCollection({ items }), [items]);
  console.log(defaultValue);
  return (
    <Select.Root
      collection={containers}
      size="sm"
      defaultValue={defaultValue ? [defaultValue] : undefined}
      value={value ? [value] : undefined}
      onValueChange={(e) => onChange?.(e.value[0])}
    >
      <Select.HiddenSelect />
      <Select.Label>Select theme</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <ValueContainer />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {containers.items.map((container) => (
            <Select.Item item={container} key={container.id}>
              <HStack>
                <Select.ItemIndicator />
                {container.label}
              </HStack>
              <Group attached maxW="80px" grow>
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
                <Badge variant="outline" colorPalette="grey">
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
  return (
    <HStack gap="3">
      <Span>{container?.label ?? "Select container"}</Span>
      {container && (
        <HStack gap="1">
          <Group attached maxW="80px" grow>
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
            <Badge variant="outline" colorPalette="grey">
              {container.status}
            </Badge>
          </Group>
        </HStack>
      )}
    </HStack>
  );
}
