// frontend/src/components/navigation/SidebarLink.tsx
// Clean sidebar link component using ChakraUI v3 patterns

import React from "react";
import { Button, type ButtonProps } from "@chakra-ui/react";

interface SidebarLinkProps extends ButtonProps {
  href?: string;
  isActive?: boolean;
  children: React.ReactNode;
}

export const SidebarLink: React.FC<SidebarLinkProps> = ({
  children,
  href,
  isActive = false,
  onClick,
  ...buttonProps
}) => {
  return (
    <Button
      variant="ghost"
      width="full"
      justifyContent="flex-start"
      gap="3"
      h="auto"
      py="2"
      px="3"
      fontWeight="normal"
      color={isActive ? "brand.primary" : "brand.onPrimary"}
      bg={isActive ? "brand.primaryContainer" : "transparent"}
      _hover={{
        bg: isActive ? "brand.primaryContainer" : "brand.primaryContainer",
        color: isActive
          ? "brand.onPrimaryContainer"
          : "brand.onPrimaryContainer",
      }}
      _active={{
        bg: "brand.primaryContainer",
      }}
      borderRadius="md"
      transition="all 0.2s"
      onClick={onClick}
      {...buttonProps}
    >
      {children}
    </Button>
  );
};
