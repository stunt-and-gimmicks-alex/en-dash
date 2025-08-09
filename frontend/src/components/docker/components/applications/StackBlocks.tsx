// frontend/src/components/stacks/StackBlocks.tsx
// MIGRATED - Stack blocks component using UnifiedStack + ChakraUI v3

import React from "react";
import {
  Badge,
  Container,
  Flex,
  Group,
  HStack,
  Icon,
  Stack,
  Status,
  Text,
} from "@chakra-ui/react";
import type { UnifiedStack } from "@/types/unified";
import { StackControlButtons } from "@/components/ui/small/StackControlButtons";
import {
  PiAppWindow,
  PiHardDrives,
  PiNetwork,
  PiShippingContainer,
  PiTerminal,
} from "react-icons/pi";
import { Heading } from "lucide-react";

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

  /*  // Prevent event bubbling from buttons
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };
*/

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
      py="2"
      px="4"
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
        align="center"
        gap="8"
        direction={{ base: "column", md: "row" }}
      >
        <Flex gap="4" alignItems="top">
          <HStack
            fontWeight="medium"
            color="brand.onSurfaceVariant"
            w="15dvw"
            gap="6"
          >
            <Status.Root
              size="lg"
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
            <Icon size="2xl">
              <PiAppWindow />
            </Icon>
            <Text fontSize="xl" fontWeight="semibold" color="brand.onSurface">
              {stack.name}
            </Text>
          </HStack>

          <HStack gap="4">
            <Group attached colorPalette="grayBrand">
              <Badge variant="solid" size="md" color="brandGray.100">
                <PiShippingContainer />
              </Badge>
              <Badge fontSize="sm" size="md" variant="outline">
                {stack.stats?.containers?.running || 0} of{" "}
                {stack.stats?.containers?.total || 0} containers
              </Badge>
            </Group>
            <Group attached colorPalette="grayBrand">
              <Badge variant="solid" size="md" color="brandGray.100">
                <PiNetwork />
              </Badge>
              <Badge fontSize="sm" size="md" variant="outline">
                {stack.stats?.networks?.total || 0} network(s)
              </Badge>
            </Group>
            <Group attached colorPalette="grayBrand">
              <Badge variant="solid" size="md" color="brandGray.100">
                <PiHardDrives />
              </Badge>
              <Badge fontSize="sm" size="md" variant="outline">
                {stack.stats?.volumes?.total || 0} volume(s)
              </Badge>
            </Group>
          </HStack>
          <HStack gap="4">
            <Group attached colorPalette="grayBrand">
              <Badge variant="solid" size="md" color="brandGray.100">
                <PiTerminal />
              </Badge>
              <Badge fontSize="sm" size="md" variant="outline">
                {stack.path}
              </Badge>
            </Group>
          </HStack>
        </Flex>

        <HStack gap="2" flexShrink={0}>
          <StackControlButtons
            buttonSize="sm"
            status={stack.status}
            onStart={() => onStart(stack.name)}
            onStop={() => onStop(stack.name)}
            onRestart={() => onRestart(stack.name)}
            disabled={disabled}
            orientation="horizontal"
          />
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
