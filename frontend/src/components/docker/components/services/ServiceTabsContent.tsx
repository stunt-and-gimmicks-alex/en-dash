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
import { ServiceContainerList } from "./ServiceContainerList";

interface ServicesContentProps {
  services: UnifiedService[];
}

export const ServiceTabsContent: React.FC<ServicesContentProps> = ({
  services,
}) => {
  function extractLabel(thing: string, labels: Record<string, string>): string {
    const lowerThing = thing.toLowerCase();

    return (
      Object.entries(labels).find(([key]) =>
        key.toLowerCase().includes(lowerThing)
      )?.[1] ?? `No ${thing} available`
    );
  }

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
    <>
      {services.map((s) => {
        const serviceConfigs = generateServiceConfigs(s);

        return (
          <Tabs.Content key={s.name} value={s.name} pl="2" w="full">
            <HStack w="full">
              <Stack gap="4" minW={{ base: "3xl", md: "5xl" }} maxW="4/5">
                <Card.Root>
                  <Card.Header
                    gap="4"
                    flexDirection={{ base: "column", md: "row" }}
                    justifyContent="space-between"
                  >
                    <Stack gap="0">
                      <Status.Root
                        size="lg"
                        colorPalette={
                          s.status === "running"
                            ? "brand.solid"
                            : s.status === "partial"
                            ? "brandYellow.solid"
                            : "brandRed.solid"
                        }
                      >
                        <Status.Indicator />
                        <Card.Title textStyle="3xl">{s.name}</Card.Title>
                      </Status.Root>
                      <Card.Description>
                        {extractLabel("description", s.containers[0].labels)}
                      </Card.Description>
                    </Stack>
                  </Card.Header>
                  <Card.Body gap="4">
                    <Stack gap="2" pb="2">
                      <DataList.Root
                        orientation="vertical"
                        justifyContent="space-between"
                        flex="content"
                        variant="bold"
                      >
                        <Flex direction="row" justify="start" gap="8">
                          <DataList.Item>
                            <DataList.ItemLabel>
                              Restart Policy
                            </DataList.ItemLabel>{" "}
                            {/* TODO - Need to add a Service- and Container-defined total Networks stat to UnifiedStack */}
                            <DataList.ItemValue flex="unset">
                              {s.containers[0].restart_policy}
                            </DataList.ItemValue>
                          </DataList.Item>
                          <DataList.Item>
                            <DataList.ItemLabel>Image</DataList.ItemLabel>{" "}
                            {/* TODO - Need to add a Service- and Container-defined total Volumes stat to UnifiedStack */}
                            <DataList.ItemValue flex="unset">
                              {s.containers[0].image}
                            </DataList.ItemValue>
                          </DataList.Item>
                        </Flex>
                      </DataList.Root>
                      <HStack px="2" gap="6">
                        {/* TODO - once custom types are implemented, turn this into a map object */}
                        <Stack gap="0.5">
                          <Text textStyle="sm" fontWeight="semibold">
                            Service Type:
                          </Text>
                          <Badge variant="solid" colorPalette="gray">
                            {extractLabel("type", s.containers[0].labels)}{" "}
                            {/* TODO - add custom "type" field to services to allow for logical categorization by function, e.g. "database", "proxy", etc. */}
                          </Badge>
                        </Stack>
                        <Stack gap="0.5">
                          <Text textStyle="sm" fontWeight="semibold">
                            Tags:
                          </Text>
                          <Badge variant="solid" colorPalette="yellow">
                            {extractLabel("type", s.containers[0].labels)}{" "}
                            {/* TODO - add custom "type" field to services to allow for logical categorization by function, e.g. "database", "proxy", etc. */}
                          </Badge>
                        </Stack>
                      </HStack>
                    </Stack>
                  </Card.Body>
                  <Card.Footer>
                    <IconButton
                      variant="outline"
                      colorPalette="grayBrand"
                      size="md"
                      px="2"
                      w="full"
                    >
                      <BsPencilSquare /> Edit Service
                    </IconButton>
                  </Card.Footer>
                </Card.Root>
                <Card.Root maxH="67dvh" overflow="auto">
                  <Card.Header
                    gap="4"
                    flexDirection={{ base: "column", md: "row" }}
                    justifyContent="space-between"
                  >
                    <Stack gap="0">
                      <Card.Title textStyle="lg">Service Config</Card.Title>
                    </Stack>
                  </Card.Header>
                  <Card.Body>
                    <Tabs.Root
                      defaultValue="networks"
                      size="sm"
                      variant="line"
                      w="5xl"
                    >
                      <Tabs.List mx="6">
                        <Tabs.Trigger
                          key="networks"
                          value="networks"
                          flex="1"
                          justifyContent="center"
                        >
                          Networks
                        </Tabs.Trigger>
                        <Tabs.Trigger
                          key="ports"
                          value="ports"
                          flex="1"
                          justifyContent="center"
                        >
                          Ports
                        </Tabs.Trigger>
                        <Tabs.Trigger
                          key="storage"
                          value="storage"
                          flex="1"
                          justifyContent="center"
                        >
                          Storage
                        </Tabs.Trigger>
                        <Tabs.Trigger
                          key="environment"
                          value="environment"
                          flex="1"
                          justifyContent="center"
                        >
                          Environment
                        </Tabs.Trigger>
                        <Tabs.Trigger
                          key="configs"
                          value="configs"
                          flex="1"
                          justifyContent="center"
                        >
                          Misc. Config
                        </Tabs.Trigger>
                      </Tabs.List>
                      <Container h="50dvh" overflow="auto">
                        {serviceConfigs.map((item) => (
                          <Tabs.Content key={item.key} value={item.key}>
                            <Table.Root size="sm" striped>
                              <Table.Header>
                                <Table.Row>
                                  {item.headers.map((header) => (
                                    <Table.ColumnHeader key={header}>
                                      {header}
                                    </Table.ColumnHeader>
                                  ))}
                                </Table.Row>
                              </Table.Header>
                              <Table.Body>
                                {item.data.map((row, rowIndex) => (
                                  <Table.Row key={`${item.key}-${rowIndex}`}>
                                    {row.values.map((value, colIndex) => (
                                      <Table.Cell key={colIndex}>
                                        {colIndex === 0 ? ( // First column is always sync status
                                          <StatusBadge status={row.sync_status}>
                                            {value}
                                          </StatusBadge>
                                        ) : (
                                          value
                                        )}
                                      </Table.Cell>
                                    ))}
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table.Root>
                          </Tabs.Content>
                        ))}
                      </Container>
                    </Tabs.Root>
                  </Card.Body>
                  <Card.Footer>
                    <Button w="full" size="xs" colorPalette="yellowBrand">
                      <PiPencilSimpleLine /> Edit Service Configs
                    </Button>
                  </Card.Footer>
                </Card.Root>
              </Stack>
              <Stack w="2xl" maxW="1/5">
                <ServiceContainerList service={s} />
              </Stack>
            </HStack>
          </Tabs.Content>
        );
      })}
    </>
  );
};
