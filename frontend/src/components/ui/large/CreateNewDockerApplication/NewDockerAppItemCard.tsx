// NewDockerAppItemCard.tsx - Wired card with edit/delete functionality

import React from "react";
import {
  CheckboxCard,
  For,
  Group,
  HStack,
  IconButton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { PiPencilSimple, PiX } from "react-icons/pi";
import { toaster } from "@/components/ui/toaster";

interface ConfigCardProps {
  labels: string[] | string;
  onEdit?: (index?: number) => void;
  onDelete?: (index?: number) => void;
}

export const AppConfigCard = (props: ConfigCardProps) => {
  const { labels, onEdit, onDelete } = props;

  // Convert to array format for consistent handling
  const labelArray = Array.isArray(labels) ? labels : [labels];

  const handleDelete = (index?: number) => {
    const itemName = index !== undefined ? labelArray[index] : labelArray[0];

    // Show confirmation toast with action
    toaster.create({
      title: "Confirm Deletion",
      description: `Are you sure you want to delete "${itemName}"?`,
      type: "error",
      duration: 10000, // Give user time to decide
      action: {
        label: "Delete",
        onClick: () => {
          onDelete?.(index);
          toaster.success({
            title: "Deleted",
            description: `"${itemName}" has been removed.`,
          });
        },
      },
      closable: true,
    });
  };

  const handleEdit = (index?: number) => {
    onEdit?.(index);
  };

  return (
    <Stack w="full">
      <For
        each={labelArray}
        fallback={
          <Group attached borderWidth="1px" w="full" orientation="horizontal">
            <CheckboxCard.Root
              size="sm"
              h="1.8lh"
              justifyContent="center"
              borderRadius="0"
              borderWidth="0"
              orientation="horizontal"
            >
              <CheckboxCard.HiddenInput />
              <HStack>
                <CheckboxCard.Control>
                  <CheckboxCard.Label color="fg">
                    App:{" "}
                    <Text
                      color={{
                        base: "brandSecondary.800",
                        _dark: "brandSecondary.500",
                      }}
                    >
                      {labels}
                    </Text>
                  </CheckboxCard.Label>
                </CheckboxCard.Control>
                <IconButton
                  aria-label="Edit Component"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit()}
                >
                  <PiPencilSimple />
                </IconButton>
                <IconButton
                  aria-label="Delete Component"
                  variant="ghost"
                  size="sm"
                  colorPalette="redBrand"
                  onClick={() => handleDelete()}
                >
                  <PiX />
                </IconButton>
              </HStack>
            </CheckboxCard.Root>
          </Group>
        }
      >
        {(item, index) => (
          <Group
            attached
            borderWidth="1px"
            w="full"
            orientation="horizontal"
            key={index}
          >
            <CheckboxCard.Root
              size="sm"
              h="1.8lh"
              justifyContent="center"
              borderRadius="0"
              borderWidth="0"
              orientation="horizontal"
            >
              <CheckboxCard.HiddenInput />
              <HStack>
                <CheckboxCard.Control>
                  <CheckboxCard.Label color="fg">
                    App: <Text color="brandSecondary.500">{item}</Text>
                  </CheckboxCard.Label>
                </CheckboxCard.Control>
                <IconButton
                  aria-label="Edit Component"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(index)}
                >
                  <PiPencilSimple />
                </IconButton>
                <IconButton
                  aria-label="Delete Component"
                  variant="ghost"
                  size="sm"
                  colorPalette="redBrand"
                  onClick={() => handleDelete(index)}
                >
                  <PiX />
                </IconButton>
              </HStack>
            </CheckboxCard.Root>
          </Group>
        )}
      </For>
    </Stack>
  );
};
