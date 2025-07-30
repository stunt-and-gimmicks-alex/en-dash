import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Dialog,
  Editable,
  Flex,
  HStack,
  Heading,
  Icon,
  IconButton,
  Stack,
  Status,
  Tabs,
  Text,
  useEditable,
} from "@chakra-ui/react";
import {
  LuRotateCcw,
  LuLayers,
  LuCirclePower,
  LuSettings,
  LuWebhook,
  LuCalendarDays,
  LuBookCheck,
  LuHardDriveDownload,
  LuFileSymlink,
  LuCheck,
  LuPencilLine,
  LuX,
} from "react-icons/lu";
import {
  type ApiStack,
  mapToStackContainers,
  apiService,
  type ApiContainer,
} from "@/services/apiService";
import { useComposeParser } from "@/hooks/useComposeParser";
import { ContainerBlock } from "../container-block/container-block";
import { useMemo, useState, useEffect } from "react";
import {
  getServiceHealthStatus,
  getHealthStatusColor,
} from "@/utils/healthcheckUtils";
import { validateStack } from "@/utils/stackValidation";

interface StackBlocksProps {
  stack: ApiStack;
  onStart: (stackName: string) => Promise<boolean>;
  onStop: (stackName: string) => Promise<boolean>;
  onRestart: (stackName: string) => Promise<boolean>;
  onToggle: (stack: ApiStack | null) => void; // NEW: Toggle callback
  isSelected?: boolean; // NEW: Selected state
  loading?: boolean;
  disabled?: boolean;
}

export const StackBlocks: React.FC<StackBlocksProps> = ({
  stack,
  onStart,
  onStop,
  onRestart,
  onToggle,
  isSelected,
  loading = false,
  disabled = false,
}) => {
  // Handle container click (but not button clicks)
  const handleContainerClick = () => {
    onToggle(isSelected ? null : stack);
  };

  // Prevent event bubbling from buttons
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation(); // This prevents container click
    action();
  };

  return (
    <Container
      fluid
      p="8"
      bg={
        isSelected
          ? {
              base: "brand.surfaceContainerHighest",
              _hover: "brand.surfaceBright",
            }
          : {
              base: "brand.surfaceContainer",
              _hover: "brand.surfaceContainerHigh",
            }
      }
      borderWidth="2px"
      borderColor={
        isSelected
          ? { base: "brand.outline", _hover: "brand.focusRing" }
          : { base: "brand.outlineVariant", _hover: "brand.focusRing" }
      }
      onClick={handleContainerClick}
      transition="background-color 0.2s"
    >
      <Flex
        justify="space-between"
        align="flex-start"
        gap="8"
        direction={{ base: "column", md: "row" }}
      >
        <Stack gap="3">
          <HStack fontWeight="medium" color="fg.muted">
            <LuLayers /> Status:{" "}
            <Status.Root
              colorPalette={
                stack.status === "running"
                  ? "green"
                  : stack.status === "partial"
                  ? "yellow"
                  : stack.status === "stopped"
                  ? "red"
                  : "gray"
              }
              color="brand.onSurfaceVariant"
            >
              {stack.status}&ensp;
              <Status.Indicator />
            </Status.Root>
          </HStack>

          <HStack>
            <Heading size="2xl" mr="4">
              {stack.name}
            </Heading>
            <Badge
              size="sm"
              variant="outline"
              fontWeight="medium"
              colorPalette="teal"
              p="1"
            >
              {stack.containers?.filter((c) => c.status === "running").length ||
                0}{" "}
              running
            </Badge>
            <Badge size="sm" variant="outline" colorPalette="blue" p="1">
              {stack.containers?.filter((c) => c.status === "exited").length ||
                0}{" "}
              stopped
            </Badge>
          </HStack>

          <HStack
            fontFamily="mono"
            color="fg.muted"
            textStyle="sm"
            gap="3"
            mb="2"
          >
            <HStack>
              <LuSettings /> {stack.containers?.length || 0} containers
            </HStack>
            <HStack>
              <LuSettings /> {stack.path || "??_" + stack.name}
            </HStack>
            <HStack>
              <LuCalendarDays />{" "}
              {stack.last_modified
                ? `Updated ${new Date(
                    stack.last_modified
                  ).toLocaleDateString()}`
                : "Recently updated"}
            </HStack>
          </HStack>
        </Stack>
        <HStack gap="4">
          {stack.status === "running" ? (
            <>
              <Button
                variant="ghost"
                colorPalette="gray"
                size="sm"
                onClick={(e) =>
                  handleButtonClick(e, () => onRestart(stack.name))
                }
                disabled={disabled}
              >
                <LuRotateCcw /> Restart
              </Button>
              <Button
                size="lg"
                colorPalette="red"
                variant="ghost"
                onClick={(e) => handleButtonClick(e, () => onStop(stack.name))}
                disabled={disabled}
              >
                <LuCirclePower />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" colorPalette="gray" size="sm" disabled>
                <LuRotateCcw /> Restart
              </Button>
              <Button
                size="lg"
                colorPalette="brand.Primary"
                variant="subtle"
                onClick={(e) => handleButtonClick(e, () => onStart(stack.name))}
                disabled={disabled}
              >
                <LuCirclePower />
                Start
              </Button>
            </>
          )}
        </HStack>
      </Flex>
    </Container>
  );
};

