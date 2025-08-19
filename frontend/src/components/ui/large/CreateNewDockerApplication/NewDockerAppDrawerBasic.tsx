// NewDockerApplicationDrawer1.tsx - Logic-only fix for save without blur issue

import { useState, useRef } from "react";
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
import { SmartTagInput } from "../../small/SmartTagInput";

interface BasicConfigDrawerProps {
  onClose?: () => void;
}

export const NewDockDrawerStart = ({
  onClose,
}: BasicConfigDrawerProps = {}) => {
  const { newStack, setNewStack } = useNewStackStore();

  // Local state for x-meta
  const [appCategory, setAppCategory] = useState(
    newStack["x-meta"]?.category || ""
  );
  const [appTags, setAppTags] = useState<string[]>(
    newStack["x-meta"]?.tags || []
  );

  // NEW: Local state to track current input values (fixes save without blur bug)
  const [currentName, setCurrentName] = useState(newStack.name || "");
  const [currentDescription, setCurrentDescription] = useState(
    newStack.description || ""
  );

  // REMOVED: No more onBlur handlers that update the store immediately
  // Store updates now only happen on Save Configuration click

  // Handle input changes to track current values (but don't update store yet)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentName(e.target.value);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setCurrentDescription(e.target.value);
  };

  const handleSave = () => {
    // FIXED: Use current tracked values instead of relying on onBlur
    setNewStack((stack) => {
      // Update with current input values (fixes save without blur bug)
      stack.name = currentName;
      stack.description = currentDescription;

      if (!stack["x-meta"]) stack["x-meta"] = {};
      stack["x-meta"] = {
        ...stack["x-meta"],
        category: appCategory,
        tags: appTags.filter((tag) => tag.trim()),
        created_by: "en-dash",
        created_at: new Date().toISOString(),
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
              onChange={handleNameChange}
            />

            <TextAreaField
              label="Description"
              defaultValue={newStack.description}
              placeholder="Describe what this application does..."
              onChange={handleDescriptionChange}
            />
          </PropertySection>

          <PropertySection title="Organization & Metadata">
            <SelectField
              label="Application Category"
              options={applicationCategoryOptions}
              defaultValue={appCategory}
              onChange={(e) => setAppCategory(e.target.value)}
            />

            <HStack gap="2" w="full">
              <SmartTagInput
                label="Application Tags"
                value={appTags}
                onChange={setAppTags}
                placeholder="Enter tags like: web, database, monitoring..."
                maxTags={10}
              />
            </HStack>
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
          disabled={!currentName.trim()}
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
