import {
  Accordion,
  Badge,
  Box,
  Button,
  Container,
  Code,
  DataList,
  Flex,
  For,
  HStack,
  Heading,
  Stack,
  VStack,
  Status,
  Text,
} from "@chakra-ui/react";
import {
  LuRotateCcw,
  LuLayers,
  LuCirclePower,
  LuSettings,
  LuCalendarDays,
} from "react-icons/lu";
import type { ApiStack } from "@/services/apiService";
import { useComposeParser } from "@/hooks/useComposeParser";

interface StackBlocksProps {
  stack: ApiStack;
  onStart: (stackName: string) => Promise<boolean>;
  onStop: (stackName: string) => Promise<boolean>;
  onRestart: (stackName: string) => Promise<boolean>;
  onToggle: (stack: ApiStack | null) => void; // NEW: Toggle callback
  isSelected?: boolean; // NEW: Selected state
  loading?: boolean;
  disabled?: boolean;
}

export const StackBlocks: React.FC<StackBlocksProps> = ({
  stack,
  onStart,
  onStop,
  onRestart,
  onToggle,
  isSelected,
  loading = false,
  disabled = false,
}) => {
  // Handle container click (but not button clicks)
  const handleContainerClick = () => {
    onToggle(isSelected ? null : stack);
  };

  // Prevent event bubbling from buttons
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation(); // This prevents container click
    action();
  };

  return (
    <Container
      fluid
      p="8"
      bg={
        isSelected
          ? {
              base: "brand.surfaceContainerHighest",
              _hover: "brand.surfaceBright",
            }
          : {
              base: "brand.surfaceContainer",
              _hover: "brand.surfaceContainerHigh",
            }
      }
      borderWidth="2px"
      borderColor={
        isSelected
          ? { base: "brand.outline", _hover: "brand.focusRing" }
          : { base: "brand.outlineVariant", _hover: "brand.focusRing" }
      }
      onClick={handleContainerClick}
      transition="background-color 0.2s"
    >
      <Flex
        justify="space-between"
        align="flex-start"
        gap="8"
        direction={{ base: "column", md: "row" }}
      >
        <Stack gap="3">
          <HStack fontWeight="medium" color="fg.muted">
            <LuLayers /> Status:{" "}
            <Status.Root
              colorPalette={
                stack.status === "running"
                  ? "green"
                  : stack.status === "partial"
                  ? "yellow"
                  : stack.status === "stopped"
                  ? "red"
                  : "gray"
              }
              color="brand.onSurfaceVariant"
            >
              {stack.status}&ensp;
              <Status.Indicator />
            </Status.Root>
          </HStack>

          <HStack>
            <Heading size="2xl" mr="4">
              {stack.name}
            </Heading>
            <Badge
              size="sm"
              variant="outline"
              fontWeight="medium"
              colorPalette="teal"
              p="1"
            >
              {stack.containers?.filter((c) => c.status === "running").length ||
                0}{" "}
              running
            </Badge>
            <Badge size="sm" variant="outline" colorPalette="blue" p="1">
              {stack.containers?.filter((c) => c.status === "exited").length ||
                0}{" "}
              stopped
            </Badge>
          </HStack>

          <HStack
            fontFamily="mono"
            color="fg.muted"
            textStyle="sm"
            gap="3"
            mb="2"
          >
            <HStack>
              <LuSettings /> {stack.containers?.length || 0} containers
            </HStack>
            <HStack>
              <LuSettings /> {stack.path || "??_" + stack.name}
            </HStack>
            <HStack>
              <LuCalendarDays />{" "}
              {stack.last_modified
                ? `Updated ${new Date(
                    stack.last_modified
                  ).toLocaleDateString()}`
                : "Recently updated"}
            </HStack>
          </HStack>
        </Stack>
        <HStack gap="4">
          {stack.status === "running" ? (
            <>
              <Button
                variant="ghost"
                colorPalette="gray"
                size="sm"
                onClick={(e) =>
                  handleButtonClick(e, () => onRestart(stack.name))
                }
                disabled={disabled}
              >
                <LuRotateCcw /> Restart
              </Button>
              <Button
                size="lg"
                colorPalette="red"
                variant="ghost"
                onClick={(e) => handleButtonClick(e, () => onStop(stack.name))}
                disabled={disabled}
              >
                <LuCirclePower />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" colorPalette="gray" size="sm" disabled>
                <LuRotateCcw /> Restart
              </Button>
              <Button
                size="lg"
                colorPalette="brand.Primary"
                variant="subtle"
                onClick={(e) => handleButtonClick(e, () => onStart(stack.name))}
                disabled={disabled}
              >
                <LuCirclePower />
                Start
              </Button>
            </>
          )}
        </HStack>
      </Flex>
    </Container>
  );
};

