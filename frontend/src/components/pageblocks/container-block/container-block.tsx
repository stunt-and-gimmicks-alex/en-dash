"use client";

import { Badge, Container, HStack, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { TextField, TextArea, SelectField } from "./fields";
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
  const restartOptions = [
    { label: "Always", value: "Always" },
    { label: "Unless Stopped", value: "Unless Stopped" },
    { label: "On Failure", value: "On Failure" },
    { label: "No", value: "No" },
  ];

  console.log(stackContainer);

  return (
    <Container
      m="0"
      p="0"
      bg="brand.surfaceContainerLow"
      overflow="scroll"
      scrollbar="hidden"
    >
      <Stack p="6" gap="4">
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
          <TextArea
            label="Description"
            value={stackContainer?.description}
            defaultValue={stackContainers[0].description}
          />
          <TextField
            label={"Container Number:"}
            value={stackContainer?.config.container_number}
            defaultValue={stackContainers[0].config.container_number}
          />
          <TextField
            label={"Created At:"}
            value={stackContainer?.created_at.slice(0, 10)}
            defaultValue={stackContainers[0].created_at[0]}
          />
          <TextField
            label={"Started At:"}
            value={stackContainer?.started_at.slice(0, 10)}
            defaultValue={stackContainers[0].started_at}
          />
          <SelectField
            label="Restart Policy"
            options={restartOptions}
            orientation="vertical"
            defaultValue={stackContainer?.config.restart_policy}
          />
        </PropertySection>
        <PropertySection title="Ports" info="Container port bindings">
          {stackContainer?.config.ports.map((port, i) => (
            <TextField
              label={"Port " + (i + 1) + ":"}
              value={port}
              defaultValue={stackContainers[0].config.ports[0]}
              disabled={true}
            />
          ))}
        </PropertySection>
        <PropertySection
          title="Dependencies"
          info="Container dependency management (WIP)"
        >
          {stackContainer?.config.dependencies.map((dependency, i) => (
            <TextField
              label="Dependent on :"
              value={dependency}
              defaultValue={stackContainers[0]?.config.dependencies[0]}
              disabled={true}
            />
          ))}
        </PropertySection>
        <PropertySection title="Mounts" info="Container mounted volumes">
          {stackContainer?.config.mounts.map((mount, i) => (
            <>
              <Text color="fg.muted" fontWeight="bold">
                <Badge colorPalette="blue" size="md">
                  {mount.mode}
                </Badge>
                <Badge colorPalette="grey" variant="outline">
                  {" " + mount.type + " " + (i + 1) + ": "}
                </Badge>
              </Text>

              <TextArea
                label="Source"
                value={mount.source}
                defaultValue={stackContainers[0]?.config.mounts[0].source}
                disabled={true}
              />
              <TextArea
                label="Destination"
                value={mount.destination}
                defaultValue={stackContainers[0]?.config.mounts[0].destination}
                disabled={true}
              />
            </>
          ))}
        </PropertySection>
        <PropertySection
          title="Networks"
          info="Docker networks the container is connected to."
        >
          {stackContainer?.config.networks.map((netw, i) => (
            <TextField
              label={"Network" + (i + 0) + ":"}
              value={netw}
              defaultValue={stackContainers[0]?.config.networks[0]}
              disabled={false}
            />
          ))}
        </PropertySection>
        <PropertySection
          title="Environmental Variables"
          info="Environmental variables found in the container."
        >
          {stackContainer?.config.environment.map((env, i) => (
            <TextField
              label={env.key}
              value={env.value}
              defaultValue={stackContainers[0]?.config.environment[0].value}
              disabled={false}
            />
          ))}
        </PropertySection>
      </Stack>
    </Container>
  );
};
