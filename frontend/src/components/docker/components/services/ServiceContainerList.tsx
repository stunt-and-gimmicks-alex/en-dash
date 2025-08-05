import React from "react";
import {
  Badge,
  Button,
  Card,
  Container,
  DataList,
  Flex,
  HStack,
  Icon,
  IconButton,
  Stack,
  Status,
  Table,
  Tabs,
  Text,
} from "@chakra-ui/react";

import { BsPencilSquare } from "react-icons/bs";

import type {
  UnifiedService,
  ActualVolume,
  ActualPort,
  Mount,
  DetailedContainer,
} from "@/types/unified";
import { generateServiceConfigs } from "@/utils/generateServiceConfigs";
import {
  PiCheckCircle,
  PiCloudX,
  PiFileX,
  PiNotEquals,
  PiPencilSimpleLine,
  PiQuestion,
} from "react-icons/pi";

interface ServiceContainerListProps {
  service: UnifiedService;
}

export const ServiceContainerList: React.FC<ServiceContainerListProps> = ({
  service,
}) => {
  function getStatusColor(status: string) {
    switch (status) {
      case "synced":
        return {
          color: "brand",
          icon: <PiCheckCircle />,
        };
      case "no_compose":
        return {
          color: "yellowBrand",
          icon: <PiFileX />,
        };
      case "no_runtime":
        return {
          color: "redBrand",
          icon: <PiCloudX />,
        };
      case "value_mismatch":
        return {
          color: "yellowBrand",
          icon: <PiNotEquals />,
        };
      default:
        return {
          color: "grayBrand", // Changed from just "brandGray"
          icon: <PiQuestion />, // Add an appropriate default icon
        };
    }
  }

  interface StatusBadgeProps {
    status: string;
    children?: React.ReactNode;
  }

  const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children }) => {
    const { color, icon } = getStatusColor(status);

    return (
      <Badge colorPalette={color}>
        <Icon>{icon}</Icon>
        {children}
      </Badge>
    );
  };

  return (
    <Container w="full">
      <Card.Root overflow="auto" h="88dvh">
        <Card.Header
          gap="4"
          flexDirection={{ base: "column", md: "row" }}
          justifyContent="center"
          p="2"
        >
          <Stack gap="0">
            <Card.Title textStyle="xl">Service Containers</Card.Title>
          </Stack>
        </Card.Header>
        <Card.Body gap="4" h="70dvh" overflow="auto">
          {service.containers.map((c: DetailedContainer) => (
            <Card.Root bg="grayBrand.subtle" p="2">
              <Card.Header
                gap="2"
                flexDirection={{ base: "column", md: "row" }}
                justifyContent="space-between"
                py="1"
              >
                <Stack gap="0">
                  <Status.Root
                    size="md"
                    colorPalette={
                      c.status === "running"
                        ? "brand.solid"
                        : c.status === "partial"
                        ? "brandYellow.solid"
                        : "brandRed.solid"
                    }
                  >
                    <Status.Indicator />
                    <Card.Title textStyle="md">{c.name}</Card.Title>
                  </Status.Root>
                  <Card.Description>Short ID: {c.short_id}</Card.Description>
                </Stack>
              </Card.Header>
              <Card.Body gap="2" p="1">
                <Stack gap="0">
                  <DataList.Root
                    orientation="horizontal"
                    variant="bold"
                    size="sm"
                    p="0"
                  >
                    <Flex
                      direction="column"
                      justifyContent="space-between"
                      gap="0"
                    >
                      <DataList.Item>
                        <DataList.ItemLabel>Created</DataList.ItemLabel>
                        <DataList.ItemValue flex="unset">
                          {c.created.slice(0, 10)}
                        </DataList.ItemValue>
                      </DataList.Item>
                      <DataList.Item>
                        <DataList.ItemLabel>Started</DataList.ItemLabel>
                        <DataList.ItemValue flex="unset">
                          {c.started_at?.slice(0, 10)}
                        </DataList.ItemValue>
                      </DataList.Item>
                    </Flex>
                  </DataList.Root>
                </Stack>
              </Card.Body>
              <Card.Footer py="2">
                <IconButton
                  variant="solid"
                  colorPalette="grayBrand"
                  size="xs"
                  px="2"
                  w="full"
                >
                  <BsPencilSquare /> Something Container
                </IconButton>
              </Card.Footer>
            </Card.Root>
          ))}
        </Card.Body>
        <Card.Footer></Card.Footer>
      </Card.Root>
    </Container>
  );
};
