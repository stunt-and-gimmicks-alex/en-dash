"use client";

import { Tooltip } from "@/components/ui/tooltip";
import {
  Accordion,
  Grid,
  GridItem,
  HStack,
  Icon,
  Stack,
  Text,
} from "@chakra-ui/react";
import { HiInformationCircle } from "react-icons/hi";
import { LuChevronRight } from "react-icons/lu";

interface PropertySectionProps {
  info?: string;
  title: string;
  children: React.ReactNode;
}

export function PropertySection(props: PropertySectionProps) {
  const { title, children, info } = props;
  return (
    <>
      <Accordion.Item value={title}>
        <Accordion.ItemTrigger>
          <HStack fontWeight="medium" flex="1" textStyle="sm" color="fg">
            <Text
              textStyle="sm"
              fontWeight="medium"
              color="brand.onTertiaryContainer"
            >
              {title}
            </Text>
            {info && <HoverTip content={info} />}
          </HStack>
          <Accordion.ItemIndicator />
        </Accordion.ItemTrigger>
        <Accordion.ItemContent overflow="scroll" scrollbar="hidden">
          <Accordion.ItemBody>
            <Stack gap="2" css={{ "--field-label-width": "50%" }}>
              <Grid
                gap="6"
                templateColumns="repeat(2, minmax(0, 1fr))"
                gridAutoFlow="row"
                overflow="scroll"
                scrollbar="hidden"
                maxH="40dvh"
              >
                {children}
              </Grid>
            </Stack>
          </Accordion.ItemBody>
        </Accordion.ItemContent>
      </Accordion.Item>
    </>
  );
}

function HoverTip({ content }: { content: string }) {
  return (
    <Tooltip
      content={content}
      openDelay={100}
      closeDelay={100}
      positioning={{ placement: "right" }}
    >
      <Icon as={HiInformationCircle} color="fg.subtle" />
    </Tooltip>
  );
}
