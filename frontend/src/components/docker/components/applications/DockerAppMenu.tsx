import React, { useMemo } from "react";
import {
  Box,
  Button,
  EmptyState,
  HStack,
  Icon,
  Menu,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { UnifiedStack } from "@/types/unified";
import { stringify } from "yaml";
import { EditableCodeViewDialog } from "@/components/ui/small/EditableCodeViewDialog";
import { StackValidationAccordion } from "./StackValidationAccordion";
import {
  PiArrowsClockwise,
  PiArrowsCounterClockwise,
  PiCloudX,
  PiDotsThreeCircle,
  PiDownload,
  PiExam,
  PiFileCode,
  PiPencilSimpleLine,
  PiPower,
} from "react-icons/pi";

// Keep container-block components as-is for now
// import { ContainerBlock } from "@/components/pageblocks/container-block/container-block";
// import { mapToStackContainers, apiService } from "@/services/apiService";
// import { validateStack } from "@/utils/stackValidation";

import { useSelectedStackStore } from "@/stores/selectedStackStore";
import { useStackActions } from "@/hooks/v06-useStackActions";
import { useStack } from "@/hooks/v06-useStacks";

export const DockerAppDetailMenu: React.FC = () => {
  const selectedStackName = useSelectedStackStore(
    (state) => state.selectedStackName
  );

  if (!selectedStackName) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <PiCloudX />
          </EmptyState.Indicator>
          <Stack textAlign="center">
            <EmptyState.Title>Stack Not Found</EmptyState.Title>
            <EmptyState.Description>
              En–Dash was unable to find a name for this stack, or a name was
              not passed.
            </EmptyState.Description>
          </Stack>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }
  const { startStack, stopStack, restartStack } = useStackActions();
  const { stack } = useStack(selectedStackName);

  if (!stack) {
    return (
      <HStack>
        <Spinner size="md" />
        <Text color="fg.muted">Loading...</Text>
      </HStack>
    );
  }
  const handleStart = () => startStack(selectedStackName);
  const handleStop = () => stopStack(selectedStackName);
  const handleRestart = () => restartStack(selectedStackName);

  const services = Object.values(stack.services || {});

  // Dummy save function for now - will be wired up later
  const handleSaveCompose = async (editedYaml: string) => {
    console.log("Saving compose file:", editedYaml);
    // TODO: Implement actual save functionality
    // This could call an API endpoint to update the compose file
  };

  const yaml_file_text: string = stringify(stack.compose_content);
  return (
    <HStack colorPalette="brand">
      <Menu.Root variant="solid">
        <Menu.Trigger asChild>
          <Button size="sm" variant="ghost" color="#fff">
            <PiDotsThreeCircle />
            Actions
          </Button>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content bg="brand.bg">
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>Power</Menu.ItemGroupLabel>
              <Menu.Item
                value="app-start"
                color={{ base: "brand.fg", _hover: "brand.contrast" }}
                onSelect={handleStart}
              >
                <Icon>
                  <PiPower />
                </Icon>
                <Box flex="1">Start App</Box>
                <Menu.ItemCommand>Ctrl+S</Menu.ItemCommand>
              </Menu.Item>
              <Menu.Item
                value="app-stop"
                bg={{ _hover: "brand.errorContainer" }}
                color={{ base: "brand.error", _hover: "brand.contrast" }}
                onSelect={handleStop}
              >
                <Icon>
                  <PiPower />
                </Icon>
                <Box flex="1">Stop App</Box>
                <Menu.ItemCommand>Ctrl+S</Menu.ItemCommand>
              </Menu.Item>
              <Menu.Item
                value="app-restart"
                bg={{ _hover: "secondaryBrand.solid" }}
                color={{
                  base: "secondaryBrand.fg",
                  _hover: "brand.contrast",
                }}
                onSelect={handleRestart}
              >
                <Icon>
                  <PiArrowsCounterClockwise />
                </Icon>
                <Box flex="1">Restart App</Box>
                <Menu.ItemCommand>Ctrl+R</Menu.ItemCommand>
              </Menu.Item>
            </Menu.ItemGroup>
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>Status</Menu.ItemGroupLabel>
              <Menu.Item value="app-update">
                <Icon>
                  <PiDownload />
                </Icon>
                <Box flex="1">Update App</Box>
                <Menu.ItemCommand>Ctrl+U</Menu.ItemCommand>
              </Menu.Item>
              <Menu.Item value="app-sync">
                <Icon>
                  <PiArrowsClockwise />
                </Icon>
                <Box flex="1">Sync App</Box>
                <Menu.ItemCommand>Ctrl+Y</Menu.ItemCommand>
              </Menu.Item>
            </Menu.ItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
      <Menu.Root variant="solid">
        <Menu.Trigger asChild>
          <Button size="sm" variant="ghost" color="#fff">
            <PiDotsThreeCircle />
            Edit
          </Button>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content bg="brand.bg">
            <Menu.Item value="app-edit-yaml">
              {/* Currently not working, I suspect because of weird DOM issues with the menu. Will need to look into Portal or similar OR better yet, change into a drawer! */}
              <Icon>
                <PiFileCode />
              </Icon>
              <EditableCodeViewDialog
                size="sm"
                color="#ffffff"
                code={yaml_file_text}
                language="yaml"
                title={stack.compose_file}
                triggerText="View Compose"
                onSave={handleSaveCompose}
                editable={true}
                editButtonText="Edit YAML"
              />
              <Menu.ItemCommand>Ctrl+Y</Menu.ItemCommand>
            </Menu.Item>
            <Menu.Item value="app-edit-info">
              <Icon>
                <PiPencilSimpleLine />
              </Icon>
              <Box flex="1">Edit App Info</Box>
              <Menu.ItemCommand>Ctrl+E</Menu.ItemCommand>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
      <Button size="sm" variant="ghost" color="#fff">
        <PiExam />
        <StackValidationAccordion stack={stack} />
      </Button>
    </HStack>
  );
};
