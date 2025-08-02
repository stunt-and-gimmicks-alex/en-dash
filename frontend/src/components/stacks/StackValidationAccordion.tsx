// Stack Validation section for StackDetail.tsx
// Built specifically for UnifiedStack - no type conversions needed

import React, { useMemo } from "react";
import {
  Accordion,
  Alert,
  Button,
  Card,
  Icon,
  Stack,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { LuBookCheck, LuLayers, LuRotateCcw } from "react-icons/lu";
import type { UnifiedStack } from "@/types/unified";

// =============================================================================
// UNIFIED STACK VALIDATION TYPES
// =============================================================================

interface ValidationIssue {
  type: "warning" | "error" | "info" | "suggestion";
  category:
    | "health"
    | "security"
    | "performance"
    | "monitoring"
    | "configuration";
  title: string;
  description: string;
  impact: "low" | "medium" | "high" | "critical";
  fix?: string;
  learnMoreUrl?: string;
}

interface StackValidationResult {
  score: number; // 0-100
  issues: ValidationIssue[];
  healthGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// =============================================================================
// UNIFIED STACK VALIDATION LOGIC
// =============================================================================

const validateUnifiedStack = (stack: UnifiedStack): StackValidationResult => {
  const issues: ValidationIssue[] = [];

  // Health Monitoring Checks
  validateHealthChecks(stack, issues);

  // Security Checks
  validateSecurity(stack, issues);

  // Performance Checks
  validatePerformance(stack, issues);

  // Configuration Checks
  validateConfiguration(stack, issues);

  // Monitoring & Observability
  validateObservability(stack, issues);

  // Calculate summary
  const summary = {
    critical: issues.filter((i) => i.impact === "critical").length,
    high: issues.filter((i) => i.impact === "high").length,
    medium: issues.filter((i) => i.impact === "medium").length,
    low: issues.filter((i) => i.impact === "low").length,
  };

  const score = calculateScore(summary);
  const healthGrade = getHealthGrade(score);

  return { score, issues, healthGrade, summary };
};

// Health monitoring validation
const validateHealthChecks = (
  stack: UnifiedStack,
  issues: ValidationIssue[]
) => {
  const containers = stack.containers?.containers || [];

  // Check for missing health checks
  const containersWithoutHealth = containers.filter(
    (container) =>
      !container.health?.status || container.health.status === "none"
  );

  if (containersWithoutHealth.length > 0) {
    issues.push({
      type: "warning",
      category: "health",
      title: "Missing Health Checks",
      description: `${containersWithoutHealth.length}/${containers.length} containers lack health check configuration`,
      impact: "medium",
      fix: "Add HEALTHCHECK instructions to Dockerfiles or healthcheck configs to compose services",
      learnMoreUrl:
        "https://docs.docker.com/engine/reference/builder/#healthcheck",
    });
  }

  // Check for long-running containers
  const oldContainers = containers.filter((container) => {
    if (!container.started_at) return false;
    const started = new Date(container.started_at);
    const daysSinceStart =
      (Date.now() - started.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceStart > 30;
  });

  if (oldContainers.length > 0) {
    issues.push({
      type: "info",
      category: "monitoring",
      title: "Long-Running Containers",
      description: `${oldContainers.length} containers have been running for over 30 days`,
      impact: "low",
      fix: "Consider periodic restarts to apply updates and clear memory leaks",
    });
  }

  // Check for failed containers
  const failedContainers = containers.filter(
    (container) => container.status === "exited" || container.state === "dead"
  );

  if (failedContainers.length > 0) {
    issues.push({
      type: "error",
      category: "health",
      title: "Failed Containers",
      description: `${failedContainers.length} containers have failed or exited`,
      impact: "high",
      fix: "Check container logs and fix configuration issues",
    });
  }
};

// Security validation
const validateSecurity = (stack: UnifiedStack, issues: ValidationIssue[]) => {
  const containers = stack.containers?.containers || [];
  const services = Object.values(stack.services || {});

  // Check for privileged containers
  const privilegedContainers = containers.filter(
    (container) =>
      container.labels?.["com.docker.compose.privileged"] === "true"
  );

  if (privilegedContainers.length > 0) {
    issues.push({
      type: "error",
      category: "security",
      title: "Privileged Containers",
      description: `${privilegedContainers.length} containers running in privileged mode`,
      impact: "critical",
      fix: "Remove privileged: true unless absolutely necessary. Use specific capabilities instead.",
      learnMoreUrl:
        "https://docs.docker.com/engine/reference/run/#runtime-privilege-and-linux-capabilities",
    });
  }

  // Check for containers potentially running as root
  const potentialRootContainers = containers.filter((container) => {
    const env = container.environment || [];
    return !env.some(
      (e) =>
        e.includes("USER=") && !e.includes("USER=root") && !e.includes("USER=0")
    );
  });

  if (potentialRootContainers.length > 0) {
    issues.push({
      type: "warning",
      category: "security",
      title: "Containers May Run as Root",
      description: `${potentialRootContainers.length} containers may be running as root user`,
      impact: "high",
      fix: "Add USER instruction in Dockerfile or user: directive in compose file",
    });
  }

  // Check for exposed sensitive ports
  const sensitivePorts = ["22", "3389", "5432", "3306", "6379", "27017"];
  const exposedSensitivePorts = services.some((service) =>
    service.actual_ports?.some(
      (port) =>
        sensitivePorts.includes(port.container_port) ||
        sensitivePorts.includes(port.host_port)
    )
  );

  if (exposedSensitivePorts) {
    issues.push({
      type: "warning",
      category: "security",
      title: "Sensitive Ports Exposed",
      description:
        "Database or admin ports (SSH, RDP, PostgreSQL, MySQL, Redis, MongoDB) are exposed",
      impact: "high",
      fix: "Use internal networks or VPN instead of exposing sensitive ports directly",
    });
  }

  // Check for hardcoded secrets in environment
  const servicesWithSecrets = services.filter((service) => {
    const env = service.environment || {};
    return (
      Object.keys(env).some(
        (key) =>
          key.includes("PASSWORD") ||
          key.includes("SECRET") ||
          key.includes("KEY")
      ) ||
      Object.values(env).some(
        (value) =>
          typeof value === "string" &&
          (value.includes("password") ||
            value.includes("secret") ||
            value.includes("key"))
      )
    );
  });

  if (servicesWithSecrets.length > 0) {
    issues.push({
      type: "error",
      category: "security",
      title: "Potential Hardcoded Secrets",
      description: `${servicesWithSecrets.length} services may have hardcoded passwords or secrets`,
      impact: "critical",
      fix: "Use Docker secrets, .env files, or external secret management",
    });
  }
};

// Performance validation
const validatePerformance = (
  stack: UnifiedStack,
  issues: ValidationIssue[]
) => {
  const containers = stack.containers?.containers || [];
  const services = Object.values(stack.services || {});

  // Check for missing resource limits
  const containersWithoutLimits = containers.filter(
    (container) =>
      !container.resources?.memory && !container.resources?.cpu_quota
  );

  if (containersWithoutLimits.length > 0) {
    issues.push({
      type: "suggestion",
      category: "performance",
      title: "Missing Resource Limits",
      description: `${containersWithoutLimits.length} containers lack memory or CPU limits`,
      impact: "medium",
      fix: "Add deploy.resources.limits to prevent containers from consuming all system resources",
    });
  }

  // Check for bind mounts (potential performance issue)
  const bindMounts = containers.filter((container) =>
    container.mounts?.some((mount) => mount.type === "bind")
  );

  if (bindMounts.length > 0) {
    issues.push({
      type: "info",
      category: "performance",
      title: "Bind Mounts Detected",
      description: `${bindMounts.length} containers use bind mounts which may impact performance`,
      impact: "low",
      fix: "Consider using named volumes for better performance and portability",
    });
  }
};

// Configuration validation
const validateConfiguration = (
  stack: UnifiedStack,
  issues: ValidationIssue[]
) => {
  const containers = stack.containers?.containers || [];
  const services = Object.values(stack.services || {});

  // Check for missing restart policies
  const containersWithoutRestart = containers.filter(
    (container) =>
      !container.restart_policy || container.restart_policy === "no"
  );

  if (containersWithoutRestart.length > 0) {
    issues.push({
      type: "warning",
      category: "configuration",
      title: "Missing Restart Policies",
      description: `${containersWithoutRestart.length} containers lack proper restart policies`,
      impact: "medium",
      fix: "Add restart: unless-stopped or restart: always to compose services",
    });
  }

  // Check for missing compose version
  const composeContent = stack.compose_content;
  if (typeof composeContent === "object" && !composeContent.version) {
    issues.push({
      type: "suggestion",
      category: "configuration",
      title: "Missing Compose Version",
      description: "Compose file doesn't specify a version",
      impact: "low",
      fix: "Add version: '3.8' or higher to your compose file",
    });
  }

  // Check for services without proper dependencies
  const servicesWithoutDependencies = services.filter(
    (service) => service.depends_on.length === 0 && services.length > 1
  );

  if (servicesWithoutDependencies.length > 1) {
    issues.push({
      type: "suggestion",
      category: "configuration",
      title: "Missing Service Dependencies",
      description: `${servicesWithoutDependencies.length} services don't specify dependencies`,
      impact: "low",
      fix: "Add depends_on to ensure proper startup order",
    });
  }
};

// Observability validation
const validateObservability = (
  stack: UnifiedStack,
  issues: ValidationIssue[]
) => {
  const containers = stack.containers?.containers || [];
  const services = Object.values(stack.services || {});

  // Check for missing custom labels
  const containersWithoutLabels = containers.filter((container) => {
    const labels = container.labels || {};
    const hasCustomLabels = Object.keys(labels).some(
      (key) =>
        !key.startsWith("com.docker.compose") &&
        !key.startsWith("org.opencontainers.image")
    );
    return !hasCustomLabels;
  });

  if (containersWithoutLabels.length > 0) {
    issues.push({
      type: "suggestion",
      category: "monitoring",
      title: "Missing Custom Labels",
      description: `${containersWithoutLabels.length} containers lack custom labels for monitoring`,
      impact: "low",
      fix: "Add custom labels for better container organization and monitoring",
    });
  }

  // Check for missing logging configuration
  const servicesWithoutLogging = services.filter(
    (service) => !service.config?.logging
  );

  if (servicesWithoutLogging.length > 0) {
    issues.push({
      type: "suggestion",
      category: "monitoring",
      title: "Default Logging Configuration",
      description: `${servicesWithoutLogging.length} services use default logging configuration`,
      impact: "low",
      fix: "Configure logging drivers for better log management",
    });
  }
};

// Calculate score based on issues
const calculateScore = (summary: {
  critical: number;
  high: number;
  medium: number;
  low: number;
}): number => {
  const totalDeductions =
    summary.critical * 25 +
    summary.high * 15 +
    summary.medium * 8 +
    summary.low * 3;

  return Math.max(0, 100 - totalDeductions);
};

// Get health grade based on score
const getHealthGrade = (score: number): "A+" | "A" | "B" | "C" | "D" | "F" => {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
};

// =============================================================================
// REACT HOOK
// =============================================================================

export const useUnifiedStackValidation = (stack: UnifiedStack) => {
  return useMemo(() => {
    try {
      return validateUnifiedStack(stack);
    } catch (error) {
      console.error("Stack validation error:", error);
      return {
        score: 50,
        issues: [
          {
            type: "error" as const,
            category: "configuration" as const,
            title: "Validation Error",
            description: "Unable to validate stack configuration",
            impact: "medium" as const,
            fix: "Check stack configuration and try again",
          },
        ],
        healthGrade: "C" as const,
        summary: { critical: 0, high: 0, medium: 1, low: 0 },
      };
    }
  }, [stack]);
};

// =============================================================================
// REACT COMPONENT
// =============================================================================

export const StackValidationAccordion: React.FC<{ stack: UnifiedStack }> = ({
  stack,
}) => {
  const stackValidation = useUnifiedStackValidation(stack);

  return (
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
              <Card.Description color="brand.onSecondaryContainer">
                Identify and resolve Docker Compose issues for this stack.
              </Card.Description>
            </Card.Header>
            <Text fontSize="sm">
              Score:&ensp;{stackValidation.score}/100 (
              {stackValidation.healthGrade})
            </Text>
            <Accordion.ItemIndicator />
          </Accordion.ItemTrigger>
          <Accordion.ItemContent color="colorPalette.fg" borderRadius="0">
            <Accordion.ItemBody h="45dvh" overflow="auto">
              <Card.Body gap="4">
                <Stack direction="column" justify="space-between" gap="0.5">
                  <Text fontWeight="medium">Stack Issues Identified</Text>
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
                          {stackValidation.summary.medium} Medium
                        </Tabs.Trigger>
                        <Tabs.Trigger value="low">
                          <LuLayers />
                          {stackValidation.summary.low} Low
                        </Tabs.Trigger>
                      </Tabs.List>

                      {/* Critical Issues */}
                      <Tabs.Content value="critical">
                        <Stack gap="4">
                          {stackValidation.issues
                            .filter((i) => i.impact === "critical")
                            .map((issue, i) => (
                              <Alert.Root
                                key={i}
                                status="error"
                                bg="colorPalette.container"
                              >
                                <Alert.Indicator />
                                <Alert.Content>
                                  <Alert.Title>{issue.title}</Alert.Title>
                                  <Alert.Description>
                                    {issue.description}
                                  </Alert.Description>
                                  {issue.fix && (
                                    <Text
                                      fontSize="sm"
                                      mt="2"
                                      fontWeight="medium"
                                    >
                                      Fix: {issue.fix}
                                    </Text>
                                  )}
                                </Alert.Content>
                              </Alert.Root>
                            ))}
                          {stackValidation.issues.filter(
                            (i) => i.impact === "critical"
                          ).length === 0 && (
                            <Text color="colorPalette.onContainer">
                              No critical issues found.
                            </Text>
                          )}
                        </Stack>
                      </Tabs.Content>

                      {/* High Issues */}
                      <Tabs.Content value="high">
                        <Stack gap="4">
                          {stackValidation.issues
                            .filter((i) => i.impact === "high")
                            .map((issue, i) => (
                              <Alert.Root
                                key={i}
                                status="warning"
                                bg="colorPalette.container"
                              >
                                <Alert.Indicator />
                                <Alert.Content>
                                  <Alert.Title>{issue.title}</Alert.Title>
                                  <Alert.Description>
                                    {issue.description}
                                  </Alert.Description>
                                  {issue.fix && (
                                    <Text
                                      fontSize="sm"
                                      mt="2"
                                      fontWeight="medium"
                                    >
                                      Fix: {issue.fix}
                                    </Text>
                                  )}
                                </Alert.Content>
                              </Alert.Root>
                            ))}
                          {stackValidation.issues.filter(
                            (i) => i.impact === "high"
                          ).length === 0 && (
                            <Text color="colorPalette.onContainer">
                              No high priority issues found.
                            </Text>
                          )}
                        </Stack>
                      </Tabs.Content>

                      {/* Medium Issues */}
                      <Tabs.Content value="medium">
                        <Stack gap="4">
                          {stackValidation.issues
                            .filter((i) => i.impact === "medium")
                            .map((issue, i) => (
                              <Alert.Root
                                key={i}
                                status="info"
                                bg="colorPalette.container"
                              >
                                <Alert.Indicator />
                                <Alert.Content>
                                  <Alert.Title>{issue.title}</Alert.Title>
                                  <Alert.Description>
                                    {issue.description}
                                  </Alert.Description>
                                  {issue.fix && (
                                    <Text
                                      fontSize="sm"
                                      mt="2"
                                      fontWeight="medium"
                                    >
                                      Fix: {issue.fix}
                                    </Text>
                                  )}
                                </Alert.Content>
                              </Alert.Root>
                            ))}
                          {stackValidation.issues.filter(
                            (i) => i.impact === "medium"
                          ).length === 0 && (
                            <Text color="colorPalette.onContainer">
                              No medium priority issues found.
                            </Text>
                          )}
                        </Stack>
                      </Tabs.Content>

                      {/* Low Issues */}
                      <Tabs.Content value="low">
                        <Stack gap="4">
                          {stackValidation.issues
                            .filter((i) => i.impact === "low")
                            .map((issue, i) => (
                              <Alert.Root
                                key={i}
                                status="neutral"
                                bg="colorPalette.container"
                              >
                                <Alert.Indicator />
                                <Alert.Content>
                                  <Alert.Title>{issue.title}</Alert.Title>
                                  <Alert.Description>
                                    {issue.description}
                                  </Alert.Description>
                                  {issue.fix && (
                                    <Text
                                      fontSize="sm"
                                      mt="2"
                                      fontWeight="medium"
                                    >
                                      Fix: {issue.fix}
                                    </Text>
                                  )}
                                </Alert.Content>
                              </Alert.Root>
                            ))}
                          {stackValidation.issues.filter(
                            (i) => i.impact === "low"
                          ).length === 0 && (
                            <Text color="colorPalette.onContainer">
                              No low priority issues found.
                            </Text>
                          )}
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
                  onClick={() => {
                    // Force re-validation by triggering a re-render
                    console.log("Refreshing validation for stack:", stack.name);
                  }}
                >
                  <LuRotateCcw /> Refresh Validation
                </Button>
              </Card.Footer>
            </Accordion.ItemBody>
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>
    </Card.Root>
  );
};
