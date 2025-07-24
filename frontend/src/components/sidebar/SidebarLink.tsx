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
                isActive ? "brand.600" : { base: "gray.600", _dark: "gray.400" }
            }
            bg={
                isActive
                    ? { base: "brand.50", _dark: "brand.900" }
                    : "transparent"
            }
            _hover={{
                bg: { base: "brand.50", _dark: "brand.900" },
                color: "brand.600",
            }}
            {...buttonProps}
        >
            {children}
        </Button>
    );
};
