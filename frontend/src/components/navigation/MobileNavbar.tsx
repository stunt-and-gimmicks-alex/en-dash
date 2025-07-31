// frontend/src/components/navigation/MobileNavbar.tsx
// Clean mobile navigation with drawer using ChakraUI v3

import React, { useState } from "react";
import { Container, HStack, IconButton, Box } from "@chakra-ui/react";
import { Menu, X } from "lucide-react";

import { Logo } from "./Logo";
import { Sidebar } from "./Sidebar";
import type { NavigationProps } from "@/types/navigation";

export const MobileNavbar: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNavigation = (page: NavigationProps["currentPage"]) => {
    // Close the drawer when navigating
    setIsDrawerOpen(false);
    // Call the parent navigation handler
    onNavigate(page);
  };

  return (
    <>
      {/* Top navigation bar */}
      <Container
        py="2.5"
        bg="brand.surfaceContainerLowest"
        borderBottomWidth="1px"
        borderColor="brand.subtle"
      >
        <HStack justify="space-between">
          <Logo />
          <IconButton
            aria-label="Open Menu"
            variant="ghost"
            onClick={() => setIsDrawerOpen(true)}
            color="brand.onSurface"
          >
            <Menu />
          </IconButton>
        </HStack>
      </Container>

      {/* Mobile drawer overlay */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <Box
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="blackAlpha.600"
            zIndex="1000"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer content */}
          <Box
            position="fixed"
            top="0"
            left="0"
            width="320px"
            height="100vh"
            bg="brand.surfaceContainerLowest"
            zIndex="1001"
            transform={isDrawerOpen ? "translateX(0)" : "translateX(-100%)"}
            transition="transform 0.3s ease"
            borderRightWidth="1px"
            borderColor="brand.subtle"
            overflowY="auto"
          >
            <Box p="4">
              {/* Header with logo and close button */}
              <HStack justify="space-between" mb="4">
                <Logo />
                <IconButton
                  aria-label="Close Menu"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDrawerOpen(false)}
                  color="brand.onSurface"
                >
                  <X size="16" />
                </IconButton>
              </HStack>

              {/* Sidebar content with proper navigation */}
              <Sidebar
                currentPage={currentPage}
                onNavigate={handleNavigation}
              />
            </Box>
          </Box>
        </>
      )}
    </>
  );
};
