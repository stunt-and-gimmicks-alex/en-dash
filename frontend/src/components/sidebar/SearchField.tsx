// src/components/sidebar/SearchField.tsx
import React from "react";
import { Input, InputGroup, Box, Icon } from "@chakra-ui/react";
import { Search } from "lucide-react";

export const SearchField = () => {
  return (
    <InputGroup
      flex="1"
      startElement={
        <Icon size="sm">
          <Search size="16" color="gray" />
        </Icon>
      }
    >
      <Input
        placeholder="Search"
        pl="10"
        bg={{ base: "white/55", _dark: "black/45" }}
        borderColor="brand.bg/25"
        color={{ base: "gray.900", _dark: "gray.100" }}
        _placeholder={{
          color: "brandText.solid/75",
        }}
        _focus={{
          borderColor: "brand.500",
          boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
        }}
      />
    </InputGroup>
  );
};
