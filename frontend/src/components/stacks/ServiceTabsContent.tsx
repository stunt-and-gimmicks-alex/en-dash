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

import type {
  UnifiedService,
  ActualVolume,
  ActualPort,
  Mount,
} from "@/types/unified";

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
          <HStack maxH="50%">
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
                <Stack w="full">
                  <CardWithTabs
                    tabs={[
                      {
                        value: "networks",
                        title: "Networks",
                        description: "Defined and detected ntwork information",
                        field: [
                          ...s.networks.map((net: any, i: number) => ({
                            type: "text",
                            orientation: "vertical",
                            status: true,
                            label: `Compose Network ${i + 1}`,
                            defaultvalue: stringify(net),
                            helpertext: "Compose-assigned network",
                          })),
                          ...s.actual_networks.map((net, i) => ({
                            type: "text",
                            orientation: "vertical",
                            status: true,
                            label: `Runtime Network ${i + 1}`,
                            defaultvalue: net,
                            helpertext: "Container detected network",
                          })),
                        ],
                        button: [
                          {
                            colorpalette: "yellow",
                            size: "md",
                            variant: "solid",
                            value: "Edit Networks",
                            status: true,
                          },
                        ],
                      },
                      {
                        value: "ports",
                        title: "Ports",
                        description: "Port mappings and exposures",
                        field: [
                          // Compose-defined ports
                          ...s.ports.map((port, i) => ({
                            type: "text" as const,
                            orientation: "vertical" as const,
                            status: true,
                            label: `Compose Port ${i + 1}`,
                            defaultvalue:
                              typeof port === "string"
                                ? port
                                : JSON.stringify(port, null, 2),
                            helpertext: "Port defined in compose file",
                          })),

                          // Runtime actual ports from containers
                          ...s.actual_ports.map((port, i) => ({
                            type: "textarea" as const,
                            orientation: "vertical" as const,
                            status: true,
                            label: `Runtime Port ${i + 1}: ${port.container}`,
                            defaultvalue: `Container Port: ${port.container_port}\nHost Port: ${port.host_port}\nHost IP: ${port.host_ip}`,
                            helpertext: `Port mapping from container ${port.container}`,
                          })),
                        ],
                        button: [
                          {
                            colorpalette: "yellow",
                            size: "md" as const,
                            variant: "solid" as const,
                            value: "Edit Ports",
                            status: true,
                          },
                        ],
                      },

                      {
                        value: "storage",
                        title: "Storage",
                        description: "Volumes, mounts, and filesystem mappings",
                        field: [
                          // Section 1: Compose-defined volumes
                          ...s.volumes.map((vol, i) => ({
                            type: "text" as const,
                            orientation: "vertical" as const,
                            status: true,
                            label: `Compose Volume ${i + 1}`,
                            defaultvalue:
                              typeof vol === "string"
                                ? vol
                                : JSON.stringify(vol, null, 2),
                            helpertext: "Named volume defined in compose file",
                          })),

                          // Section 2: Runtime volumes (Docker-managed)
                          ...s.actual_volumes.map((vol, i) => ({
                            type: "textarea" as const,
                            orientation: "vertical" as const,
                            status: true,
                            label: `Runtime Volume ${i + 1}: ${vol.container}`,
                            defaultvalue: `Volume: ${vol.volume}\nDestination: ${vol.destination}\nMode: ${vol.mode}`,
                            helpertext: `Docker volume from container ${vol.container}`,
                          })),

                          // Section 3: All other mounts (bind mounts, tmpfs, etc.)
                          ...s.containers.flatMap((container, containerIndex) =>
                            container.mounts
                              .filter((mount) => mount.type !== "volume") // Exclude volumes (already shown above)
                              .map((mount, mountIndex) => ({
                                type: "textarea" as const,
                                orientation: "vertical" as const,
                                status: true,
                                label: `${
                                  mount.type.charAt(0).toUpperCase() +
                                  mount.type.slice(1)
                                } Mount: ${container.name}`,
                                defaultvalue: `Type: ${mount.type}\nSource: ${
                                  mount.source || "N/A"
                                }\nDestination: ${mount.destination}\nMode: ${
                                  mount.mode || "N/A"
                                }\nAccess: ${
                                  mount.rw ? "Read/Write" : "Read Only"
                                }`,
                                helpertext: `${mount.type} mount from container ${container.name}`,
                              }))
                          ),
                        ],
                        button: [
                          {
                            colorpalette: "yellow",
                            size: "md" as const,
                            variant: "solid" as const,
                            value: "Manage Storage",
                            status: true,
                          },
                        ],
                      },
                      {
                        value: "environment",
                        title: "Environment",
                        description: "Environment variables and configuration",
                        field: [
                          // Compose-defined environment
                          ...Object.entries(s.environment).map(
                            ([key, value], i) => ({
                              type: "text" as const,
                              orientation: "vertical" as const,
                              status: true,
                              label: `${key}`,
                              defaultvalue: String(value),
                              helpertext:
                                "Environment variable from compose file",
                            })
                          ),

                          // Runtime environment from containers (might have additional vars)
                          ...s.containers.flatMap((container, containerIndex) =>
                            container.environment
                              .filter((env) => {
                                // Filter out compose-defined vars to avoid duplication
                                const [key] = env.split("=");
                                return !s.environment.hasOwnProperty(key);
                              })
                              .map((env, envIndex) => {
                                const [key, ...valueParts] = env.split("=");
                                const value = valueParts.join("=");
                                return {
                                  type: "text" as const,
                                  orientation: "vertical" as const,
                                  status: true,
                                  label: `${key} (${container.name})`,
                                  defaultvalue: value,
                                  helpertext: `Runtime environment variable from ${container.name}`,
                                };
                              })
                          ),
                        ],
                        button: [
                          {
                            colorpalette: "yellow",
                            size: "md" as const,
                            variant: "solid" as const,
                            value: "Edit Environment",
                            status: true,
                          },
                        ],
                      },
                      {
                        value: "config",
                        title: "Configuration",
                        description: "Service configuration and metadata",
                        field: [
                          // Basic service config
                          {
                            type: "text" as const,
                            orientation: "vertical" as const,
                            status: true,
                            label: "Service Name",
                            defaultvalue: s.name,
                            helpertext: "Service identifier",
                          },
                          {
                            type: "text" as const,
                            orientation: "vertical" as const,
                            status: true,
                            label: "Image",
                            defaultvalue: s.image,
                            helpertext: "Container image being used",
                          },
                          {
                            type: "text" as const,
                            orientation: "vertical" as const,
                            status: true,
                            label: "Restart Policy",
                            defaultvalue: s.restart,
                            helpertext: "Container restart behavior",
                          },
                          ...(s.command
                            ? [
                                {
                                  type: "text" as const,
                                  orientation: "vertical" as const,
                                  status: true,
                                  label: "Command",
                                  defaultvalue: s.command,
                                  helpertext: "Custom command override",
                                },
                              ]
                            : []),

                          // Dependencies
                          ...(s.depends_on.length > 0
                            ? [
                                {
                                  type: "textarea" as const,
                                  orientation: "vertical" as const,
                                  status: true,
                                  label: "Dependencies",
                                  defaultvalue: s.depends_on.join("\n"),
                                  helpertext: "Services this depends on",
                                },
                              ]
                            : []),

                          // Important labels (filter out compose internals)
                          ...Object.entries(s.labels)
                            .filter(
                              ([key]) => !key.startsWith("com.docker.compose")
                            )
                            .map(([key, value]) => ({
                              type: "text" as const,
                              orientation: "vertical" as const,
                              status: true,
                              label: `${key}`,
                              defaultvalue: value,
                              helpertext: "Custom label",
                            })),
                        ],
                        button: [
                          {
                            colorpalette: "yellow",
                            size: "md" as const,
                            variant: "solid" as const,
                            value: "Edit Configuration",
                            status: true,
                          },
                        ],
                      },
                    ]}
                  />
                </Stack>
                <Stack w="full"></Stack>
              </Card.Body>
              <Card.Footer bg="brand.surfaceContainer" />
            </Card.Root>
            <Stack w="full">
              <Text>Stuff</Text>
            </Stack>
          </HStack>
        </Tabs.Content>
      ))}
    </>
  );
};
