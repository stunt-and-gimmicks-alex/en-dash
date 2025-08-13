import React from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  DataList,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Status,
  StatusRoot,
  Tabs,
  Text,
} from "@chakra-ui/react";

import type { EnhancedUnifiedService } from "@/types/unified";
import {
  PiAcorn,
  PiCallBell,
  PiHardDrives,
  PiNetwork,
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
    <SimpleGrid columns={4} columnGap="2" rowGap="4" minChildWidth="sm">
      {services.map((s, i) => (
        <Card.Root px="6" pb="6" key={i} maxW="sm">
          <Stack gap="4">
            <Card.Header>
              <Card.Title textStyle="xl" fontWeight="medium">
                <Stack gap="0.5">
                  {s.name}
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
                    {s.status}&ensp;/&ensp;{s.health_summary.status}
                  </Status.Root>
                </Stack>
              </Card.Title>
              <Card.Description>
                Service Type:&emsp;
                <Badge variant="solid" colorPalette="gray">
                  AI/ML
                </Badge>
              </Card.Description>
            </Card.Header>

            <HStack>
              <Button size="xs" colorPalette="green">
                <PiAcorn />
                Call
              </Button>
              <Button size="xs">
                <PiAcorn />
                Chat
              </Button>
              <Button size="xs" variant="subtle" colorPalette="gray">
                <PiAcorn />
                Mute
              </Button>
              <Button size="xs" variant="subtle" colorPalette="gray">
                <PiAcorn />
                Share
              </Button>
            </HStack>

            <DataList.Root orientation="vertical" mt="2">
              <DataList.Item>
                <DataList.ItemLabel>Image</DataList.ItemLabel>
                <DataList.ItemValue>{s.image}</DataList.ItemValue>
              </DataList.Item>
              <DataList.Item>
                <DataList.ItemLabel>Restart Policy</DataList.ItemLabel>
                <DataList.ItemValue>{s.restart}</DataList.ItemValue>
              </DataList.Item>
              <DataList.Item>
                <DataList.ItemLabel>Location</DataList.ItemLabel>
                <DataList.ItemValue>Something</DataList.ItemValue>
              </DataList.Item>
              <DataList.Item>
                <DataList.ItemLabel>Domain</DataList.ItemLabel>
                <DataList.ItemValue>
                  <Badge variant="outline">{data.domain}</Badge>
                </DataList.ItemValue>
              </DataList.Item>
              <DataList.Item>
                <DataList.ItemLabel alignItems="flex-start">
                  Skills
                </DataList.ItemLabel>
                <DataList.ItemValue>
                  {" "}
                  <HStack wrap="wrap">
                    {data.skills.map((skill) => (
                      <Badge key={skill} colorPalette="gray">
                        {skill}
                      </Badge>
                    ))}
                  </HStack>
                </DataList.ItemValue>
              </DataList.Item>
            </DataList.Root>
          </Stack>
        </Card.Root>
      ))}
    </SimpleGrid>
  );
};
