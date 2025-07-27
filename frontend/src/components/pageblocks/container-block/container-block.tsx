"use client";

import { Container, Stack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { TextField } from "./fields";
import { PropertySection } from "./property-sections";
import { ContainerSelector } from "./property-selector";
import type { StackContainer } from "@/services/apiService";
import type { ParsedService } from "@/utils/composeParser";

interface ContainerBlockProps {
  stackContainers: StackContainer[];
  service?: ParsedService;
  onStart?: (stackName: string) => Promise<boolean>;
  onStop?: (stackName: string) => Promise<boolean>;
  onRestart?: (stackName: string) => Promise<boolean>;
  loading?: boolean;
  disabled?: boolean;
}

export const ContainerBlock: React.FC<ContainerBlockProps> = ({
  stackContainers,
  service,
  onStart,
  onStop,
  onRestart,
  loading = false,
  disabled = false,
}) => {
  const [stackContainer, setContainer] = useState<StackContainer | null>(
    stackContainers[0]
  );
  const setContainerKey = useCallback(
    (key: keyof StackContainer["config"], value: string) => {
      flushSync(() => {
        setContainer((prev) => {
          if (!prev) return null;
          return { ...prev, config: { ...prev.config, [key]: value } };
        });
      });
    },
    []
  );
  const setContainerValue = useCallback((value: string) => {
    const newStackContainer = stackContainers.find((t) => t.id === value);
    if (newStackContainer) setContainer(newStackContainer);
  }, []);

  console.log(stackContainer);

  return (
    <Container maxW="420px" py="20">
      <Stack boxShadow="inset" p="6" gap="6" rounded="l3">
        <ContainerSelector
          items={stackContainers}
          defaultValue={stackContainers[0].id}
          value={stackContainer?.id}
          onChange={(value) => setContainerValue(value)}
        />
        <PropertySection
          title="Container Details"
          info="General container information."
        >
          <TextField
            label="Description"
            value={stackContainer?.description}
            defaultValue={stackContainers[0].description}
            disabled={true}
          />
        </PropertySection>
        <PropertySection title="Ports" info="Container port bindings">
          {stackContainer?.config.ports.map((port, i) => (
            <TextField
              label={"Port " + i + ":"}
              value={port}
              defaultValue={stackContainers[0].config.ports[0]}
              disabled={true}
            />
          ))}
        </PropertySection>
      </Stack>
    </Container>
  );
};
