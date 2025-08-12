// frontend/src/components/debug/RealtimeStacksTest.tsx
// Test component to verify WebSocket unified stacks are working

import React from "react";
import { Box, Text, Stack, Badge, Card, HStack } from "@chakra-ui/react";
import { useStacks } from "@/hooks/v06-stackHooks";

export const RealtimeStacksTest: React.FC = () => {
  const { stacks, connected, error } = useStacks();

  return (
    <Card.Root bg="brand.surfaceContainer" p="4">
      <Card.Header>
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="semibold">
            Real-time Stacks Test
          </Text>
          <Badge
            colorPalette={connected ? "green" : error ? "red" : "yellow"}
            variant="solid"
          >
            {connected ? "Connected" : error ? "Error" : "Connecting"}
          </Badge>
        </HStack>
      </Card.Header>

      <Card.Body>
        <Stack gap="3">
          {/* Connection Info */}
          <Box>
            <Text fontSize="sm" fontWeight="medium">
              Connection Status:
            </Text>
            <Text fontSize="sm" color="brand.onSurfaceVariant">
              WebSocket: {connected ? "✅ Connected" : "❌ Disconnected"}
            </Text>
            {error && (
              <Text fontSize="sm" color="red.500">
                Error: {error}
              </Text>
            )}
          </Box>

          {/* Stacks Data */}
          <Box>
            <Text fontSize="sm" fontWeight="medium">
              Unified Stacks Data:
            </Text>
            <Text fontSize="sm" color="brand.onSurfaceVariant">
              Total Stacks: {stacks.length}
            </Text>

            {stacks.length > 0 && (
              <Stack gap="2" mt="2">
                {stacks.slice(0, 3).map((stack) => (
                  <Box
                    key={stack.name}
                    p="2"
                    bg="brand.surfaceContainerHigh"
                    borderRadius="md"
                  >
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium">
                        {stack.name}
                      </Text>
                      <Badge
                        colorPalette={
                          stack.status === "running"
                            ? "green"
                            : stack.status === "stopped"
                            ? "red"
                            : "yellow"
                        }
                        size="sm"
                      >
                        {stack.status}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="brand.onSurfaceVariant">
                      Containers: {stack.containers?.total || 0} total,{" "}
                      {stack.stats?.containers?.running || 0} running
                    </Text>
                    <Text fontSize="xs" color="brand.onSurfaceVariant">
                      Services: {Object.keys(stack.services || {}).length}
                    </Text>
                  </Box>
                ))}
                {stacks.length > 3 && (
                  <Text fontSize="xs" color="brand.onSurfaceVariant">
                    ... and {stacks.length - 3} more stacks
                  </Text>
                )}
              </Stack>
            )}
          </Box>

          {/* Raw Data Preview */}
          <Box>
            <Text fontSize="sm" fontWeight="medium">
              Last Update:
            </Text>
            <Text
              fontSize="xs"
              color="brand.onSurfaceVariant"
              fontFamily="mono"
            >
              {new Date().toLocaleTimeString()}
            </Text>
          </Box>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
};
