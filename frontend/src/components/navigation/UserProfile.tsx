// frontend/src/components/navigation/UserProfile.tsx
// Clean user profile component using ChakraUI v3 patterns

import React from "react";
import { HStack, Avatar, Stack, Text, Button } from "@chakra-ui/react";
import { Settings, LogOut } from "lucide-react";

interface UserProfileProps {
  userName?: string;
  userEmail?: string;
  avatarSrc?: string;
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userName = "Server Admin",
  userEmail = "admin@lab.home",
  avatarSrc,
  onSettingsClick,
  onLogoutClick,
}) => {
  return (
    <Stack gap="3">
      {/* User Info */}
      <HStack gap="3" p="3" bg="brand.surfaceContainer" borderRadius="md">
        <Avatar.Root size="sm" colorPalette="brand">
          <Avatar.Fallback name={userName} />
          {avatarSrc && <Avatar.Image src={avatarSrc} />}
        </Avatar.Root>
        <Stack gap="0" flex="1" minW="0">
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="brand.onSurface"
            truncate
          >
            {userName}
          </Text>
          <Text fontSize="xs" color="brand.onSurfaceVariant" truncate>
            {userEmail}
          </Text>
        </Stack>
      </HStack>

      {/* Quick Actions */}
      <HStack gap="1">
        <Button
          variant="ghost"
          size="sm"
          flex="1"
          color="brand.onSurfaceVariant"
          _hover={{
            bg: "brand.surfaceContainer",
            color: "brand.onSurface",
          }}
          onClick={onSettingsClick}
        >
          <Settings size="14" />
          Settings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          flex="1"
          color="brand.onSurfaceVariant"
          _hover={{
            bg: "brand.errorContainer",
            color: "brand.onErrorContainer",
          }}
          onClick={onLogoutClick}
        >
          <LogOut size="14" />
          Logout
        </Button>
      </HStack>
    </Stack>
  );
};
