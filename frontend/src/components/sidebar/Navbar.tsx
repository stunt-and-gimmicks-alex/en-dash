// src/components/sidebar/Navbar.tsx - Mobile responsive navbar with working navigation
import React, { useState } from "react";
import { Container, HStack, IconButton, Box } from "@chakra-ui/react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Sidebar } from "./Sidebar";

// Import the same CurrentPage type used in Layout and Sidebar
type CurrentPage =
  | "dashboard"
  | "system-monitor"
  | "storage"
  | "processes"
  | "network"
  | "security"
  | "docker-overview"
  | "databases-overview"
  | "web-services-overview"
  | "monitoring-overview";

interface NavbarProps {
  currentPage: CurrentPage;
  onNavigate: (page: CurrentPage) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNavigation = (page: CurrentPage) => {
    // Close the drawer when navigating
    setIsDrawerOpen(false);
    // Call the parent navigation handler
    onNavigate(page);
  };

  return (
    <>
      <Container
        py="2.5"
        bg={{ base: "white", _dark: "gray.800" }}
        borderBottomWidth="1px"
        borderColor={{ base: "gray.200", _dark: "gray.700" }}
      >
        <HStack justify="space-between">
          <Logo />
          <IconButton
            aria-label="Open Menu"
            variant="ghost"
            onClick={() => setIsDrawerOpen(true)}
            color={{ base: "gray.600", _dark: "gray.400" }}
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
            bg={{ base: "white", _dark: "gray.800" }}
            zIndex="1001"
            transform={isDrawerOpen ? "translateX(0)" : "translateX(-100%)"}
            transition="transform 0.3s ease"
            borderRightWidth="1px"
            borderColor={{ base: "gray.200", _dark: "gray.700" }}
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
                  color={{ base: "gray.600", _dark: "gray.400" }}
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