export const StackDetail: React.FC<StackBlocksProps> = ({
  stack,
  onStart,
  onStop,
  onRestart,
  onToggle,
  isSelected,
  loading = false,
  disabled = false,
}) => {
  // Prevent event bubbling from buttons
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation(); // This prevents container click
    action();
  };

  const {
    parsed, // Full parsed compose object
    isValid, // Boolean - parsing successful?
    services, // Array of ParsedService objects
    getServiceByName, // Function to find specific service
    getAllPorts, // Function returning port mappings
    getAllVolumes, // Function returning volume mappings
    getImageList, // Function returning unique images
    getServiceDependencies, // Function for service deps
    version, // Compose file version
    formattedYaml,
  } = useComposeParser(stack.compose_content);

  if (!isValid) return <div>Invalid compose file</div>;

  return (
    <Container py={{ base: "4", md: "6" }}>
      <Stack gap={{ base: "1", md: "2" }}>
        <Stack gap={{ base: "1", md: "2" }}>
          <Stack gap={{ base: "1", md: "2" }}>
            <Box>
              <Status.Root
                size="md"
                fontWeight="medium"
                colorPalette={
                  stack.status === "running"
                    ? "green"
                    : stack.status === "partial"
                    ? "yellow"
                    : stack.status === "stopped"
                    ? "red"
                    : "gray"
                }
              >
                <Status.Indicator />
                <Text color="colorPalette.fg">{stack.status}</Text>
              </Status.Root>
            </Box>
            <Heading as="h1" textStyle={{ base: "4xl", md: "5xl" }}>
              {stack.name}
            </Heading>
          </Stack>
          <HStack>
            {stack.status === "running" ? (
              <>
                <Button
                  variant="ghost"
                  colorPalette="gray"
                  size="sm"
                  onClick={(e) =>
                    handleButtonClick(e, () => onRestart(stack.name))
                  }
                  disabled={disabled}
                >
                  <LuRotateCcw /> Restart
                </Button>
                <Button
                  size="lg"
                  colorPalette="red"
                  variant="ghost"
                  onClick={(e) =>
                    handleButtonClick(e, () => onStop(stack.name))
                  }
                  disabled={disabled}
                >
                  <LuCirclePower />
                  Stop
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" colorPalette="gray" size="sm" disabled>
                  <LuRotateCcw /> Restart
                </Button>
                <Button
                  size="lg"
                  colorPalette="brand.Primary"
                  variant="ghost"
                  onClick={(e) =>
                    handleButtonClick(e, () => onStart(stack.name))
                  }
                  disabled={disabled}
                >
                  <LuCirclePower />
                  Start
                </Button>
              </>
            )}
          </HStack>
          <Container>
            <Stack
              boxShadow="inset"
              p="6"
              gap="1"
              rounded="l3"
              borderWidth="1px"
              borderColor="brand.Outline"
            >
              <Accordion.Root>
                {stack.containers.map((container) => (
                  <Accordion.Item key={container.name} value={container.name}>
                    <Accordion.ItemTrigger>
                      <Accordion.ItemIndicator />
                      <Stack gap="1">
                        <Text color="brand.onSecondaryContainer">
                          {container.name}
                        </Text>

                        <Box>
                          <HStack>
                            <Badge
                              size="md"
                              colorPalette={
                                container.state === "running"
                                  ? "green"
                                  : stack.status === "partial"
                                  ? "yellow"
                                  : stack.status === "stopped"
                                  ? "red"
                                  : "gray"
                              }
                            >
                              {container.state}
                            </Badge>
                            <Badge colorPalette="grey" size="md">
                              {container.ports}
                            </Badge>
                          </HStack>
                        </Box>
                      </Stack>
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent>
                      <Accordion.ItemBody>{container.image}</Accordion.ItemBody>
                    </Accordion.ItemContent>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </Stack>
          </Container>
        </Stack>
        Blah blah blah
      </Stack>
    </Container>
  );
};
