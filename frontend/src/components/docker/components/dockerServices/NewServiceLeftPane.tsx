import React from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  ColorSwatch,
  Container,
  DataList,
  Flex,
  Group,
  Heading,
  HoverCard,
  HStack,
  Icon,
  IconButton,
  Link,
  List,
  SimpleGrid,
  Stack,
  Status,
  StatusRoot,
  Table,
  Tabs,
  Text,
} from "@chakra-ui/react";

import type { EnhancedUnifiedService } from "@/types/unified";
import {
  PiAcorn,
  PiArrowsCounterClockwise,
  PiCallBell,
  PiDotsThreeVertical,
  PiDownload,
  PiFirstAid,
  PiHardDrives,
  PiMagnifyingGlass,
  PiNetwork,
  PiPencilSimpleLine,
  PiPower,
  PiShippingContainer,
} from "react-icons/pi";

interface ServicesTabsProps {
  services: EnhancedUnifiedService[];
}

export const NewServiceLeftPane: React.FC<ServicesTabsProps> = ({
  services,
}) => {
  const data = {
    name: "Elena D.",
    title: "Product Designer & Developer",
    image: "https://i.pravatar.cc/300?u=7",
    phone: "+1 202-555-0191",
    email: "elena@example.com",
    location: "New York, NY",
    domain: "https://example.com",
    skills: [
      "UI/UX Design",
      "Frontend Development",
      "User Research",
      "Design Systems",
    ],
  };

  return (
    <Container p="0" m="0" fluid>
      <Table.Root size="md" w="full" interactive colorPalette="gray">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader></Table.ColumnHeader>
            <Table.ColumnHeader>Service</Table.ColumnHeader>
            <Table.ColumnHeader>Category</Table.ColumnHeader>
            <Table.ColumnHeader>Description</Table.ColumnHeader>
            <Table.ColumnHeader>Tags</Table.ColumnHeader>
            <Table.ColumnHeader>Health</Table.ColumnHeader>
            <Table.ColumnHeader>CPU</Table.ColumnHeader>
            <Table.ColumnHeader>RAM</Table.ColumnHeader>
            <Table.ColumnHeader>Restart Policy</Table.ColumnHeader>
            <Table.ColumnHeader>Containers</Table.ColumnHeader>
            <Table.ColumnHeader></Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {services.map((s, i) => (
            <Table.Row key={s.name}>
              <Table.Cell>
                <ButtonGroup variant="ghost" colorPalette="gray">
                  <IconButton>
                    <Icon>
                      <PiPower />
                    </Icon>
                  </IconButton>
                  <IconButton>
                    <Icon>
                      <PiArrowsCounterClockwise />
                    </Icon>
                  </IconButton>
                  <IconButton>
                    <Icon>
                      <PiDownload />
                    </Icon>
                  </IconButton>
                </ButtonGroup>
              </Table.Cell>
              <Table.Cell>
                <HStack colorPalette="brand">
                  <Status.Root
                    color={
                      s.status === "running"
                        ? "brand.fg"
                        : s.status === "partial"
                        ? "yellowBrand.fg"
                        : "redBrand.fg"
                    }
                  >
                    <Status.Indicator />
                    <Text color="fg">{s.name}</Text>
                  </Status.Root>
                </HStack>
              </Table.Cell>
              <Table.Cell>{s.category || "No Category"}</Table.Cell>
              <Table.Cell>{s.description || "No Description"}</Table.Cell>
              <Table.Cell maxW="sm">
                {(s.tags && (
                  <Flex>
                    {s.tags.map((t, i) => (
                      <Badge colorPalette="yellowBrand">{t}</Badge>
                    ))}
                  </Flex>
                )) || <Badge colorPalette="yellowBrand">No Tags</Badge>}
              </Table.Cell>
              <Table.Cell>
                <Group
                  attached
                  colorPalette={
                    s.health_summary.status === "healthy"
                      ? "brand"
                      : s.health_summary.status === "unhealthy"
                      ? "redBrand"
                      : "gray"
                  }
                >
                  <Badge variant="solid">
                    <Icon>
                      <PiFirstAid />
                    </Icon>
                  </Badge>
                  <Badge variant="outline">{s.health_summary.status}</Badge>
                </Group>
              </Table.Cell>
              <Table.Cell>
                <HStack gap="2">
                  <Group attached>
                    <Badge colorPalette="secondaryBrand" variant="solid">
                      Now:
                    </Badge>
                    <Badge colorPalette="secondaryBrand" variant="outline">
                      {s.cpu?.now || "??%"}
                    </Badge>
                  </Group>
                  <Group attached>
                    <Badge colorPalette="secondaryBrand" variant="solid">
                      Avg:
                    </Badge>
                    <Badge colorPalette="secondaryBrand" variant="outline">
                      {s.cpu?.avg || "??%"}
                    </Badge>
                  </Group>
                </HStack>
              </Table.Cell>
              <Table.Cell>
                <HStack gap="2">
                  <Group attached>
                    <Badge colorPalette="secondaryBrand" variant="solid">
                      Now:
                    </Badge>
                    <Badge colorPalette="secondaryBrand" variant="outline">
                      {s.cpu?.now || "??%"}
                    </Badge>
                  </Group>
                  <Group attached>
                    <Badge colorPalette="secondaryBrand" variant="solid">
                      Avg:
                    </Badge>
                    <Badge colorPalette="secondaryBrand" variant="outline">
                      {s.cpu?.now || "??%"}
                    </Badge>
                  </Group>
                </HStack>
              </Table.Cell>
              <Table.Cell>{s.restart}</Table.Cell>
              <Table.Cell>
                <Stack>
                  <HStack>
                    {s.containers.map((c, i) => (
                      <HoverCard.Root key={i}>
                        <HoverCard.Trigger asChild>
                          <Link>
                            <ColorSwatch
                              key={c.short_id}
                              value={
                                c.health.status === "healthy"
                                  ? "#038c3e"
                                  : c.status === "unhealthy"
                                  ? "#ba1a1a"
                                  : "#ecb306"
                              }
                            />
                          </Link>
                        </HoverCard.Trigger>
                        <HoverCard.Positioner>
                          <HoverCard.Content>
                            <HoverCard.Arrow>
                              <HoverCard.ArrowTip />
                            </HoverCard.Arrow>
                            <DataList.Root orientation="horizontal">
                              <DataList.Item>
                                <DataList.ItemLabel>Name:</DataList.ItemLabel>
                                <DataList.ItemValue>
                                  {c.name}
                                </DataList.ItemValue>
                              </DataList.Item>
                              <DataList.Item>
                                <DataList.ItemLabel>Short:</DataList.ItemLabel>
                                <DataList.ItemValue>
                                  {c.short_id}
                                </DataList.ItemValue>
                              </DataList.Item>
                              <DataList.Item>
                                <DataList.ItemLabel>
                                  Created:
                                </DataList.ItemLabel>
                                <DataList.ItemValue>
                                  {new Date(c.created).toLocaleString()}
                                </DataList.ItemValue>
                              </DataList.Item>
                              <DataList.Item>
                                <DataList.ItemLabel>State:</DataList.ItemLabel>
                                <DataList.ItemValue>
                                  {c.state}
                                </DataList.ItemValue>
                              </DataList.Item>
                            </DataList.Root>
                          </HoverCard.Content>
                        </HoverCard.Positioner>
                      </HoverCard.Root>
                    ))}
                  </HStack>
                </Stack>
              </Table.Cell>
              <Table.Cell textAlign="end">
                <ButtonGroup variant="ghost" colorPalette="gray">
                  <IconButton>
                    <Icon>
                      <PiPencilSimpleLine />
                    </Icon>
                  </IconButton>
                  <IconButton>
                    <Icon>
                      <PiMagnifyingGlass />
                    </Icon>
                  </IconButton>
                  <IconButton>
                    <Icon>
                      <PiDotsThreeVertical />
                    </Icon>
                  </IconButton>
                </ButtonGroup>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Container>
  );
};
