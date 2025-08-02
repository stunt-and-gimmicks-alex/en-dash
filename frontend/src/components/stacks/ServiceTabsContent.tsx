import React from "react";
import {
  Badge,
  Card,
  Code,
  Container,
  HStack,
  Heading,
  IconButton,
  Stack,
  Tabs,
  Text,
  TreeView,
  createTreeCollection,
} from "@chakra-ui/react";

import {
  BsHddStackFill,
  BsFileCodeFill,
  BsDiagram2Fill,
  BsBoxSeamFill,
  BsPencilSquare,
} from "react-icons/bs";

import { stringify } from "yaml";
import { InfoField } from "../ui/small/InfoField";
import { CardWithTabs } from "../ui/medium/CardWithTabs";

import type { UnifiedService } from "@/types/unified";

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

  return (
    <>
      {services.map((s) => (
        <Tabs.Content
          key={s.name}
          value={s.name}
          minH="100%"
          w="full"
          maxW="5/6"
          p="0"
        >
          <Card.Root w="full" variant="subtle">
            <Card.Header bg="brand.secondaryContainer">
              <Card.Title>
                <Stack gap="2" pb="2">
                  <HStack px="2">
                    <Heading as="h4" size="3xl">
                      {s.name}
                    </Heading>
                  </HStack>
                  <HStack px="2">
                    <Text
                      textStyle="sm"
                      fontWeight="semibold"
                      color="brand.onSecondaryContainer"
                    >
                      {extractLabel("description", s.containers[0].labels)}
                    </Text>
                  </HStack>
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
                  <HStack>
                    <IconButton
                      variant="ghost"
                      colorPalette="gray"
                      size="md"
                      px="2"
                    >
                      <BsPencilSquare /> Edit Service
                    </IconButton>
                  </HStack>
                </Stack>
              </Card.Title>
            </Card.Header>
            <Card.Body bg="brand.surfaceContainer">
              <HStack maxH="50%">
                <Stack w="full">
                  <Text whiteSpace="preserve">{s.networks[0]}</Text>
                  <CardWithTabs
                    tabs={[
                      {
                        value: "networks",
                        title: "Networks",
                        description: "Defined and detected ntwork information",
                        field: [
                          ...s.networks.map((net: any, i: string) => ({
                            type: "text",
                            orientation: "vertical",
                            status: false,
                            label: "YAML: Network " + i + ":",
                            defaultvalue: stringify(net),
                            helpertext: "Compose-assigned network",
                          })),
                          ...s.actual_networks.map((net, i) => ({
                            type: "text",
                            orientation: "vertical",
                            status: false,
                            label: "Container: Network " + i + ":",
                            defaultvalue: net,
                            helpertext: "Container detected network",
                          })),
                        ],
                        button: [
                          {
                            colorpalette: "blue",
                            size: "md",
                            variant: "solid",
                            value: "Edit Networks",
                            status: true,
                          },
                        ],
                      },
                      {
                        value: "volumes" /* Need help here!!!! */,
                        title: "Volumes",
                        description: "Defined and detected volume information",
                        field: [
                          ...(s.volumes ?? []).map((vol, i) => ({
                            type: "text",
                            orientation: "vertical",
                            status: false,
                            label: `YAML: Volume ${i}`,
                            defaultvalue: vol,
                            helpertext: "Compose-assigned volume",
                          })),
                          ...Object.entries(
                            s.actual_volumes?.map ?? {}
                          ).flatMap(([sourceName, volumeObj], i) => {
                            const vol = volumeObj as {
                              volume: string;
                              destination: string;
                              datamode: string;
                            };

                            return [
                              {
                                type: "text",
                                orientation: "vertical",
                                status: false,
                                label: `Container Volume ${i}: ${sourceName} - Volume`,
                                defaultvalue: vol.volume,
                                helpertext: "Volume name from container",
                              },
                              {
                                type: "text",
                                orientation: "vertical",
                                status: false,
                                label: `Container Volume ${i}: ${sourceName} - Destination`,
                                defaultvalue: vol.destination,
                                helpertext: "Mount path in container",
                              },
                              {
                                type: "text",
                                orientation: "vertical",
                                status: false,
                                label: `Container Volume ${i}: ${sourceName} - Mode`,
                                defaultvalue: vol.datamode,
                                helpertext: "Volume mode (rw/ro)",
                              },
                            ];
                          }),
                        ],
                        button: [
                          {
                            colorpalette: "blue",
                            size: "md",
                            variant: "solid",
                            value: "Edit Volumes",
                            status: true,
                          },
                        ],
                      },
                    ]}
                  />
                </Stack>
                <Stack w="full"></Stack>
              </HStack>
            </Card.Body>
            <Card.Footer bg="brand.surfaceContainer" />
          </Card.Root>
        </Tabs.Content>
      ))}
    </>
  );
};
