// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░ Functionality Imports ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import React, { useState, useMemo, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░   Component Imports   ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
import { Fieldset, Stack } from "@chakra-ui/react";

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// ▓▓▒▒░░      All The Rest     ░░▒▒▓▓
// ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
interface FormSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export const NewDockerAppFormSection = (props: FormSectionProps) => {
  return (
    <Fieldset.Root size="lg" flexDir={{ base: "column", md: "row" }}>
      <Stack flex="1" maxW="2xl">
        <Fieldset.Legend textStyle="xl">{props.title}</Fieldset.Legend>
        <Fieldset.HelperText>{props.description}</Fieldset.HelperText>
      </Stack>
      <Fieldset.Content flex="1" alignItems="flex-end" mt={{ md: "0" }}>
        {props.children}
      </Fieldset.Content>
    </Fieldset.Root>
  );
};