export const StackDetail: React.FC<StackBlocksProps> = ({
  stack,
  onStart,
  onStop,
  onRestart,
  onToggle,
  isSelected,
  loading = false,
  disabled = false,
}) => {
  // Prevent event bubbling from buttons
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation(); // This prevents container click
    action();
  };

  const stackContainers = useMemo(
    () => mapToStackContainers(stack.containers),
    [stack.containers]
  );

  const editable = useEditable({
    defaultValue: stack.compose_content,
  });

  const services = apiService.getServicesForStack(stack);
  const stackValidation = validateStack(stack);

  return (
    <Container w="full" h="100%" fluid overflow="clip" pb="6">
      <HStack pt="6" h="full" alignItems="top" gap={{ sm: "4", md: "6" }}>
        <Container
          maxW="1/3"
          fluid
          bg="brand.surfaceContainerLow"
          py={{ sm: "4", md: "6" }}
        >
          <Stack gap={{ base: "4", md: "5" }} colorPalette="brand">
            <Stack gap={{ base: "2", md: "3" }}>
              <Heading
                as="h3"
                textStyle={{ base: "2xl", md: "3xl" }}
                color="colorPalette.Contrast"
              >
                Stack Overview
              </Heading>
              <HStack alignItems="top" gap="2">
                <Card.Root
                  variant="subtle"
                  colorPalette="brand"
                  borderRadius="0"
                  w="3/4"
                  bg="colorPalette.surfaceContainerHigh"
                  h="full"
                >
                  <Card.Header bg="colorPalette.primaryContainer" pb="4">
                    <Card.Title>Stack Details</Card.Title>
                    <Card.Description color="brand.fg">
                      Key information about your stack.
                    </Card.Description>
                  </Card.Header>
                  <Card.Body gap="2">
                    <HStack gap="5" alignItems="top" w="full">
                      <Stack gap="2" w="full">
                        <Stack gap="0.5">
                          <Text
                            textStyle="sm"
                            fontWeight="medium"
                            color="fg.muted"
                          >
                            Name:
                          </Text>
                          <Code
                            textStyle="md"
                            bg="brand.surfaceContainerLowest"
                            py="1"
                            pl="2"
                          >
                            {stack.name}
                          </Code>
                        </Stack>
                        <Stack gap="0.5">
                          <Text
                            textStyle="sm"
                            fontWeight="medium"
                            color="fg.muted"
                          >
                            Path:
                          </Text>
                          <Code
                            textStyle="md"
                            bg="brand.surfaceContainerLowest"
                            py="1"
                            pl="2"
                          >
                            {stack.path}
                          </Code>
                        </Stack>
                        <Stack gap="0.5">
                          <Text
                            textStyle="sm"
                            fontWeight="medium"
                            color="fg.muted"
                          >
                            Compose File:
                          </Text>
                          <Code
                            textStyle="md"
                            bg="brand.surfaceContainerLowest"
                            py="1"
                            pl="2"
                          >
                            {stack.compose_file}
                          </Code>
                          <Dialog.Root>
                            <Dialog.Trigger asChild>
                              <HStack
                                p="1"
                                gap="1"
                                cursor="pointer"
                                color={{ _hover: "brand.onSurfaceVariant" }}
                              >
                                <Text textStyle="xs">View Compose</Text>
                                <LuFileSymlink />
                              </HStack>
                            </Dialog.Trigger>
                            <Dialog.Backdrop />
                            <Dialog.Positioner>
                              <Dialog.Content bg="brand.surfaceContainer">
                                <Dialog.CloseTrigger />
                                <Dialog.Header bg="brand.secondaryContainer">
                                  <Dialog.Title>
                                    {stack.name + " — " + stack.compose_file}
                                  </Dialog.Title>
                                </Dialog.Header>
                                <Dialog.Body p="2">
                                  <Editable.RootProvider value={editable}>
                                    <Stack w="full" direction="column">
                                      <Editable.Preview
                                        alignItems="flex-start"
                                        width="full"
                                        whiteSpace="pre"
                                        minH="25lh"
                                        textStyle="md"
                                        font="mono"
                                        p={{ sm: "2", md: "4" }}
                                        bg="brand.surfaceContainerLowest"
                                      />
                                      <Editable.Textarea
                                        whiteSpace="pre"
                                        w="full"
                                        minH="25lh"
                                        textStyle="md"
                                        font="mono"
                                        p={{ sm: "2", md: "4" }}
                                        bg="brand.surfaceContainerLowest"
                                      ></Editable.Textarea>
                                      <HStack justifyItems="flex-end" p="2">
                                        <Editable.EditTrigger asChild>
                                          <IconButton
                                            variant="outline"
                                            size="xs"
                                          >
                                            <LuPencilLine />
                                          </IconButton>
                                        </Editable.EditTrigger>
                                        <Editable.CancelTrigger asChild>
                                          <IconButton
                                            variant="outline"
                                            size="xs"
                                          >
                                            <LuX />
                                          </IconButton>
                                        </Editable.CancelTrigger>
                                        <Editable.SubmitTrigger asChild>
                                          <IconButton
                                            variant="outline"
                                            size="xs"
                                          >
                                            <LuCheck />
                                          </IconButton>
                                        </Editable.SubmitTrigger>
                                      </HStack>
                                    </Stack>
                                  </Editable.RootProvider>
                                </Dialog.Body>
                              </Dialog.Content>
                            </Dialog.Positioner>
                          </Dialog.Root>
                        </Stack>
                      </Stack>
                      <Stack gap="2" w="full">
                        <Stack gap="0.5">
                          <Text
                            textStyle="sm"
                            fontWeight="medium"
                            color="fg.muted"
                          >
                            Last Modified:
                          </Text>
                          <Code
                            textStyle="md"
                            bg="brand.surfaceContainerLowest"
                            py="1"
                            pl="2"
                          >
                            {stack.last_modified}
                          </Code>
                        </Stack>
                        <Stack gap="0.5">
                          <Text
                            textStyle="sm"
                            fontWeight="medium"
                            color="fg.muted"
                          >
                            Containers:
                          </Text>
                          {(() => {
                            const running =
                              stack.containers?.filter(
                                (c) => c.status === "running"
                              ).length || 0;
                            const total = stack.containers?.length || 0;
                            return (
                              <Code
                                textStyle="md"
                                bg="brand.surfaceContainerLowest"
                                py="1.5"
                                pl="2"
                              >
                                <Status.Root
                                  colorPalette={
                                    running === total
                                      ? "green"
                                      : running > 0
                                      ? "yellow"
                                      : "red"
                                  }
                                  size="md"
                                >
                                  <Status.Indicator />
                                  {running === total
                                    ? "Healthy"
                                    : running > 0
                                    ? "Degraded"
                                    : "Down"}{" "}
                                  - {running}/{total} running
                                </Status.Root>
                              </Code>
                            );
                          })()}
                        </Stack>
                        <Stack gap="0.5">
                          <Text
                            textStyle="sm"
                            fontWeight="medium"
                            color="fg.muted"
                          >
                            Ports:
                          </Text>
                          <Code
                            textStyle="md"
                            bg="brand.surfaceContainerLowest"
                            py="1"
                            pl="2"
                          >
                            {services?.map((s) => (
                              <Text>
                                {s.normalizedPorts?.map((p) => (
                                  <Text>
                                    {p.host_ip && ":"}
                                    {p.published}:{p.target}
                                  </Text>
                                ))}
                              </Text>
                            ))}
                          </Code>
                        </Stack>
                      </Stack>
                    </HStack>
                  </Card.Body>
                </Card.Root>
                <Card.Root
                  variant="subtle"
                  colorPalette="brand"
                  borderRadius="0"
                  w="1/4"
                  bg="colorPalette.surfaceContainerHigh"
                  h="100"
                >
                  <Card.Header bg="colorPalette.primaryContainer" pb="4">
                    <Card.Title>Stack Controls</Card.Title>
                    <Card.Description color="brand.fg">
                      Manage your stack.
                    </Card.Description>
                  </Card.Header>
                  <Card.Body gap="4">
                    {stack.status === "running" ? (
                      <>
                        <Stack gap="0.5">
                          <Button
                            variant="ghost"
                            color="brand.onSecondaryContainer"
                            bg={{
                              _hover: "brand.secondaryContainer/75",
                            }}
                            size="md"
                            onClick={(e) =>
                              handleButtonClick(e, () => onRestart(stack.name))
                            }
                            disabled={disabled}
                          >
                            <LuRotateCcw /> Restart
                          </Button>
                        </Stack>
                        <Stack gap="0.5">
                          <Button
                            size="lg"
                            color="brand.onErrorContainer"
                            bg={{
                              _hover: "brand.errorContainer/75",
                            }}
                            variant="ghost"
                            onClick={(e) =>
                              handleButtonClick(e, () => onStop(stack.name))
                            }
                            disabled={disabled}
                          >
                            <LuCirclePower />
                            Stop&emsp;
                          </Button>
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Stack gap="0.5">
                          <Button
                            variant="ghost"
                            color="brand.onSecondaryContainer"
                            bg={{
                              _hover: "brand.secondaryContainer/75",
                            }}
                            size="sm"
                            disabled
                          >
                            <LuRotateCcw /> Restart
                          </Button>
                        </Stack>
                        <Stack gap="0.5">
                          <Button
                            size="lg"
                            color="brand.onContainer"
                            bg={{
                              _hover: "brand.container/75",
                            }}
                            variant="ghost"
                            onClick={(e) =>
                              handleButtonClick(e, () => onStart(stack.name))
                            }
                            disabled={disabled}
                          >
                            <LuCirclePower />
                            Start
                          </Button>
                        </Stack>
                      </>
                    )}
                    <Stack gap="0.5">
                      <Button
                        size="lg"
                        color="brand.onTertiaryContainer"
                        bg={{ _hover: "brand.tertiaryContainer/75" }}
                        variant="ghost"
                        disabled={disabled}
                      >
                        <LuHardDriveDownload />
                        Update
                      </Button>
                    </Stack>
                  </Card.Body>
                </Card.Root>
              </HStack>
            </Stack>
            <Card.Root
              variant="subtle"
              colorPalette="brand"
              bg="colorPalette.background"
            >
              <Accordion.Root collapsible variant="outline">
                <Accordion.Item key="1" value="1" borderRadius="0">
                  <Accordion.ItemTrigger
                    py="0"
                    px="4"
                    bg="colorPalette.secondaryContainer"
                    color="colorPalette.contrast"
                    borderRadius="0"
                  >
                    <Icon fontSize="3xl" color="brand.fg">
                      <LuBookCheck />
                    </Icon>
                    <Card.Header gap="0.5" pb="4" w="100%">
                      <Card.Title as="h4">Stack Compose Validation</Card.Title>
                      <Card.Description color="colorPalette.fg">
                        Identify and resolve Docker Compose issues for this
                        stack.
                      </Card.Description>
                    </Card.Header>
                    <Text fontSize="sm">
                      Score:&ensp;{stackValidation.score}/100
                    </Text>
                    <Accordion.ItemIndicator />
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent
                    color="colorPalette.fg"
                    borderRadius="0"
                  >
                    <Accordion.ItemBody>
                      <Card.Body gap="4">
                        <Stack
                          direction="column"
                          justify="space-between"
                          gap="0.5"
                        >
                          Stack Issues Identified
                          <Stack direction="column">
                            <Tabs.Root defaultValue="critical">
                              <Tabs.List>
                                <Tabs.Trigger value="critical">
                                  <LuLayers />
                                  {stackValidation.summary.critical} Critical
                                </Tabs.Trigger>
                                <Tabs.Trigger value="high">
                                  <LuLayers />
                                  {stackValidation.summary.high} High
                                </Tabs.Trigger>
                                <Tabs.Trigger value="medium">
                                  <LuLayers />
                                  {stackValidation.summary.medium} Mediumn
                                </Tabs.Trigger>
                                <Tabs.Trigger value="low">
                                  <LuLayers />
                                  {stackValidation.summary.low} Low
                                </Tabs.Trigger>
                              </Tabs.List>
                              <Tabs.Content value="critical">
                                <Stack gap="4">
                                  {stackValidation.issues
                                    .filter((i) => i.impact === "critical")
                                    .map((issue, i) => (
                                      <Alert.Root
                                        status="error"
                                        bg="colorPalette.container"
                                      >
                                        <Alert.Indicator />
                                        <Alert.Content>
                                          <Alert.Title>
                                            {issue.title}
                                          </Alert.Title>
                                          <Alert.Description>
                                            {issue.description}
                                          </Alert.Description>
                                        </Alert.Content>
                                      </Alert.Root>
                                    ))}
                                </Stack>
                              </Tabs.Content>
                              <Tabs.Content value="high">
                                <Stack gap="4">
                                  {stackValidation.issues
                                    .filter((i) => i.impact === "high")
                                    .map((issue, i) => (
                                      <Alert.Root
                                        status="error"
                                        bg="colorPalette.container"
                                      >
                                        <Alert.Indicator />
                                        <Alert.Content>
                                          <Alert.Title>
                                            {issue.title}
                                          </Alert.Title>
                                          <Alert.Description>
                                            {issue.description}
                                          </Alert.Description>
                                        </Alert.Content>
                                      </Alert.Root>
                                    ))}
                                </Stack>
                              </Tabs.Content>
                              <Tabs.Content value="medium">
                                <Stack gap="4">
                                  {stackValidation.issues
                                    .filter((i) => i.impact === "medium")
                                    .map((issue, i) => (
                                      <Alert.Root
                                        status="error"
                                        bg="colorPalette.container"
                                      >
                                        <Alert.Indicator />
                                        <Alert.Content>
                                          <Alert.Title>
                                            {issue.title}
                                          </Alert.Title>
                                          <Alert.Description>
                                            {issue.description}
                                          </Alert.Description>
                                        </Alert.Content>
                                      </Alert.Root>
                                    ))}
                                </Stack>
                              </Tabs.Content>
                              <Tabs.Content value="low">
                                <Stack gap="4">
                                  {stackValidation.issues
                                    .filter((i) => i.impact === "low")
                                    .map((issue, i) => (
                                      <Alert.Root
                                        status="error"
                                        bg="colorPalette.container"
                                      >
                                        <Alert.Indicator />
                                        <Alert.Content color="colorPalette.onErrorContainer">
                                          <Alert.Title>
                                            {issue.title}
                                          </Alert.Title>
                                          <Alert.Description>
                                            {issue.description}
                                          </Alert.Description>
                                        </Alert.Content>
                                      </Alert.Root>
                                    ))}
                                </Stack>
                              </Tabs.Content>
                            </Tabs.Root>
                          </Stack>
                        </Stack>
                      </Card.Body>
                      <Card.Footer>
                        <Button
                          variant="outline"
                          colorPalette="gray"
                          width="full"
                        >
                          <LuRotateCcw /> Refresh Validation
                        </Button>
                      </Card.Footer>
                    </Accordion.ItemBody>
                  </Accordion.ItemContent>
                </Accordion.Item>
              </Accordion.Root>
            </Card.Root>
          </Stack>
        </Container>
        <Container
          maxW="2/3"
          fluid
          w="full"
          bg="brand.surfaceContainerLow"
          py={{ sm: "4", md: "6" }}
        >
          <Stack gap={{ base: "4", md: "5" }} colorPalette="brand">
            <Stack gap={{ base: "2", md: "3" }}>
              <Heading
                as="h3"
                textStyle={{ base: "2xl", md: "3xl" }}
                color="colorPalette.Contrast"
              >
                Service and Container Overview
              </Heading>
              <Stack>
                <Tabs.Root
                  defaultValue={services[0].name}
                  orientation="vertical"
                  colorPalette="brand"
                  size="lg"
                  h="82dvh"
                  bg="brand.surfaceContainerLowest"
                >
                  <Tabs.List>
                    {services?.map((service) => (
                      <>
                        <Tabs.Trigger value={service.name}>
                          <LuWebhook />
                          {service.name}
                        </Tabs.Trigger>
                      </>
                    ))}
                  </Tabs.List>
                  {services?.map((service) => (
                    <>
                      <Tabs.Content
                        value={service.name}
                        minH="5/6"
                        w="full"
                        p="0"
                      >
                        <Stack p="2" gap="2" w="full">
                          <HStack bg="brand.tertiaryContainer" p="4">
                            <Heading as="h4" color="brand.onTertiaryContainer">
                              Service Overview
                            </Heading>
                          </HStack>
                          <HStack
                            gap="6"
                            bg="brand.surfaceContainerHigh"
                            p="4"
                            w="full"
                          >
                            <Stack gap="0.5" w="full">
                              <Text
                                textStyle="sm"
                                fontWeight="medium"
                                color="fg.muted"
                              >
                                Service Name:
                              </Text>
                              <Code
                                textStyle="md"
                                bg="brand.surfaceContainerLowest"
                                py="1"
                                pl="2"
                              >
                                {service.name}
                              </Code>
                            </Stack>
                            <Stack gap="0.5" w="full">
                              <Text
                                textStyle="sm"
                                fontWeight="medium"
                                color="fg.muted"
                              >
                                Image:
                              </Text>
                              <Code
                                textStyle="md"
                                bg="brand.surfaceContainerLowest"
                                py="1"
                                pl="2"
                              >
                                {service.image}
                              </Code>
                            </Stack>
                            <Stack gap="0.5" w="full">
                              <Text
                                textStyle="sm"
                                fontWeight="medium"
                                color="fg.muted"
                              >
                                Status:
                              </Text>
                              <Code
                                textStyle="md"
                                bg="brand.surfaceContainerLowest"
                                py="1"
                                pl="2"
                              >
                                {service.status}
                              </Code>
                            </Stack>
                            <Stack gap="0.5" w="full">
                              <Text
                                textStyle="sm"
                                fontWeight="medium"
                                color="fg.muted"
                              >
                                Health:
                              </Text>
                              <Code
                                textStyle="md"
                                bg="brand.surfaceContainerLowest"
                                py="1"
                                pl="2"
                              >
                                {service.healthStatus?.overall}
                              </Code>
                            </Stack>
                          </HStack>
                          <HStack gap="2" p="0" w="full" alignItems="top">
                            <Stack
                              gap="6"
                              w="5/12"
                              bg="brand.surfaceContainerLow"
                              p="6"
                              h="68.2dvh"
                            >
                              <Stack gap="0.5" w="full">
                                <Text
                                  textStyle="sm"
                                  fontWeight="medium"
                                  color="fg.muted"
                                >
                                  Ports:
                                </Text>
                                <Stack gap="1">
                                  {service.normalizedPorts?.map((port) => (
                                    <Code
                                      textStyle="md"
                                      bg="brand.surfaceContainerLowest"
                                      py="1"
                                      pl="2"
                                    >
                                      <Text color="brand.contrast">
                                        {(port.name && ">_") || ">_ "}&ensp;
                                      </Text>
                                      <Text color="purple.600">
                                        {port.host_ip && port.host_ip + ":"}
                                      </Text>
                                      <Text color="cyan.400">
                                        {port.published && port.published + ":"}
                                      </Text>
                                      <Text color="yellow.300">
                                        {port.target}
                                      </Text>
                                      <Text color="pink.300">
                                        {"/" + port.protocol}
                                      </Text>
                                    </Code>
                                  ))}
                                </Stack>
                              </Stack>
                              <Stack gap="0.5" w="full">
                                <Text
                                  textStyle="sm"
                                  fontWeight="medium"
                                  color="fg.muted"
                                >
                                  Volumes:
                                </Text>
                                <Code
                                  textStyle="md"
                                  bg="brand.surfaceContainerLowest"
                                  py="1"
                                  pl="2"
                                >
                                  Normalized Volumes Need To Be Added
                                </Code>
                              </Stack>
                              <Stack gap="0.5" w="full">
                                <Text
                                  textStyle="sm"
                                  fontWeight="medium"
                                  color="fg.muted"
                                >
                                  Networks:
                                </Text>
                                <Code
                                  textStyle="md"
                                  bg="brand.surfaceContainerLowest"
                                  py="1"
                                  pl="2"
                                >
                                  Normalized Networks Need To Be Added
                                </Code>
                              </Stack>
                            </Stack>
                            <Stack
                              gap="6"
                              w="full"
                              bg="brand.surfaceContainerLow"
                              p="0"
                              h="68.2dvh"
                            >
                              <Container p="0" m="0" w="full">
                                {(() => {
                                  const containers = useMemo(
                                    () =>
                                      mapToStackContainers(
                                        service.containers as ApiContainer[]
                                      ),
                                    [service.containers]
                                  );
                                  return (
                                    <ContainerBlock
                                      stackContainers={containers}
                                    />
                                  );
                                })()}
                              </Container>
                            </Stack>
                          </HStack>
                        </Stack>
                      </Tabs.Content>
                    </>
                  ))}
                </Tabs.Root>
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </HStack>
    </Container>
  );
};
