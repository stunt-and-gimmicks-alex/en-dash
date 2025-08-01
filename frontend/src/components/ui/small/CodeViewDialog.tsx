// src/components/ui/small/CodeViewDialog.tsx
// Generic code viewer dialog using ChakraUI v3 CodeBlock component

import React from "react";
import {
  Button,
  CodeBlock,
  createShikiAdapter,
  Dialog,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuFileText } from "react-icons/lu";
import type { HighlighterGeneric } from "shiki";

interface CodeViewDialogProps {
  code: string;
  language: string;
  title: string;
  triggerText?: string;
  triggerIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  showLineNumbers?: boolean;
}

export const CodeViewDialog: React.FC<CodeViewDialogProps> = ({
  code,
  language,
  title,
  triggerText = "View Code",
  triggerIcon = <LuFileText />,
  size = "lg",
  showLineNumbers = true,
}) => {
  const shikiAdapter = createShikiAdapter<HighlighterGeneric<any, any>>({
    async load() {
      const { createHighlighter } = await import("shiki");
      return createHighlighter({
        langs: ["yaml", "json", "javascript", "typescript", "bash", "docker"],
        themes: ["github-dark", "github-light"],
      });
    },
  });

  return (
    <Dialog.Root>
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
          <Dialog.Body p="2">
            <CodeBlock.AdapterProvider value={shikiAdapter}>
              <Stack gap="8">
                <CodeBlock.Root
                  size={size}
                  code={code}
                  meta={{ showLineNumbers }}
                  language={language}
                >
                  <CodeBlock.Header>
                    <CodeBlock.Title>{title}</CodeBlock.Title>
                  </CodeBlock.Header>
                  <CodeBlock.Content>
                    <CodeBlock.Code>
                      <CodeBlock.CodeText />
                    </CodeBlock.Code>
                  </CodeBlock.Content>
                </CodeBlock.Root>
              </Stack>
            </CodeBlock.AdapterProvider>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
