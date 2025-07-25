// src/components/sidebar/StacksLinks.tsx
import React, { useState } from "react";
import {
  Button,
  Collapsible,
  Icon,
  HStack,
  Stack,
  Box,
} from "@chakra-ui/react";
import { FileText, ChevronDown, Server } from "lucide-react";
import { SidebarLink } from "./SidebarLink";

export const StacksLinks = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box>
      <Button
        variant="ghost"
        width="full"
        justifyContent="space-between"
        color={{ base: "gray.600", _dark: "gray.400" }}
        bg="transparent"
        _hover={{
          bg: { base: "brand.50", _dark: "brand.900" },
          color: "brand.600",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Box display="flex" alignItems="center" gap="3">
          <Server size="16" />
          Docker
        </Box>
        <ChevronDown
          size="16"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </Button>
      {isOpen && (
        <Stack gap="1" py="1" mt="1">
          {["Web Services", "Databases", "Monitoring", "Networking"].map(
            (item) => (
              <SidebarLink key={item} pl="12" fontSize="sm">
                {item}
              </SidebarLink>
            )
          )}
        </Stack>
      )}
    </Box>
  );
};
