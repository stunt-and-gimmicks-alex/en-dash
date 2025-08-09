import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { DashboardMainPage } from "@/components/dashboard/pages/DashboardMainPage";

// Keep your exact ContentPlaceholder and Label components
const ContentPlaceholder: React.FC<any> = ({ children, ...props }) => (
  <Box
    {...props}
    bg="brand.surfaceContainerLowest"
    display="flex"
    w="100%"
    backgroundClip="padding-box"
    alignItems="center"
    justifyContent="center"
    flexDirection="column"
    gap="4"
  >
    {children}
  </Box>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box p="2">
    <Text
      color="brand.onSurface"
      fontWeight="medium"
      fontSize="sm"
      whiteSpace="nowrap"
    >
      {children}
    </Text>
  </Box>
);

// EXACT same Column component
const Column: React.FC = () => {
  return (
    <ContentPlaceholder maxW={{ base: "full", lg: "sm" }} minH="40">
      <Label>Column</Label>
    </ContentPlaceholder>
  );
};

// EXACT same Content component
const Content: React.FC = () => {
  return (
    <ContentPlaceholder minH="2xl">
      <Label>Content</Label>
    </ContentPlaceholder>
  );
};

export const DashboardPage: React.FC = () => {
  return (
    <>
      <DashboardMainPage />
    </>
  );
};
