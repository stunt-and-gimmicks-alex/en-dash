import React from "react";
// import { stringify } from "yaml";

import {
  Card,
  DataList,
  Drawer,
  EmptyState,
  Flex,
  Stack,
} from "@chakra-ui/react";

import { PiCloudX } from "react-icons/pi";

// Keep container-block components as-is for now
// import { ContainerBlock } from "@/components/pageblocks/container-block/container-block";
// import { mapToStackContainers, apiService } from "@/services/apiService";
// import { validateStack } from "@/utils/stackValidation";

// import type { UnifiedNetworkItem } from "@/types/unified";

interface EditableDrawerTableProps {
  tabletitle?: string;
  items: any[];
}

export const EditableDrawerTable: React.FC<EditableDrawerTableProps> = ({
  tabletitle,
  items,
}) => {
  if (!items) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <PiCloudX />
          </EmptyState.Indicator>
          <Stack textAlign="center">
            <EmptyState.Title>Oops! We misplaced something.</EmptyState.Title>
            <EmptyState.Description>
              Looks like we either lost something or you somehow wandered into a
              back room. Try whatever you were doing again, or use the support
              options to figure out what's happening.
            </EmptyState.Description>
          </Stack>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  //  Dummy save function for now - will be wired up later
  // const handleSaveCompose = async (editedYaml: string) => {
  //    console.log("Saving compose file:", editedYaml);
  // TODO: Implement actual save functionality
  // This could call an API endpoint to update the compose file
  //  };

  //  const yaml_file_text: string = stringify(stack.compose_content);

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>{tabletitle || "Table"}</Drawer.Title>
      </Drawer.Header>
      <Drawer.Body>
        <Flex gap="2" direction="column">
          {items.map((l, i) => (
            <Card.Root key={i} borderRadius="0">
              <Card.Header py="4">
                <DataList.Root
                  orientation="horizontal"
                  justifyContent="space-between"
                  flex="content"
                  variant="bold"
                >
                  <Flex
                    direction="column"
                    justifyContent="space-between"
                    gap="1"
                  >
                    <DataList.Item>
                      <DataList.ItemLabel>Key:</DataList.ItemLabel>
                      <DataList.ItemValue color="brand.fg">
                        {l.key}
                      </DataList.ItemValue>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.ItemLabel>Value:</DataList.ItemLabel>
                      <DataList.ItemValue color="yellowBrand.fg">
                        {l.value}
                      </DataList.ItemValue>
                    </DataList.Item>
                  </Flex>
                </DataList.Root>
              </Card.Header>
              <Card.Body py="2">
                <DataList.Root
                  orientation="vertical"
                  justifyContent="space-between"
                  flex="content"
                  variant="bold"
                  size="sm"
                >
                  <Flex direction="row" justifyContent="space-between">
                    <DataList.Item>
                      <DataList.ItemLabel>Level</DataList.ItemLabel>
                      <DataList.ItemValue>{l.level}</DataList.ItemValue>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.ItemLabel>Category</DataList.ItemLabel>
                      <DataList.ItemValue>{l.category}</DataList.ItemValue>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.ItemLabel>Source</DataList.ItemLabel>
                      <DataList.ItemValue>{l.source}</DataList.ItemValue>
                    </DataList.Item>
                  </Flex>
                </DataList.Root>
              </Card.Body>
            </Card.Root>
          ))}
        </Flex>
      </Drawer.Body>
    </>
  );
};
