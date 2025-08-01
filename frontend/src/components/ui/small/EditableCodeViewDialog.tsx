// src/components/ui/small/EditableCodeViewDialog.tsx
// Editable code viewer dialog using ChakraUI v3 Editable component
// Built on top of CodeViewDialog with editing functionality

import React, { useState } from "react";
import {
  Button,
  CodeBlock,
  createShikiAdapter,
  Dialog,
  Editable,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuSave, LuX, LuFileText, LuFilePenLine } from "react-icons/lu";
import type { HighlighterGeneric } from "shiki";

interface EditableCodeViewDialogProps {
  code: string;
  language: string;
  title: string;
  triggerText?: string;
  triggerIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  showLineNumbers?: boolean;
  onSave: (editedCode: string) => void | Promise<void>;
  onCancel?: () => void;
  editable?: boolean;
  saveButtonText?: string;
  cancelButtonText?: string;
  editButtonText?: string;
}

export const EditableCodeViewDialog: React.FC<EditableCodeViewDialogProps> = ({
  code,
  language,
  title,
  triggerText = "View Code",
  triggerIcon = <LuFileText />,
  size = "lg",
  showLineNumbers = true,
  onSave,
  onCancel,
  editable = true,
  saveButtonText = "Save Changes",
  cancelButtonText = "Cancel",
  editButtonText = "Edit YAML",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);

  const shikiAdapter = createShikiAdapter<HighlighterGeneric<any, any>>({
    async load() {
      const { createHighlighter } = await import("shiki");
      return createHighlighter({
        langs: ["yaml", "json", "javascript", "typescript", "bash", "docker"],
        themes: ["github-dark", "github-light"],
      });
    },
  });

  const handleEdit = () => {
    setEditedCode(code); // Reset to original code when starting edit
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await onSave(editedCode);
      setIsEditing(false);
    } catch (error) {
      // Error handling could be added here (toast notification, etc.)
      console.error("Failed to save code:", error);
    }
  };

  const handleCancel = () => {
    setEditedCode(code); // Reset to original code
    setIsEditing(false);
    onCancel?.();
  };

  const handleDialogClose = () => {
    // Reset state when dialog closes
    setIsEditing(false);
    setEditedCode(code);
  };

  return (
    <Dialog.Root onExitComplete={handleDialogClose}>
      <Dialog.Trigger asChild>
        <Button
          size="sm"
          variant="outline"
          colorPalette="gray"
          _hover={{ borderColor: "brand.contrast/0" }}
          borderColor="brand.contrast"
          color={{
            base: "brand.contrast/75",
            _hover: "brand.contrast",
          }}
        >
          <HStack p="1" gap="1" cursor="pointer">
            <Text textStyle="xs">{triggerText}</Text>
            {triggerIcon}
          </HStack>
        </Button>
      </Dialog.Trigger>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="brand.surfaceContainer" maxW="4xl" w="90vw">
          <Dialog.CloseTrigger />
          <Dialog.Header bg="brand.primaryContainer">
            <Dialog.Title bg="brand.primaryContainer">{title}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body p="2">
            {isEditing ? (
              // Edit mode - show Editable component in editing state
              <Stack gap="4">
                <Editable.Root
                  value={editedCode}
                  onValueChange={(details) => setEditedCode(details.value)}
                  placeholder="Enter your YAML content..."
                  edit={true}
                  selectOnFocus={false}
                >
                  <Editable.Textarea
                    minH="500px"
                    maxH="70vh"
                    p="4"
                    bg="brand.surfaceContainerLowest"
                    borderRadius="md"
                    fontFamily="mono"
                    fontSize="sm"
                    whiteSpace="pre"
                    overflow="auto"
                    border="1px solid"
                    borderColor="brand.primary"
                    resize="none"
                    _focus={{
                      borderColor: "brand.primary",
                      boxShadow: "0 0 0 1px var(--chakra-colors-brand-primary)",
                    }}
                  />
                </Editable.Root>
              </Stack>
            ) : (
              // View mode - show CodeBlock
              <CodeBlock.AdapterProvider value={shikiAdapter}>
                <Stack gap="8">
                  <CodeBlock.Root
                    size={size}
                    code={code}
                    meta={{ showLineNumbers }}
                    language={language}
                  >
                    <CodeBlock.Content>
                      <CodeBlock.Code>
                        <CodeBlock.CodeText />
                      </CodeBlock.Code>
                    </CodeBlock.Content>
                  </CodeBlock.Root>
                </Stack>
              </CodeBlock.AdapterProvider>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            {isEditing ? (
              // Edit mode buttons
              <HStack gap="2">
                <Button
                  variant="outline"
                  colorPalette="gray"
                  onClick={handleCancel}
                >
                  <LuX />
                  {cancelButtonText}
                </Button>
                <Button colorPalette="brand" onClick={handleSave}>
                  <LuSave />
                  {saveButtonText}
                </Button>
              </HStack>
            ) : (
              // View mode button
              editable && (
                <Button
                  variant="outline"
                  colorPalette="brand"
                  onClick={handleEdit}
                >
                  <LuFilePenLine />
                  {editButtonText}
                </Button>
              )
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
