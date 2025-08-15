// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░ Functionality Imports ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import React, { useState } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░   Component Imports   ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  ClientOnly,
  CodeBlock,
  Container,
  createShikiAdapter,
  Flex,
  Float,
  Heading,
  HStack,
  Icon,
  IconButton,
  SimpleGrid,
  Stack,
  Steps,
  Text,
  useSteps,
} from "@chakra-ui/react";
import type { HighlighterGeneric } from "shiki";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      Icon Imports     ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import {
  PiFileCode,
  PiLightning,
  PiUpload,
  PiCode,
  PiArrowRight,
} from "react-icons/pi";
import { FaHatWizard } from "react-icons/fa";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      App Imports      ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import { NewDockerAppWizard } from "@/components/ui/large/CreateNewDockerApplication/NewDockerApplicationForm";
import { useColorMode } from "@/components/ui/color-mode";
import { FaDocker } from "react-icons/fa6";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      Types & Config   ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
type CreationMode = "select" | "upload" | "editor" | "wizard";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      Main Component   ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
export const NewDockerApplication: React.FC = () => {
  const { newStack, generateYaml, resetStack } = useNewStackStore();
  const [currentMode, setCurrentMode] = useState<CreationMode>("select");
  const { colorMode } = useColorMode();

  // All hooks must be called at the top level
  const items = [
    {
      title: "Step 1",
      description: "Step 1 description",
    },
    {
      title: "Step 2",
      description: "Step 2 description",
    },
    {
      title: "Step 3",
      description: "Step 3 description",
    },
  ];

  const steps = useSteps({
    defaultStep: 0,
    count: items.length,
  });

  // Shiki adapter for code highlighting
  const shikiAdapter = createShikiAdapter<HighlighterGeneric<any, any>>({
    async load() {
      const { createHighlighter } = await import("shiki");
      return createHighlighter({
        langs: ["yaml", "json", "javascript", "typescript", "bash", "docker"],
        themes: ["github-dark", "github-light"],
      });
    },
  });

  // Reset stack when returning to mode selection
  const handleBackToSelection = () => {
    resetStack();
    setCurrentMode("select");
  };

  const handleModeSelect = (mode: CreationMode) => {
    resetStack(); // Clear any existing data
    setCurrentMode(mode);
  };

  // Mode Selection Screen
  if (currentMode === "select") {
    return (
      <Box
        colorPalette="brand"
        w="full"
        p="6"
        bg="bg"
        justifyItems="center"
        maxH="90dvh"
        overflow="clip"
      >
        <Container maxW="6xl" py="20">
          <Stack gap="12" align="center">
            {/* Header */}
            <Stack gap="6" textAlign="center">
              <HStack justifyContent="center" gap="4">
                <Icon size="2xl" color="brand.500">
                  <FaDocker />
                </Icon>
              </HStack>
              <Stack gap="2">
                <Heading textStyle="4xl">Create New Docker Application</Heading>
                <Text color="fg.muted" textStyle="lg">
                  Choose how you'd like to create your Docker Compose
                  application
                </Text>
              </Stack>
            </Stack>

            {/* Mode Selection Cards */}
            <SimpleGrid
              columns={{ base: 1, md: 3 }}
              gap="6"
              w="full"
              maxW="5xl"
            >
              {/* Upload Existing File */}
              <Card.Root
                variant="elevated"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  transform: "translateY(-2px)",
                  shadow: "lg",
                }}
                onClick={() => handleModeSelect("upload")}
              >
                <Card.Header textAlign="center" pb="4">
                  <Icon size="2xl" color="blue.500" mx="auto" mb="4">
                    <PiUpload />
                  </Icon>
                  <Card.Title textStyle="xl">Upload Compose File</Card.Title>
                </Card.Header>
                <Card.Body textAlign="center" pt="0">
                  <Text color="fg.muted" mb="6">
                    Already have a docker-compose.yml file? Upload it and we'll
                    help you deploy and manage it.
                  </Text>
                  <Stack gap="2" fontSize="sm" color="fg.muted">
                    <Text>• Validate existing configurations</Text>
                    <Text>• Check for common issues</Text>
                    <Text>• Quick deployment</Text>
                  </Stack>
                </Card.Body>
                <Card.Footer justifyContent="center">
                  <Button variant="outline">
                    Choose File
                    <PiArrowRight />
                  </Button>
                </Card.Footer>
              </Card.Root>

              {/* Write From Scratch */}
              <Card.Root
                variant="elevated"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  transform: "translateY(-2px)",
                  shadow: "lg",
                }}
                onClick={() => handleModeSelect("editor")}
              >
                <Card.Header textAlign="center" pb="4">
                  <Icon size="2xl" color="green.500" mx="auto" mb="4">
                    <PiCode />
                  </Icon>
                  <Card.Title textStyle="xl">Write From Scratch</Card.Title>
                </Card.Header>
                <Card.Body textAlign="center" pt="0">
                  <Text color="fg.muted" mb="6">
                    Prefer to write YAML directly? Use our editor with syntax
                    highlighting and validation.
                  </Text>
                  <Stack gap="2" fontSize="sm" color="fg.muted">
                    <Text>• Full YAML editor</Text>
                    <Text>• Syntax highlighting</Text>
                    <Text>• Real-time validation</Text>
                  </Stack>
                </Card.Body>
                <Card.Footer justifyContent="center">
                  <Button variant="outline">
                    Open Editor
                    <PiArrowRight />
                  </Button>
                </Card.Footer>
              </Card.Root>

              {/* Guided Wizard */}
              <Card.Root
                variant="elevated"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  transform: "translateY(-2px)",
                  shadow: "lg",
                }}
                onClick={() => handleModeSelect("wizard")}
              >
                <Card.Header textAlign="center" pb="4">
                  <Icon size="2xl" color="purple.500" mx="auto" mb="4">
                    <FaHatWizard />
                  </Icon>
                  <Card.Title textStyle="xl">Creation Wizard</Card.Title>
                </Card.Header>
                <Card.Body textAlign="center" pt="0">
                  <Text color="fg.muted" mb="6">
                    Step-by-step guided process to build your Docker application
                    with helpful prompts.
                  </Text>
                  <Stack gap="2" fontSize="sm" color="fg.muted">
                    <Text>• Guided configuration</Text>
                    <Text>• Best practice suggestions</Text>
                    <Text>• Beginner friendly</Text>
                  </Stack>
                </Card.Body>
                <Card.Footer justifyContent="center">
                  <Button colorPalette="purple" variant="solid">
                    Start Wizard
                    <PiArrowRight />
                  </Button>
                </Card.Footer>
              </Card.Root>
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>
    );
  }

  // Wizard Mode (original layout restored)
  if (currentMode === "wizard") {
    // Dummy YAML file for preview
    const file = {
      code:
        generateYaml() ||
        `# Start configuring your application
# Your compose file will appear here as you build it

version: "3.8"
services:
  # Add services using the wizard...
  
networks:
  # Networks will be configured here...
  
volumes:  
  # Volumes will be configured here...`,
      language: "yaml",
      title: "compose.yaml",
    };

    return (
      <Box
        colorPalette="brand"
        w="full"
        p="6"
        bg="bg"
        justifyItems="center"
        maxH="93dvh"
        overflow="clip"
      >
        <Flex justifyContent="space-evenly" w="full" gap="6">
          <Card.Root w="1/2" borderRadius="0">
            <Card.Header
              gap="6"
              flexDirection={{ base: "column", md: "row" }}
              justifyContent="center"
              alignItems="center"
              pb="2"
            >
              <Icon size="2xl">
                <FaHatWizard />
              </Icon>
              <Stack gap="0" pb="0">
                <Card.Description>Docker Application Wizard</Card.Description>
                <Card.Title textStyle="2xl" pb="0">
                  Let's Create A New Docker Application!
                </Card.Title>
              </Stack>
            </Card.Header>
            <Card.Body gap="4" px="6" py="1">
              <Steps.RootProvider orientation="vertical" value={steps}>
                <Steps.List w="full">
                  <NewDockerAppWizard />
                </Steps.List>
                <Steps.CompletedContent>
                  All steps are complete!
                </Steps.CompletedContent>
              </Steps.RootProvider>
            </Card.Body>
            <Card.Footer p="6" justifyContent="right">
              <ButtonGroup>
                <Button variant="outline" onClick={handleBackToSelection}>
                  <PiArrowRight style={{ transform: "rotate(180deg)" }} />
                  Back to Mode Selection
                </Button>

                <Button colorPalette="redBrand" variant="solid" color="white">
                  Cancel
                </Button>

                <Button
                  disabled={
                    !(
                      newStack.name &&
                      newStack.services &&
                      Object.keys(newStack.services).length > 0 &&
                      Object.keys(newStack.networks || {}).length > 0 &&
                      Object.keys(newStack.volumes || {}).length > 0
                    )
                  }
                >
                  Save and Deploy <PiLightning />
                </Button>
              </ButtonGroup>
            </Card.Footer>
          </Card.Root>
          <Box w="1/2" position="relative" minH="90vh">
            <Float placement="top-middle" w="full">
              <Box h="87vh">
                <CodeBlock.AdapterProvider value={shikiAdapter}>
                  <ClientOnly>
                    {() => (
                      <CodeBlock.Root
                        code={file.code}
                        language={file.language}
                        borderRadius="0"
                        meta={{ colorScheme: colorMode, wordWrap: true }}
                        minW="44dvw"
                        minH="90dvh"
                      >
                        <CodeBlock.Header>
                          <CodeBlock.Title>
                            <Icon color="brandYellow.400" size="lg">
                              <PiFileCode />
                            </Icon>
                            Compose File Preview
                          </CodeBlock.Title>
                          <CodeBlock.Control>
                            <Float placement="top-end" offset="5" zIndex="1">
                              <CodeBlock.CopyTrigger asChild>
                                <IconButton variant="ghost" size="2xs">
                                  <CodeBlock.CopyIndicator />
                                </IconButton>
                              </CodeBlock.CopyTrigger>
                            </Float>
                            <CodeBlock.CollapseTrigger />
                          </CodeBlock.Control>
                        </CodeBlock.Header>
                        <CodeBlock.Content overflow="auto" maxH="80vh">
                          <CodeBlock.Code>
                            <CodeBlock.CodeText />
                          </CodeBlock.Code>
                        </CodeBlock.Content>
                      </CodeBlock.Root>
                    )}
                  </ClientOnly>
                </CodeBlock.AdapterProvider>
              </Box>
            </Float>
          </Box>
        </Flex>
      </Box>
    );
  }

  // Upload Mode (placeholder for now)
  if (currentMode === "upload") {
    return (
      <Box
        colorPalette="brand"
        w="full"
        p="6"
        bg="bg"
        justifyItems="center"
        maxH="95dvh"
        overflow="clip"
      >
        <Container maxW="6xl" py="20">
          <Stack gap="8" align="center">
            <Button
              variant="ghost"
              onClick={handleBackToSelection}
              alignSelf="flex-start"
            >
              <PiArrowRight style={{ transform: "rotate(180deg)" }} />
              Back to Mode Selection
            </Button>

            <Stack gap="4" textAlign="center">
              <Icon size="2xl" color="blue.500">
                <PiUpload />
              </Icon>
              <Heading>Upload Compose File</Heading>
              <Text color="fg.muted">Upload functionality coming soon...</Text>
            </Stack>
          </Stack>
        </Container>
      </Box>
    );
  }

  // Editor Mode (placeholder for now)
  if (currentMode === "editor") {
    return (
      <Box
        colorPalette="brand"
        w="full"
        p="6"
        bg="bg"
        justifyItems="center"
        maxH="95dvh"
        overflow="clip"
      >
        <Container maxW="6xl" py="20">
          <Stack gap="8" align="center">
            <Button
              variant="ghost"
              onClick={handleBackToSelection}
              alignSelf="flex-start"
            >
              <PiArrowRight style={{ transform: "rotate(180deg)" }} />
              Back to Mode Selection
            </Button>

            <Stack gap="4" textAlign="center">
              <Icon size="2xl" color="green.500">
                <PiCode />
              </Icon>
              <Heading>YAML Editor</Heading>
              <Text color="fg.muted">Editor functionality coming soon...</Text>
            </Stack>
          </Stack>
        </Container>
      </Box>
    );
  }

  return null;
};
