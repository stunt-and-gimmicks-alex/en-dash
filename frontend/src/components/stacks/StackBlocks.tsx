// frontend/src/components/stacks/StackBlocks.tsx
// MIGRATED - Stack blocks component using UnifiedStack + ChakraUI v3

import React from "react";
import {
  Button,
  Container,
  Flex,
  HStack,
  Stack,
  Status,
  Text,
} from "@chakra-ui/react";
import { LuRotateCcw, LuLayers, LuCirclePower } from "react-icons/lu";
import type { UnifiedStack } from "@/types/unified";

interface StackBlocksProps {
  stacks: UnifiedStack[];
  onStart: (stackName: string) => Promise<boolean>;
  onStop: (stackName: string) => Promise<boolean>;
  onRestart: (stackName: string) => Promise<boolean>;
  onToggle: (stack: UnifiedStack | null) => void;
  selectedStack?: UnifiedStack | null;
  loading?: boolean;
  disabled?: boolean;
}

interface SingleStackBlockProps {
  stack: UnifiedStack;
  onStart: (stackName: string) => Promise<boolean>;
  onStop: (stackName: string) => Promise<boolean>;
  onRestart: (stackName: string) => Promise<boolean>;
  onToggle: (stack: UnifiedStack | null) => void;
  isSelected?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

const SingleStackBlock: React.FC<SingleStackBlockProps> = ({
  stack,
  onStart,
  onStop,
  onRestart,
  onToggle,
  isSelected = false,
  loading = false,
  disabled = false,
}) => {
  // Handle container click (but not button clicks)
  const handleContainerClick = () => {
    onToggle(isSelected ? null : stack);
  };

  // Prevent event bubbling from buttons
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  // Determine stack status based on container stats
  const getStackStatus = () => {
    const running = stack.stats?.containers?.running || 0;
    const total = stack.stats?.containers?.total || 0;

    if (running === 0) return "stopped";
    if (running === total) return "running";
    return "partial";
  };

  const status = getStackStatus();

  return (
    <Container
      fluid
      p="8"
      bg={
        isSelected ? "brand.surfaceContainerHighest" : "brand.surfaceContainer"
      }
      borderWidth="2px"
      borderColor={isSelected ? "brand.outline" : "brand.outlineVariant"}
      _hover={{
        bg: isSelected ? "brand.surfaceBright" : "brand.surfaceContainerHigh",
        borderColor: "brand.focusRing",
      }}
      onClick={handleContainerClick}
      cursor="pointer"
      transition="all 0.2s"
      borderRadius="md"
    >
      <Flex
        justify="space-between"
        align="flex-start"
        gap="8"
        direction={{ base: "column", md: "row" }}
      >
        <Stack gap="3">
          <HStack fontWeight="medium" color="brand.onSurfaceVariant">
            <LuLayers />
            <Text>Status:</Text>
            <Status.Root
              colorPalette={
                status === "running"
                  ? "green"
                  : status === "partial"
                  ? "yellow"
                  : "red"
              }
            >
              <Status.Indicator />
            </Status.Root>
          </HStack>

          <Stack gap="1">
            <Text fontSize="xl" fontWeight="semibold" color="brand.onSurface">
              {stack.name}
            </Text>
            <Text fontSize="sm" color="brand.onSurfaceVariant">
              {stack.stats?.containers?.running || 0} of{" "}
              {stack.stats?.containers?.total || 0} containers running
            </Text>
            <Text fontSize="sm" color="brand.onSurfaceVariant">
              Path: {stack.path}
            </Text>
          </Stack>
        </Stack>

        <HStack gap="2" flexShrink={0}>
          {status === "stopped" ? (
            <Button
              size="sm"
              variant="solid"
              colorPalette="green"
              onClick={(e) => handleButtonClick(e, () => onStart(stack.name))}
              disabled={disabled || loading}
            >
              <LuCirclePower />
              Start
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                colorPalette="orange"
                onClick={(e) =>
                  handleButtonClick(e, () => onRestart(stack.name))
                }
                disabled={disabled || loading}
              >
                <LuRotateCcw />
                Restart
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorPalette="red"
                onClick={(e) => handleButtonClick(e, () => onStop(stack.name))}
                disabled={disabled || loading}
              >
                <LuCirclePower />
                Stop
              </Button>
            </>
          )}
        </HStack>
      </Flex>
    </Container>
  );
};

export const StackBlocks: React.FC<StackBlocksProps> = ({
  stacks,
  onStart,
  onStop,
  onRestart,
  onToggle,
  selectedStack,
  loading = false,
  disabled = false,
}) => {
  return (
    <Stack gap="4" mt="6">
      {stacks.map((stack) => (
        <SingleStackBlock
          key={stack.name}
          stack={stack}
          onStart={onStart}
          onStop={onStop}
          onRestart={onRestart}
          onToggle={onToggle}
          isSelected={selectedStack?.name === stack.name}
          loading={loading}
          disabled={disabled}
        />
      ))}
    </Stack>
  );
};

export default StackBlocks;
