// frontend/src/components/navigation/SearchField.tsx
// Clean search field component using ChakraUI v3 patterns

import React from "react";
import { Input, InputGroup, Icon } from "@chakra-ui/react";
import { Search } from "lucide-react";

interface SearchFieldProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  placeholder = "Search",
  onSearch,
}) => {
  return (
    <InputGroup
      flex="1"
      startElement={
        <Icon size="sm" color="brand.onSurfaceVariant">
          <Search size="16" />
        </Icon>
      }
    >
      <Input
        placeholder={placeholder}
        pl="10"
        bg="brand.surfaceContainer"
        borderColor="brand.outline"
        color="brand.onSurface"
        _placeholder={{
          color: "brand.onSurfaceVariant",
        }}
        _focus={{
          borderColor: "brand.primary",
          boxShadow: "0 0 0 1px var(--chakra-colors-brand-primary)",
        }}
        onChange={(e) => onSearch?.(e.target.value)}
      />
    </InputGroup>
  );
};
