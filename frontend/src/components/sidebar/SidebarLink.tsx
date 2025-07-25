import React from "react";
import { Button, type ButtonProps } from "@chakra-ui/react";

interface Props extends ButtonProps {
  href?: string;
  isActive?: boolean;
}

export const SidebarLink: React.FC<Props> = ({
  children,
  href,
  isActive,
  ...buttonProps
}) => {
  return (
    <Button
      variant="ghost"
      width="full"
      justifyContent="flex-start"
      gap="3"
      color={
        isActive
          ? { base: "brand.900", _dark: "brand.400" }
          : { base: "brandGray.50", _dark: "brandGray.50/75" }
      }
      bg={isActive ? { base: "brand.400", _dark: "brand.900" } : "transparent"}
      _hover={{
        bg: { base: "brand.400/75", _dark: "brand.900/75" },
        color: { base: "brand.900/85", _dark: "brand.400/75" },
      }}
      {...buttonProps}
    >
      {children}
    </Button>
  );
};
