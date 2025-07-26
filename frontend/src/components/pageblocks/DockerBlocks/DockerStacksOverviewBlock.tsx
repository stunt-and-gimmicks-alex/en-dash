import {
  ActionBar,
  Badge,
  Button,
  Checkbox,
  Container,
  Flex,
  HStack,
  Heading,
  Kbd,
  Link,
  Portal,
  Stack,
  Status,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  LuGitBranch,
  LuGithub,
  LuGlobe,
  LuRocket,
  LuRotateCcw,
  LuLayers,
  LuSquare,
  LuSettings,
} from "react-icons/lu";
import type { ApiStack } from "@/services/apiService";
import { useState } from "react";

interface StackBlocksProps {
  stack: ApiStack;
  onStart: (stackName: string) => Promise<boolean>;
  onStop: (stackName: string) => Promise<boolean>;
  onRestart: (stackName: string) => Promise<boolean>;
  onToggle: (stack: ApiStack | null) => void; // NEW: Toggle callback
  isSelected: boolean; // NEW: Selected state
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
      maxW="6xl"
      p="8"
      bg={
        isSelected
          ? "brand.surfaceContainerHigh"
          : "brand.surfaceContainerHighest"
      }
      borderWidth="2px"
      borderColor="transparent"
      _hover={{
        borderColor: "brand.focusRing",
        bg: "brand.surfaceContainerHigh",
      }}
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
            gap="5"
            mb="2"
          >
            <HStack>
              <LuSettings /> {stack.containers?.length || 0} containers
            </HStack>
            <HStack>
              <LuSettings /> {stack.path || "orphan" + stack.name}
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
                colorPalette="yellow"
                variant="outline"
                onClick={(e) => handleButtonClick(e, () => onStop(stack.name))}
                disabled={disabled}
              >
                <LuSquare />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" colorPalette="gray" size="sm">
                <LuRotateCcw /> Restart
              </Button>
              <Button
                size="lg"
                colorPalette="yellow"
                variant="outline"
                onClick={(e) => handleButtonClick(e, () => onStart(stack.name))}
                disabled={disabled}
              >
                <LuRocket />
                Start
              </Button>
            </>
          )}
        </HStack>
      </Flex>
    </Container>
  );
};
