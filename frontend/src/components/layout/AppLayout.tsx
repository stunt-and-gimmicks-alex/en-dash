// frontend/src/components/layout/AppLayout.tsx
// Clean layout using centralized navigation types and new API

import React from "react";
import { Box, Container, Flex, Stack } from "@chakra-ui/react";
import { ColorModeButton } from "@/components/ui/color-mode";
import { MobileNavbar } from "@/components/navigation/MobileNavbar";
import { Sidebar } from "@/components/navigation/Sidebar";
import { HeaderStatsBlock } from "@/components/layout/HeaderStatsBlock";
import type { NavigationProps } from "@/types/navigation";
import { Toaster, toaster } from "@/components/ui/toaster"; // Adjust path if necessary

interface AppLayoutProps extends NavigationProps {
  children: React.ReactNode;
  pageTitle: string;
  pageDescription: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPage,
  onNavigate,
  pageTitle,
  pageDescription,
}) => {
  return (
    <Box minH="100vh" bg="brand.surfaceContainerLowest">
      {/* Color Mode Toggle - Fixed position */}
      <Box position="fixed" bottom="4" right="4" zIndex="1000">
        <ColorModeButton />
      </Box>

      {/* Mobile Navigation - Only visible on mobile */}
      <Box display={{ base: "block", md: "none" }}>
        <MobileNavbar currentPage={currentPage} onNavigate={onNavigate} />
      </Box>

      <Flex flex="1" minH="100vh">
        {/* Desktop Sidebar - Only visible on desktop */}
        <Box display={{ base: "none", md: "block" }}>
          <Box w="10dvw" minW="8dvw" position="sticky" top="0" height="100vh">
            <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
          </Box>
        </Box>

        {/* Main Content Area */}
        <Stack gap="0" flex="1" alignItems="stretch">
          {/* Dynamic Header Stats Block */}
          <HeaderStatsBlock title={pageTitle} description={pageDescription} />

          {/* Page Content Container */}
          <Container display="flex" flex="1" maxW="full" p="0">
            <Stack gap="8" direction={{ base: "column", lg: "row" }} flex="1">
              {children}
            </Stack>
          </Container>
        </Stack>
      </Flex>
      <Toaster />
    </Box>
  );
};
