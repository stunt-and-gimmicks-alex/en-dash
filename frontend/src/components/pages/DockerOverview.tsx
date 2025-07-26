// src/components/pages/DockerOverview.tsx - Updated to use column/content pattern
import React from "react";
import { DockerOverviewColumn } from "./DockerOverviewColumn";
import { DockerOverviewContent } from "./DockerOverviewContent";
import {
  ActionBar,
  Badge,
  Button,
  Checkbox,
  Container,
  Flex,
  HStack,
  Heading,
  Kbd,
  Link,
  Portal,
  Stack,
  Status,
  Table,
  Text,
} from "@chakra-ui/react";

export const DockerOverview: React.FC = () => {
  return (
    <>
      <Container fluid minH="2xl">
        <DockerOverviewColumn />
        <DockerOverviewContent />
      </Container>
    </>
  );
};
