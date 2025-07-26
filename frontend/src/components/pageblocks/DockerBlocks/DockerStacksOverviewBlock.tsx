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
  stack: ApiStack; // The entire stack object
  onStart: (stackName: string) => Promise<boolean>;
  onStop: (stackName: string) => Promise<boolean>;
  onRestart: (stackName: string) => Promise<boolean>;
  onClick?: () => void; // Simple function
  loading?: boolean;
  disabled?: boolean;
}

export const StackBlocks: React.FC<StackBlocksProps> = ({
  stack,
  onStart,
  onStop,
  onRestart,
  loading = false,
  disabled = false,
}) => {
  console.log("Received stack:", stack);
  console.log("Stack keys:", stack ? Object.keys(stack) : "stack is undefined");
  return (
    <Container
      maxW="6xl"
      p="8"
      bg="brand.surfaceContainerHighest"
      borderWidth="2px"
      borderColor="transparent"
      _hover={{
        borderColor: "brand.focusRing",
      }}
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
              <Button variant="ghost" colorPalette="gray" size="sm">
                <LuRotateCcw /> Restart
              </Button>
              <Button size="lg" colorPalette="yellow" variant="outline">
                <LuSquare />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" colorPalette="gray" size="sm">
                <LuRotateCcw /> Restart
              </Button>
              <Button size="lg" colorPalette="yellow" variant="outline">
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
