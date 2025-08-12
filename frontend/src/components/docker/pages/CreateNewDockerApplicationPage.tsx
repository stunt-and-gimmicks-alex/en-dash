// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░ Functionality Imports ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import React, { useState, useMemo, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░   Component Imports   ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀

import {
  Box,
  Button,
  ButtonGroup,
  Card,
  ClientOnly,
  CodeBlock,
  Flex,
  Float,
  HStack,
  Icon,
  IconButton,
  Stack,
  Steps,
  useSteps,
} from "@chakra-ui/react";
import type { HighlighterGeneric } from "shiki";
import { createShikiAdapter } from "@chakra-ui/react";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      Icon Imports     ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import {
  PiAppWindow,
  PiCarrot,
  PiFileCode,
  PiLightning,
  PiPlus,
} from "react-icons/pi";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      App Imports      ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import { useStacks } from "@/hooks/v06-useStacks";
import { useStackActions } from "@/hooks/v06-useStackActions";
import type { UnifiedStack } from "@/types/unified";
import { StackBlocks } from "@/components/docker/components/applications/StackBlocks";
import { StackDetail } from "@/components/docker/components/applications/StackDetail";
import { useNavigation } from "@/contexts/NavigationContext";
import { NewDockerAppWizard } from "@/components/ui/large/CreateNewDockerApplication/NewDockerApplicationForm";
import { FaHatWizard } from "react-icons/fa";
import { useColorMode } from "@/components/ui/color-mode";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      All The Rest     ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
export const NewDockerApplication: React.FC = () => {
  const { newStack, setNewStack, resetStack } = useNewStackStore();

  const shikiAdapter = createShikiAdapter<HighlighterGeneric<any, any>>({
    async load() {
      const { createHighlighter } = await import("shiki");
      return createHighlighter({
        langs: ["yaml"],
        themes: ["github-dark", "github-light"],
      });
    },
  });

  const file = {
    code: `
version: '3.7'
services:
  cloudflared:
    image: visibilityspots/cloudflared
    container_name: cloudflared
    ports:
      - "5054:5054/tcp"
      - "5054:5054/udp"
    environment:
      - TZ=\${TIMEZONE}
      - PORT=5054
      - ADDRESS=0.0.0.0
    restart: always
    networks:
      dns-net:
        ipv4_address: 172.20.0.2

  pihole:
    container_name: pihole
    image: pihole/pihole:latest
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "67:67/udp"
      - "8080:80/tcp"
      - "8443:443/tcp"
    environment:
      - TZ=\${TIMEZONE}
      - PIHOLE_DNS_=172.20.0.2#5054;1.1.1.1 # referencing by name results in "Invalid IP detected in PIHOLE_DNS_: cloudflared#5054"
      - WEBPASSWORD=\${PIHOLE_PW}
      - REV_SERVER=true
      - REV_SERVER_TARGET=\${PIHOLE_ROUTER_IP}
      - REV_SERVER_DOMAIN=\${PIHOLE_NETWORK_DOMAIN}
      - REV_SERVER_CIDR=\${PIHOLE_REVERSE_DNS}
      - ServerIP=\${PIHOLE_HOST_IP}
      - ServerIPv6=\${PIHOLE_HOST_IPV6}
    #dns:
      #- 127.0.0.1 # "Sets your container's resolve settings to localhost so it can resolve DHCP hostnames [...]" - github.com/pi-hole/docker-pi-hole
      #- 1.1.1.1 # Backup server
    volumes: # store your data between container upgrades
      - "/etc/pihole/:/etc/pihole/"
      - "/etc/dnsmasq.d/:/etc/dnsmasq.d/"
    cap_add:
      - NET_ADMIN # Recommended but not required (DHCP needs NET_ADMIN) https://github.com/pi-hole/docker-pi-hole#note-on-capabilities
    depends_on:
      - "cloudflared"
    restart: always
    networks:
      - dns-net

networks:
  dns-net:
    ipam:
      config:
        - subnet: 172.20.0.0/24
`,
    language: "yaml",
    title: "compose.yaml",
  };

  const [step, setStep] = useState(1);

  const items = [
    {
      title: "Step 1",
      description: "Step 1 description",
    },
    {
      title: "Step 2",
      description: "Step 2 description",
    },
    {
      title: "Step 3",
      description: "Step 3 description",
    },
  ];

  const { colorMode } = useColorMode();

  const steps = useSteps({
    defaultStep: 0,
    count: items.length,
  });

  return (
    <Box
      colorPalette="brand"
      w="full"
      p="6"
      bg="bg"
      justifyItems="center"
      maxH="95dvh"
      overflow="clip"
    >
      <Flex justify="space-evenly" w="full" gap="6">
        <Card.Root w="1/2" borderRadius="0">
          <Card.Header
            gap="6"
            flexDirection={{ base: "column", md: "row" }}
            justifyContent="center"
            alignItems="center"
            pb="2"
          >
            <Icon size="2xl">
              <FaHatWizard />
            </Icon>
            <Stack gap="0" pb="0">
              <Card.Description>Docker Application Wizard</Card.Description>
              <Card.Title textStyle="3xl" pb="0">
                Let's Create A New Docker Application!
              </Card.Title>
            </Stack>
          </Card.Header>
          <Card.Body gap="4" px="6" py="1">
            <Steps.RootProvider orientation="vertical" value={steps}>
              <Steps.List w="full">
                <NewDockerAppWizard />
              </Steps.List>
              <Steps.CompletedContent>
                All steps are complete!
              </Steps.CompletedContent>
            </Steps.RootProvider>
          </Card.Body>
          <Card.Footer p="6" justifyContent="right">
            <ButtonGroup>
              <Button colorPalette="redBrand" variant="solid" color="white">
                Cancel
              </Button>

              <Button
                disabled={
                  !(
                    newStack.name &&
                    newStack.services &&
                    Object.keys(newStack.services).length > 0 &&
                    newStack.networks.length > 0 &&
                    newStack.volumes.length > 0
                  )
                }
              >
                Save and Deploy <PiLightning />
              </Button>
            </ButtonGroup>
          </Card.Footer>
        </Card.Root>
        <Box w="1/2" display="inline-block">
          <Float placement="middle-top" maxW="43dvw">
            <CodeBlock.AdapterProvider value={shikiAdapter}>
              <ClientOnly>
                {() => (
                  <CodeBlock.Root
                    code={file.code}
                    language={file.language}
                    borderRadius="0"
                    meta={{ colorScheme: colorMode, wordWrap: true }}
                  >
                    <CodeBlock.Header>
                      <CodeBlock.Title>
                        <Icon
                          as={PiFileCode}
                          color="brandYellow.400"
                          size="lg"
                        />
                        Compose File Preview
                      </CodeBlock.Title>
                      <CodeBlock.Control>
                        <Float placement="top-end" offset="5" zIndex="1">
                          <CodeBlock.CopyTrigger asChild>
                            <IconButton variant="ghost" size="2xs">
                              <CodeBlock.CopyIndicator />
                            </IconButton>
                          </CodeBlock.CopyTrigger>
                        </Float>
                        <CodeBlock.CollapseTrigger />
                      </CodeBlock.Control>
                    </CodeBlock.Header>
                    <CodeBlock.Content overflow="auto" maxH="87dvh">
                      <CodeBlock.Code>
                        <CodeBlock.CodeText />
                      </CodeBlock.Code>
                    </CodeBlock.Content>
                  </CodeBlock.Root>
                )}
              </ClientOnly>
            </CodeBlock.AdapterProvider>
          </Float>
        </Box>
      </Flex>
    </Box>
  );
};
