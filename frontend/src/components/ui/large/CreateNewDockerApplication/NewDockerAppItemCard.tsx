// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░ Functionality Imports ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import React, { useState, useMemo, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░   Component Imports   ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import {
  CheckboxCard,
  For,
  Group,
  HStack,
  Icon,
  IconButton,
  Stack,
  Text,
} from "@chakra-ui/react";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      App Imports      ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import { PiGhost, PiPencilSimple, PiX } from "react-icons/pi";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      All The Rest     ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀

interface ConfigCardProps {
  labels: string[] | string;
}
export const AppConfigCard = (props: ConfigCardProps) => {
  const l: string[] = [];
  l.concat(props.labels);

  return (
    <Stack w="full">
      <For
        each={l}
        fallback={
          <>
            <Group attached borderWidth="1px" w="full" orientation="horizontal">
              <CheckboxCard.Root
                size="sm"
                h="1.8lh"
                justifyContent="center"
                borderRadius="0"
                borderWidth="0"
                orientation="horizontal"
              >
                <CheckboxCard.HiddenInput />
                <HStack>
                  <CheckboxCard.Control>
                    <CheckboxCard.Label color="fg">
                      App:{" "}
                      <Text
                        color={{
                          base: "brandSecondary.800",
                          _dark: "brandSecondary.500",
                        }}
                      >
                        {props.labels}
                      </Text>
                    </CheckboxCard.Label>
                  </CheckboxCard.Control>
                  <IconButton
                    aria-label="Edit Component"
                    variant="ghost"
                    size="sm"
                  >
                    <PiPencilSimple />
                  </IconButton>
                  <IconButton
                    aria-label="Search database"
                    variant="ghost"
                    size="sm"
                    colorPalette="redBrand"
                  >
                    <PiX />
                  </IconButton>
                </HStack>
              </CheckboxCard.Root>
            </Group>
          </>
        }
      >
        {(item, index) => (
          <Group
            attached
            borderWidth="1px"
            w="full"
            orientation="horizontal"
            key={index}
          >
            <CheckboxCard.Root
              size="sm"
              h="1.8lh"
              justifyContent="center"
              borderRadius="0"
              borderWidth="0"
              orientation="horizontal"
            >
              <CheckboxCard.HiddenInput />
              <HStack>
                <CheckboxCard.Control>
                  <CheckboxCard.Label color="fg">
                    App: <Text color="brandSecondary.500">{item}</Text>
                  </CheckboxCard.Label>
                </CheckboxCard.Control>
                <IconButton
                  aria-label="Edit Component"
                  variant="ghost"
                  size="sm"
                >
                  <PiPencilSimple />
                </IconButton>
                <IconButton
                  aria-label="Search database"
                  variant="ghost"
                  size="sm"
                  colorPalette="redBrand"
                >
                  <PiX />
                </IconButton>
              </HStack>
            </CheckboxCard.Root>
          </Group>
        )}
      </For>
    </Stack>
  );
};
