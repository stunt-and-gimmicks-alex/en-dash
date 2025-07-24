// ../src/components/sidebar/Navbar.tsx - Mobile responsive navbar
import React, { useState } from "react";
import { Container, HStack, IconButton, Box } from "@chakra-ui/react";
import { Menu } from "lucide-react";
import { Logo } from "./Logo";
import { Sidebar } from "./Sidebar";

export const Navbar = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

            {/* Simple drawer overlay for mobile */}
            {isDrawerOpen && (
                <>
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
                    <Box
                        position="fixed"
                        top="0"
                        left="0"
                        width="320px"
                        height="100vh"
                        bg={{ base: "white", _dark: "gray.800" }}
                        zIndex="1001"
                        transform={
                            isDrawerOpen ? "translateX(0)" : "translateX(-100%)"
                        }
                        transition="transform 0.3s ease"
                        borderRightWidth="1px"
                        borderColor={{ base: "gray.200", _dark: "gray.700" }}
                    >
                        <Box p="4">
                            <HStack justify="space-between" mb="4">
                                <Logo />
                                <IconButton
                                    aria-label="Close Menu"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsDrawerOpen(false)}
                                    color={{
                                        base: "gray.600",
                                        _dark: "gray.400",
                                    }}
                                >
                                    ×
                                </IconButton>
                            </HStack>
                            <Sidebar
                                currentPage={"dashboard"}
                                onNavigate={function (
                                    page:
                                        | "dashboard"
                                        | "system-monitor"
                                        | "storage"
                                        | "processes"
                                        | "network"
                                        | "security"
                                        | "docker-overview"
                                        | "databases-overview"
                                        | "web-services-overview"
                                        | "monitoring-overview"
                                ): void {
                                    throw new Error(
                                        "Function not implemented."
                                    );
                                }}
                            />
                        </Box>
                    </Box>
                </>
            )}
        </>
    );
};
