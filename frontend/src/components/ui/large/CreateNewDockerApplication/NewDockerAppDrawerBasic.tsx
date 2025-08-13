// NewDockerApplicationDrawer1.tsx - Wired basic configuration drawer

import { useState } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";
import {
  Button,
  Drawer,
  Stack,
  CloseButton,
  HStack,
  Text,
  IconButton,
  Input,
  Field,
} from "@chakra-ui/react";
import {
  SelectField,
  TextField,
  TextAreaField,
} from "./NewDockerApplicationDrawerFields";
import { PropertySection } from "./NewDockerApplicationDrawerPropSection";
import { PiPlus, PiX } from "react-icons/pi";

interface BasicConfigDrawerProps {
  onClose?: () => void;
}

export const NewDockDrawerStart = ({
  onClose,
}: BasicConfigDrawerProps = {}) => {
  const { newStack, setNewStack } = useNewStackStore();

  // Local state for x-meta
  const [appCategory, setAppCategory] = useState(
    newStack.configs["x-meta"]?.category || ""
  );
  const [appTags, setAppTags] = useState<string[]>(
    newStack.configs["x-meta"]?.tags || []
  );

  const setStackName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewStack((stack) => {
      stack.name = e.target.value;
    });
  };

  const setStackDescription = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewStack((stack) => {
      stack.description = e.target.value;
    });
  };

  const handleSave = () => {
    setNewStack((stack) => {
      if (!stack.configs) stack.configs = {};
      stack.configs["x-meta"] = {
        category: appCategory,
        tags: appTags.filter((tag) => tag.trim()),
      };
    });

    // Close drawer and trigger re-render
    onClose?.();
  };

  const handleCancel = () => {
    // Just close the drawer without saving
    onClose?.();
  };

  const addTag = () => {
    setAppTags([...appTags, ""]);
  };

  const updateTag = (index: number, value: string) => {
    const newTags = [...appTags];
    newTags[index] = value;
    setAppTags(newTags);
  };

  const removeTag = (index: number) => {
    setAppTags(appTags.filter((_, i) => i !== index));
  };

  const applicationCategoryOptions = [
    { value: "", label: "Select a category..." },
    { value: "media-stack", label: "Media Stack" },
    { value: "development", label: "Development Environment" },
    { value: "productivity", label: "Productivity Suite" },
    { value: "monitoring", label: "Monitoring & Observability" },
    { value: "security", label: "Security & Privacy" },
    { value: "networking", label: "Networking & Proxy" },
    { value: "storage", label: "Storage & Backup" },
    { value: "automation", label: "Automation & DevOps" },
    { value: "communication", label: "Communication & Collaboration" },
    { value: "gaming", label: "Gaming & Entertainment" },
    { value: "utility", label: "Utility & Tools" },
  ];

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>New Docker Application: Basic Configuration</Drawer.Title>
      </Drawer.Header>

      <Drawer.Body colorPalette="secondaryBrand">
        <Stack px="4" pt="4" pb="6" gap="6">
          <PropertySection title="Application Details">
            <TextField
              label="Application Name"
              defaultValue={newStack.name}
              placeholder="Enter a memorable name... like 'My Web App'"
              onChange={setStackName}
            />

            <TextAreaField
              label="Description"
              defaultValue={newStack.description}
              placeholder="Describe what this application does..."
              onChange={setStackDescription}
            />
          </PropertySection>

          <PropertySection title="Organization & Metadata">
            <SelectField
              label="Application Category"
              options={applicationCategoryOptions}
              defaultValue={appCategory}
              onChange={(e) => setAppCategory(e.target.value)}
            />

            <Stack gap="3">
              <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">
                  Application Tags
                </Text>
                <Button size="xs" variant="ghost" onClick={addTag}>
                  <PiPlus />
                </Button>
              </HStack>

              <Stack gap="2">
                {appTags.map((tag, index) => (
                  <HStack key={index} gap="2">
                    <Input
                      size="sm"
                      flex="1"
                      value={tag}
                      placeholder="Enter tag"
                      onChange={(e) => updateTag(index, e.target.value)}
                    />
                    <IconButton
                      size="sm"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => removeTag(index)}
                    >
                      <PiX />
                    </IconButton>
                  </HStack>
                ))}

                {appTags.length === 0 && (
                  <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                    No tags configured
                  </Text>
                )}
              </Stack>
            </Stack>
          </PropertySection>

          <PropertySection title="Quick Templates (Coming Soon)">
            <SelectField
              label="Application Template"
              defaultValue="custom"
              disabled
              options={[
                { label: "Custom Application", value: "custom" },
                { label: "WordPress + MySQL", value: "wordpress" },
                { label: "React + NGINX", value: "react_nginx" },
                { label: "Node.js API", value: "nodejs_api" },
                { label: "Plex Media Server", value: "plex" },
              ]}
            />
            <Button
              disabled
              variant="outline"
              w="full"
              size="sm"
              colorPalette="gray"
            >
              Load Template (Coming Soon)
            </Button>
          </PropertySection>
        </Stack>
      </Drawer.Body>

      <Drawer.Footer gap="3">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          colorPalette="brand"
          disabled={!newStack.name}
          onClick={handleSave}
        >
          Save Configuration
        </Button>
      </Drawer.Footer>

      <Drawer.CloseTrigger asChild>
        <CloseButton size="sm" />
      </Drawer.CloseTrigger>
    </>
  );
};
