// src/components/layout/AppLayout.tsx - EXACT same styling as your current Layout
import React from "react";
import { Box, Container, Flex, Stack } from "@chakra-ui/react";
import { ColorModeButton } from "@/components/ui/color-mode";
import { Navbar } from "../sidebar/Navbar";
import { Sidebar } from "../sidebar/Sidebar";
import { HeaderStatsBlock } from "../HeaderStatsBlock";
import type { PageKey } from "@/App";

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  pageTitle: string;
  pageDescription: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPage,
  onPageChange,
  pageTitle,
  pageDescription,
}) => {
  return (
    <Box minH="100vh" bg="brand.surfaceContainerLowest">
      {/* Color Mode Toggle - EXACT same position and styling */}
      <Box position="fixed" bottom="4" right="4" zIndex="1000">
        <ColorModeButton />
      </Box>

      {/* Navbar - EXACT same mobile display logic */}
      <Box display={{ base: "block", md: "none" }}>
        <Navbar currentPage={currentPage} onNavigate={onPageChange} />
      </Box>

      <Flex flex="1" minH="100vh">
        {/* Sidebar - EXACT same desktop display and sizing */}
        <Box display={{ base: "none", md: "block" }}>
          <Box w="325px" minW="325px" position="sticky" top="0" height="100vh">
            <Sidebar currentPage={currentPage} onNavigate={onPageChange} />
          </Box>
        </Box>

        {/* Main Content Area - EXACT same layout structure */}
        <Stack gap="0" flex="1" alignItems="stretch">
          {/* Dynamic Header Stats Block - EXACT same */}
          <HeaderStatsBlock title={pageTitle} description={pageDescription} />

          {/* Main Content Area - EXACT same Container and Stack styling */}
          <Container display="flex" flex="1" maxW="full" py="8">
            <Stack gap="8" direction={{ base: "column", lg: "row" }} flex="1">
              {children}
            </Stack>
          </Container>
        </Stack>
      </Flex>
    </Box>
  );
};
