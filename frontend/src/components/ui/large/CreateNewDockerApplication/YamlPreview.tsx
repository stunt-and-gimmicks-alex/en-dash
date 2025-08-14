// YamlPreview.tsx - Real-time Docker Compose YAML preview with validation

import { useMemo } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";
import {
  Box,
  Card,
  Stack,
  Text,
  HStack,
  Badge,
  Button,
  Icon,
  Tabs,
  Alert,
  Code,
  Separator,
} from "@chakra-ui/react";
import {
  PiCode,
  PiWarning,
  PiCheckCircle,
  PiCopy,
  PiDownload,
  PiPlay,
  PiInfo,
} from "react-icons/pi";

interface YamlPreviewProps {
  compact?: boolean;
  showValidation?: boolean;
  showActions?: boolean;
  maxHeight?: string;
}

export const YamlPreview: React.FC<YamlPreviewProps> = ({
  compact = false,
  showValidation = true,
  showActions = true,
  maxHeight = "60vh",
}) => {
  const { newStack, generateYaml, validateStack } = useNewStackStore();

  // Generate YAML and validation results
  const yamlContent = useMemo(() => generateYaml(), [newStack]);
  const validation = useMemo(() => validateStack(), [newStack]);

  // Stats about the current configuration
  const stats = useMemo(() => {
    const servicesCount = Object.keys(newStack.services).length;
    const networksCount = Object.keys(newStack.networks).length;
    const volumesCount = Object.keys(newStack.volumes).length;
    const secretsCount = Object.keys(newStack.secrets).length;
    const configsCount = Object.keys(newStack.configs).length;

    // Count total ports across all services
    const totalPorts = Object.values(newStack.services).reduce(
      (count, service) => {
        return count + (service.ports?.length || 0);
      },
      0
    );

    // Count total volumes across all services
    const totalVolumeMounts = Object.values(newStack.services).reduce(
      (count, service) => {
        return count + (service.volumes?.length || 0);
      },
      0
    );

    return {
      servicesCount,
      networksCount,
      volumesCount,
      secretsCount,
      configsCount,
      totalPorts,
      totalVolumeMounts,
    };
  }, [newStack]);

  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yamlContent);
      // You could add a toast notification here
      console.log("YAML copied to clipboard");
    } catch (error) {
      console.error("Failed to copy YAML:", error);
    }
  };

  const handleDownloadYaml = () => {
    const blob = new Blob([yamlContent], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${newStack.name || "docker-compose"}.yml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeploy = () => {
    // This would integrate with your deployment system
    console.log("Deploy stack:", newStack);
    // You could call your API here to deploy the stack
  };

  if (compact) {
    return (
      <Card.Root size="sm">
        <Card.Header p="3">
          <HStack justify="space-between">
            <HStack gap="2">
              <Icon color="blue.500">
                <PiCode />
              </Icon>
              <Text fontWeight="semibold" textStyle="sm">
                Preview
              </Text>
              {stats.servicesCount > 0 && (
                <Badge size="sm" colorPalette="blue">
                  {stats.servicesCount} service
                  {stats.servicesCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </HStack>
            {showValidation && (
              <HStack gap="1">
                {validation.errors.length > 0 && (
                  <Badge size="sm" colorPalette="red">
                    {validation.errors.length} error
                    {validation.errors.length !== 1 ? "s" : ""}
                  </Badge>
                )}
                {validation.warnings.length > 0 && (
                  <Badge size="sm" colorPalette="orange">
                    {validation.warnings.length} warning
                    {validation.warnings.length !== 1 ? "s" : ""}
                  </Badge>
                )}
                {validation.errors.length === 0 &&
                  validation.warnings.length === 0 &&
                  stats.servicesCount > 0 && (
                    <Badge size="sm" colorPalette="green">
                      Valid
                    </Badge>
                  )}
              </HStack>
            )}
          </HStack>
        </Card.Header>
        <Card.Body p="3" pt="0">
          <Box
            fontFamily="mono"
            fontSize="xs"
            bg="bg.muted"
            p="2"
            borderRadius="md"
            maxH="200px"
            overflowY="auto"
            whiteSpace="pre-wrap"
            borderWidth="1px"
            borderColor="border.muted"
          >
            {yamlContent ||
              "# No configuration yet\n# Start by adding services"}
          </Box>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap="3">
            <Icon size="lg" color="blue.500">
              <PiCode />
            </Icon>
            <Stack gap="0">
              <Text fontWeight="semibold" textStyle="lg">
                Docker Compose Preview
              </Text>
              <HStack gap="4" wrap="wrap">
                <Text textStyle="xs" color="fg.muted">
                  {stats.servicesCount} service
                  {stats.servicesCount !== 1 ? "s" : ""}
                </Text>
                {stats.networksCount > 0 && (
                  <Text textStyle="xs" color="fg.muted">
                    {stats.networksCount} network
                    {stats.networksCount !== 1 ? "s" : ""}
                  </Text>
                )}
                {stats.volumesCount > 0 && (
                  <Text textStyle="xs" color="fg.muted">
                    {stats.volumesCount} volume
                    {stats.volumesCount !== 1 ? "s" : ""}
                  </Text>
                )}
                {stats.totalPorts > 0 && (
                  <Text textStyle="xs" color="fg.muted">
                    {stats.totalPorts} port{stats.totalPorts !== 1 ? "s" : ""}
                  </Text>
                )}
              </HStack>
            </Stack>
          </HStack>

          {showActions && (
            <HStack gap="2">
              <Button size="sm" variant="ghost" onClick={handleCopyYaml}>
                <PiCopy />
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDownloadYaml}>
                <PiDownload />
                Download
              </Button>
              {validation.errors.length === 0 && stats.servicesCount > 0 && (
                <Button size="sm" colorPalette="green" onClick={handleDeploy}>
                  <PiPlay />
                  Deploy
                </Button>
              )}
            </HStack>
          )}
        </HStack>
      </Card.Header>

      <Card.Body p="0">
        <Tabs.Root defaultValue="yaml" variant="enclosed" size="sm">
          <Tabs.List px="6" pt="0">
            <Tabs.Trigger value="yaml">YAML Output</Tabs.Trigger>
            {showValidation && (
              <Tabs.Trigger value="validation">
                Validation
                {(validation.errors.length > 0 ||
                  validation.warnings.length > 0) && (
                  <Badge
                    size="xs"
                    ml="1"
                    colorPalette={
                      validation.errors.length > 0 ? "red" : "orange"
                    }
                  >
                    {validation.errors.length + validation.warnings.length}
                  </Badge>
                )}
              </Tabs.Trigger>
            )}
            <Tabs.Trigger value="summary">Summary</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="yaml" p="0">
            <Box
              fontFamily="mono"
              fontSize="sm"
              bg="bg.subtle"
              p="6"
              maxH={maxHeight}
              overflowY="auto"
              whiteSpace="pre-wrap"
              borderBottomRadius="md"
              lineHeight="1.4"
            >
              {yamlContent || (
                <Text color="fg.muted" fontStyle="italic">
                  # No configuration yet
                  {"\n"}# Start by adding a service name and image
                  {"\n"}# in the Basic Configuration step
                </Text>
              )}
            </Box>
          </Tabs.Content>

          {showValidation && (
            <Tabs.Content value="validation" p="6">
              <Stack gap="4">
                {validation.errors.length > 0 && (
                  <Alert.Root status="error" variant="surface">
                    <Alert.Indicator>
                      <PiWarning />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title>Configuration Errors</Alert.Title>
                      <Alert.Description>
                        <Stack gap="1" mt="2">
                          {validation.errors.map((error, index) => (
                            <Text key={index} textStyle="sm">
                              • {error}
                            </Text>
                          ))}
                        </Stack>
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}

                {validation.warnings.length > 0 && (
                  <Alert.Root status="warning" variant="surface">
                    <Alert.Indicator>
                      <PiWarning />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title>Configuration Warnings</Alert.Title>
                      <Alert.Description>
                        <Stack gap="1" mt="2">
                          {validation.warnings.map((warning, index) => (
                            <Text key={index} textStyle="sm">
                              • {warning}
                            </Text>
                          ))}
                        </Stack>
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}

                {validation.errors.length === 0 &&
                  validation.warnings.length === 0 &&
                  stats.servicesCount > 0 && (
                    <Alert.Root status="success" variant="surface">
                      <Alert.Indicator>
                        <PiCheckCircle />
                      </Alert.Indicator>
                      <Alert.Content>
                        <Alert.Title>Configuration Valid</Alert.Title>
                        <Alert.Description>
                          Your Docker Compose configuration is valid and ready
                          to deploy.
                        </Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  )}

                {stats.servicesCount === 0 && (
                  <Alert.Root status="info" variant="surface">
                    <Alert.Indicator>
                      <PiInfo />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title>No Services Configured</Alert.Title>
                      <Alert.Description>
                        Start by configuring your first service in the Basic
                        Configuration step.
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}
              </Stack>
            </Tabs.Content>
          )}

          <Tabs.Content value="summary" p="6">
            <Stack gap="4">
              <Text fontWeight="semibold" textStyle="lg">
                Configuration Summary
              </Text>

              <Stack gap="3">
                <HStack justify="space-between">
                  <Text fontWeight="medium">Stack Name:</Text>
                  <Code>
                    {newStack.name || <Text color="fg.muted">Not set</Text>}
                  </Code>
                </HStack>

                {newStack.description && (
                  <HStack justify="space-between" align="flex-start">
                    <Text fontWeight="medium">Description:</Text>
                    <Text textAlign="right" maxW="60%">
                      {newStack.description}
                    </Text>
                  </HStack>
                )}

                <Separator />

                <HStack justify="space-between">
                  <Text fontWeight="medium">Services:</Text>
                  <Badge
                    colorPalette={stats.servicesCount > 0 ? "blue" : "gray"}
                  >
                    {stats.servicesCount}
                  </Badge>
                </HStack>

                {stats.servicesCount > 0 && (
                  <Stack gap="2" ml="4">
                    {Object.entries(newStack.services).map(
                      ([serviceId, service]) => (
                        <HStack
                          key={serviceId}
                          justify="space-between"
                          fontSize="sm"
                        >
                          <Code>{serviceId}</Code>
                          <Text color="fg.muted">{service.image}</Text>
                        </HStack>
                      )
                    )}
                  </Stack>
                )}

                {stats.networksCount > 0 && (
                  <>
                    <HStack justify="space-between">
                      <Text fontWeight="medium">Networks:</Text>
                      <Badge colorPalette="green">{stats.networksCount}</Badge>
                    </HStack>
                    <Stack gap="2" ml="4">
                      {Object.entries(newStack.networks).map(
                        ([networkId, network]) => (
                          <HStack
                            key={networkId}
                            justify="space-between"
                            fontSize="sm"
                          >
                            <Code>{networkId}</Code>
                            <Text color="fg.muted">
                              {network.driver || "bridge"}
                            </Text>
                          </HStack>
                        )
                      )}
                    </Stack>
                  </>
                )}

                {stats.volumesCount > 0 && (
                  <>
                    <HStack justify="space-between">
                      <Text fontWeight="medium">Volumes:</Text>
                      <Badge colorPalette="purple">{stats.volumesCount}</Badge>
                    </HStack>
                    <Stack gap="2" ml="4">
                      {Object.entries(newStack.volumes).map(
                        ([volumeId, volume]) => (
                          <HStack
                            key={volumeId}
                            justify="space-between"
                            fontSize="sm"
                          >
                            <Code>{volumeId}</Code>
                            <Text color="fg.muted">
                              {volume.driver || "local"}
                            </Text>
                          </HStack>
                        )
                      )}
                    </Stack>
                  </>
                )}

                {stats.totalPorts > 0 && (
                  <>
                    <HStack justify="space-between">
                      <Text fontWeight="medium">Port Mappings:</Text>
                      <Badge colorPalette="orange">{stats.totalPorts}</Badge>
                    </HStack>
                    <Stack gap="2" ml="4">
                      {Object.entries(newStack.services).map(
                        ([serviceId, service]) =>
                          service.ports?.map((port, index) => (
                            <HStack
                              key={`${serviceId}-${index}`}
                              justify="space-between"
                              fontSize="sm"
                            >
                              <Code>{serviceId}</Code>
                              <Text color="fg.muted">
                                {typeof port === "object" && "published" in port
                                  ? `${port.published}:${port.target}`
                                  : String(port)}
                              </Text>
                            </HStack>
                          )) || []
                      )}
                    </Stack>
                  </>
                )}

                {stats.totalVolumeMounts > 0 && (
                  <>
                    <HStack justify="space-between">
                      <Text fontWeight="medium">Volume Mounts:</Text>
                      <Badge colorPalette="teal">
                        {stats.totalVolumeMounts}
                      </Badge>
                    </HStack>
                    <Stack gap="2" ml="4">
                      {Object.entries(newStack.services).map(
                        ([serviceId, service]) =>
                          service.volumes?.map((volume, index) => (
                            <HStack
                              key={`${serviceId}-${index}`}
                              justify="space-between"
                              fontSize="sm"
                            >
                              <Code>{serviceId}</Code>
                              <Text
                                color="fg.muted"
                                maxW="60%"
                                textAlign="right"
                              >
                                {typeof volume === "string"
                                  ? volume
                                  : `${volume.source}:${volume.target}`}
                              </Text>
                            </HStack>
                          )) || []
                      )}
                    </Stack>
                  </>
                )}

                {/* Environment variables summary */}
                {Object.values(newStack.services).some(
                  (service) =>
                    service.environment &&
                    Object.keys(service.environment).length > 0
                ) && (
                  <>
                    <Separator />
                    <Text fontWeight="medium">Environment Variables:</Text>
                    <Stack gap="2" ml="4">
                      {Object.entries(newStack.services).map(
                        ([serviceId, service]) =>
                          service.environment &&
                          Object.keys(service.environment).length > 0 && (
                            <HStack
                              key={serviceId}
                              justify="space-between"
                              fontSize="sm"
                            >
                              <Code>{serviceId}</Code>
                              <Badge size="sm" colorPalette="gray">
                                {Object.keys(service.environment).length} var
                                {Object.keys(service.environment).length !== 1
                                  ? "s"
                                  : ""}
                              </Badge>
                            </HStack>
                          )
                      )}
                    </Stack>
                  </>
                )}

                {/* Resource limits summary */}
                {Object.values(newStack.services).some(
                  (service) =>
                    service.cpus ||
                    service.mem_limit ||
                    service.deploy?.resources
                ) && (
                  <>
                    <Separator />
                    <Text fontWeight="medium">Resource Limits:</Text>
                    <Stack gap="2" ml="4">
                      {Object.entries(newStack.services).map(
                        ([serviceId, service]) => {
                          const hasLimits =
                            service.cpus ||
                            service.mem_limit ||
                            service.deploy?.resources;
                          if (!hasLimits) return null;

                          return (
                            <Stack key={serviceId} gap="1" fontSize="sm">
                              <Code>{serviceId}:</Code>
                              <Stack gap="1" ml="4">
                                {service.cpus && (
                                  <HStack justify="space-between">
                                    <Text color="fg.muted">CPU:</Text>
                                    <Text>{service.cpus}</Text>
                                  </HStack>
                                )}
                                {service.mem_limit && (
                                  <HStack justify="space-between">
                                    <Text color="fg.muted">Memory:</Text>
                                    <Text>{service.mem_limit}</Text>
                                  </HStack>
                                )}
                                {service.deploy?.resources?.limits?.cpus && (
                                  <HStack justify="space-between">
                                    <Text color="fg.muted">CPU (Swarm):</Text>
                                    <Text>
                                      {service.deploy.resources.limits.cpus}
                                    </Text>
                                  </HStack>
                                )}
                                {service.deploy?.resources?.limits?.memory && (
                                  <HStack justify="space-between">
                                    <Text color="fg.muted">
                                      Memory (Swarm):
                                    </Text>
                                    <Text>
                                      {service.deploy.resources.limits.memory}
                                    </Text>
                                  </HStack>
                                )}
                              </Stack>
                            </Stack>
                          );
                        }
                      )}
                    </Stack>
                  </>
                )}

                {/* Security configuration summary */}
                {Object.values(newStack.services).some(
                  (service) =>
                    service.privileged ||
                    service.cap_add?.length ||
                    service.cap_drop?.length
                ) && (
                  <>
                    <Separator />
                    <Text fontWeight="medium">Security Configuration:</Text>
                    <Stack gap="2" ml="4">
                      {Object.entries(newStack.services).map(
                        ([serviceId, service]) => {
                          const hasSecurityConfig =
                            service.privileged ||
                            service.cap_add?.length ||
                            service.cap_drop?.length;
                          if (!hasSecurityConfig) return null;

                          return (
                            <HStack
                              key={serviceId}
                              justify="space-between"
                              fontSize="sm"
                            >
                              <Code>{serviceId}</Code>
                              <HStack gap="2">
                                {service.privileged && (
                                  <Badge size="sm" colorPalette="red">
                                    Privileged
                                  </Badge>
                                )}
                                {service.cap_add?.length && (
                                  <Badge size="sm" colorPalette="orange">
                                    +{service.cap_add.length} caps
                                  </Badge>
                                )}
                                {service.cap_drop?.length && (
                                  <Badge size="sm" colorPalette="blue">
                                    -{service.cap_drop.length} caps
                                  </Badge>
                                )}
                              </HStack>
                            </HStack>
                          );
                        }
                      )}
                    </Stack>
                  </>
                )}
              </Stack>
            </Stack>
          </Tabs.Content>
        </Tabs.Root>
      </Card.Body>
    </Card.Root>
  );
};
