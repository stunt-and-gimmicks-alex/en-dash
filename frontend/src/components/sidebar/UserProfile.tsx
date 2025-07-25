// src/components/sidebar/UserProfile.tsx
import React from "react";
import {
  HStack,
  Stack,
  Box,
  Text,
  IconButton,
  Avatar,
  AvatarGroup,
} from "@chakra-ui/react";
import { MoreVertical } from "lucide-react";

export const UserProfile = () => {
  return (
    <HStack gap="3" justify="space-between">
      <HStack gap="4">
        <Avatar.Root>
          <Avatar.Fallback name="John Avatar" />
          <Avatar.Image src="dockge/frontend/public/vite.svg" />
        </Avatar.Root>
        <Stack gap="0">
          <Text
            fontSize="sm"
            fontWeight="medium"
            color={{ base: "brandGray.50", _dark: "brandGray.200" }}
          >
            John Avatar
          </Text>
          <Text
            fontSize="sm"
            color={{ base: "brandGray.100", _dark: "brandGray.300" }}
          >
            john.avatar@fakemail.notreal
          </Text>
        </Stack>
      </HStack>
      <IconButton
        variant="ghost"
        aria-label="Open Menu"
        size="sm"
        color={{ base: "gray.600", _dark: "gray.400" }}
        _hover={{ color: { base: "gray.900", _dark: "gray.100" } }}
      >
        <MoreVertical size="16" />
      </IconButton>
    </HStack>
  );
};
