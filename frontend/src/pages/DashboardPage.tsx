import React from "react";
import {
  Box,
  Heading,
  Text,
  Combobox,
  Portal,
  useFilter,
  useListCollection,
  Container,
} from "@chakra-ui/react";
import { HStack, Span } from "@chakra-ui/react";
import { useState } from "react";
import type { Organization, Project } from "@/components/ui/small/DataFetcher";
import { organizations } from "@/components/ui/small/DataFetcher";
import {
  OrgSwitcherMenu,
  ProjectSwitcherMenu,
} from "@/components/ui/small/ServiceSelectorComboBox";
// Import test data from ServiceSelectorComboBox
import {
  MOCK_DOCKER_SERVICES,
  DOCKER_ROLES,
} from "@/components/ui/small/ServiceSelectorComboBox";

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

// EXACT same Column component (unused but kept for reference)
const Column: React.FC = () => {
  return (
    <ContentPlaceholder maxW={{ base: "full", lg: "sm" }} minH="40">
      <Label>Column</Label>
    </ContentPlaceholder>
  );
};

// EXACT same Content component (unused but kept for reference)
const Content: React.FC = () => {
  return (
    <ContentPlaceholder minH="2xl">
      <Label>Content</Label>
    </ContentPlaceholder>
  );
};

export const DashboardPage: React.FC = () => {
  const [selectedOrg, setSelectedOrg] = useState<Organization>(
    organizations[0]
  );
  const [selectedProject, setSelectedProject] = useState<Project>(
    organizations[0].projects[0]
  );

  const handleOrgChange = (id: string) => {
    const org = organizations.find((org) => org.id === id);
    if (!org) return;
    setSelectedOrg(org);
    setSelectedProject(org.projects[0]);
  };

  const handleProjectChange = (id: string) => {
    const project = selectedOrg.projects.find((project) => project.id === id);
    if (!project) return;
    setSelectedProject(project);
  };

  return (
    <>
      <Heading>Dashboard with Combobox Test</Heading>
      <Text>
        Testing ChakraUI v3 Comboboxes with Docker role and service data:
      </Text>
      <Container>
        <HStack gap="3">
          <OrgSwitcherMenu
            selectedId={selectedOrg.id}
            items={organizations}
            onSelect={handleOrgChange}
          />
          <Span color="fg.subtle">/</Span>
          <ProjectSwitcherMenu
            selectedId={selectedProject.id}
            items={selectedOrg.projects}
            onSelect={handleProjectChange}
          />
        </HStack>
      </Container>
    </>
  );
};
