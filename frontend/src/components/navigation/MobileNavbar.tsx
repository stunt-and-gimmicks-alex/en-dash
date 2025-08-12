// frontend/src/components/navigation/MobileNavbar.tsx
// Clean mobile navigation with drawer using ChakraUI v3

import React, { useState } from "react";
import {
  Container,
  HStack,
  IconButton,
  DrawerRoot,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerTrigger,
  DrawerCloseTrigger,
  DrawerBackdrop,
} from "@chakra-ui/react";
import { Menu, X } from "lucide-react";

import { Logo } from "./Logo";
import { Sidebar } from "./Sidebar";
import type { NavigationProps, PageKey } from "@/types/navigation";

export const MobileNavbar: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNavigation = (page: PageKey) => {
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
          <DrawerRoot
            open={isDrawerOpen}
            onOpenChange={(e) => setIsDrawerOpen(e.open)}
            placement="start"
          >
            <DrawerTrigger asChild>
              <IconButton
                aria-label="Open Menu"
                variant="ghost"
                color="brand.onSurface"
              >
                <Menu />
              </IconButton>
            </DrawerTrigger>

            <DrawerBackdrop />

            <DrawerContent>
              <DrawerHeader>
                <HStack justify="space-between">
                  <Logo />
                  <DrawerCloseTrigger asChild>
                    <IconButton
                      aria-label="Close Menu"
                      variant="ghost"
                      size="sm"
                      color="brand.onSurface"
                    >
                      <X size="16" />
                    </IconButton>
                  </DrawerCloseTrigger>
                </HStack>
              </DrawerHeader>

              <DrawerBody p="0">
                <Sidebar
                  currentPage={currentPage}
                  onNavigate={handleNavigation}
                />
              </DrawerBody>
            </DrawerContent>
          </DrawerRoot>
        </HStack>
      </Container>
    </>
  );
};
