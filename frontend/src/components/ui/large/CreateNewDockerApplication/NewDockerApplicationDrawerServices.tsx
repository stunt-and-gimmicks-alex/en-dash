// NewDockerApplicationDrawerServices.tsx - Complete service configuration drawer

import { useState, useEffect } from "react";
import { useNewStackStore } from "@/stores/useNewStackStore";
import type { ServiceConfig } from "@/stores/useNewStackStore";
import {
  Button,
  Drawer,
  Stack,
  HStack,
  Text,
  IconButton,
  CloseButton,
  Input,
  Tabs,
  Badge,
  Checkbox,
} from "@chakra-ui/react";
import {
  SelectField,
  TextField,
  NumberField,
} from "./NewDockerApplicationDrawerFields";
import { PropertySection } from "./NewDockerApplicationDrawerPropSection";
import { PiPlus, PiX } from "react-icons/pi";

interface ServiceDrawerProps {
  serviceId?: string;
  onClose?: () => void;
}

export const NewDockDrawerServices: React.FC<ServiceDrawerProps> = ({
  serviceId,
  onClose,
}) => {
  const { newStack, setNewStack } = useNewStackStore();

  // Basic service state
  const [serviceName, setServiceName] = useState("");
  const [serviceImage, setServiceImage] = useState("");
  const [serviceCommand, setServiceCommand] = useState("");
  const [serviceEntrypoint, setServiceEntrypoint] = useState("");
  const [serviceWorkingDir, setServiceWorkingDir] = useState("");
  const [serviceUser, setServiceUser] = useState("");
  const [serviceRestart, setServiceRestart] = useState<
    "no" | "always" | "unless-stopped" | "on-failure"
  >("unless-stopped");

  // Networking state
  const [servicePorts, setServicePorts] = useState<string[]>([]);
  const [serviceExpose, setServiceExpose] = useState<string[]>([]);
  const [serviceNetworks, setServiceNetworks] = useState<string[]>([]);
  const [serviceHostname, setServiceHostname] = useState("");
  const [serviceExtraHosts, setServiceExtraHosts] = useState<
    Array<{ host: string; ip: string }>
  >([]);

  // Environment state
  const [serviceEnvironment, setServiceEnvironment] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [serviceEnvFiles, setServiceEnvFiles] = useState<string[]>([]);

  // Volume state
  const [serviceVolumes, setServiceVolumes] = useState<
    Array<{
      type: "bind" | "volume" | "tmpfs";
      source: string;
      target: string;
      readOnly: boolean;
    }>
  >([]);
  const [serviceTmpfs, setServiceTmpfs] = useState<string[]>([]);

  // Dependencies state
  const [serviceDependsOn, setServiceDependsOn] = useState<
    Array<{
      service: string;
      condition:
        | "service_started"
        | "service_healthy"
        | "service_completed_successfully";
    }>
  >([]);

  // Resource limits state
  const [resourceLimits, setResourceLimits] = useState({
    cpus: "",
    memory: "",
    memoryReservation: "",
    memswapLimit: "",
    cpuShares: "",
  });

  // Security state
  const [securityConfig, setSecurityConfig] = useState({
    privileged: false,
    readOnly: false,
    user_ns_mode: "",
    pid: "",
    ipc: "",
    capAdd: [] as string[],
    capDrop: [] as string[],
    securityOpt: [] as string[],
    devices: [] as string[],
  });

  // Health check state
  const [healthCheck, setHealthCheck] = useState({
    test: "",
    interval: "30s",
    timeout: "10s",
    retries: 3,
    start_period: "0s",
  });

  // Labels and metadata
  const [serviceLabels, setServiceLabels] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceTags, setServiceTags] = useState<string[]>([]);

  // Logging configuration
  const [loggingConfig, setLoggingConfig] = useState({
    driver: "",
    options: [] as Array<{ key: string; value: string }>,
  });

  const isEditing = !!serviceId;

  // Load existing service data if editing
  useEffect(() => {
    if (serviceId && newStack.services?.[serviceId]) {
      const service = newStack.services[serviceId];

      // Basic info
      setServiceName(service.name || serviceId);
      setServiceImage(service.image || "");
      setServiceCommand(
        Array.isArray(service.command)
          ? service.command.join(" ")
          : service.command || ""
      );
      setServiceEntrypoint(
        Array.isArray(service.entrypoint)
          ? service.entrypoint.join(" ")
          : service.entrypoint || ""
      );
      setServiceWorkingDir(service.working_dir || "");
      setServiceUser(service.user || "");
      setServiceRestart(service.restart || "unless-stopped");

      // Networking
      setServicePorts(
        service.ports?.map((port) =>
          typeof port === "object" && "published" in port
            ? `${port.published}:${port.target}`
            : String(port)
        ) || []
      );
      setServiceExpose(service.expose?.map(String) || []);
      setServiceNetworks(
        Array.isArray(service.networks)
          ? service.networks
          : Object.keys(service.networks || {})
      );
      setServiceHostname(service.hostname || "");

      // Convert extra_hosts to array format
      const extraHosts = Array.isArray(service.extra_hosts)
        ? service.extra_hosts.map((host) => {
            const [hostName, ip] = host.split("=");
            return { host: hostName, ip: ip || "" };
          })
        : Object.entries(service.extra_hosts || {}).map(([host, ip]) => ({
            host,
            ip,
          }));
      setServiceExtraHosts(extraHosts);

      // Environment
      const envPairs = service.environment
        ? Object.entries(service.environment).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        : [];
      setServiceEnvironment(envPairs);
      setServiceEnvFiles(
        Array.isArray(service.env_file)
          ? service.env_file
          : service.env_file
          ? [service.env_file]
          : []
      );

      // Volumes
      const volumeMounts = (service.volumes || []).map((vol) => {
        if (typeof vol === "string") {
          const [source, target, mode] = vol.split(":");
          return {
            type: (source.startsWith("/") ? "bind" : "volume") as
              | "bind"
              | "volume"
              | "tmpfs",
            source: source || "",
            target: target || "",
            readOnly: mode === "ro",
          };
        } else {
          return {
            type: (vol.type || "bind") as "bind" | "volume" | "tmpfs",
            source: vol.source || "",
            target: vol.target || "",
            readOnly: vol.read_only || false,
          };
        }
      });
      setServiceVolumes(volumeMounts);
      setServiceTmpfs(
        Array.isArray(service.tmpfs)
          ? service.tmpfs
          : service.tmpfs
          ? [service.tmpfs]
          : []
      );

      // Dependencies
      const deps = Array.isArray(service.depends_on)
        ? service.depends_on.map((dep) => ({
            service: dep,
            condition: "service_started" as const,
          }))
        : Object.entries(service.depends_on || {}).map(([service, config]) => ({
            service,
            condition: (typeof config === "object"
              ? config.condition
              : "service_started") as any,
          }));
      setServiceDependsOn(deps);

      // Resource limits
      setResourceLimits({
        cpus: service.cpus || "",
        memory: service.mem_limit || "",
        memoryReservation: service.mem_reservation || "",
        memswapLimit: service.memswap_limit || "",
        cpuShares: service.cpu_shares?.toString() || "",
      });

      // Security
      setSecurityConfig({
        privileged: service.privileged || false,
        readOnly: service.read_only || false,
        user_ns_mode: service.user_ns_mode || "",
        pid: service.pid || "",
        ipc: service.ipc || "",
        capAdd: service.cap_add || [],
        capDrop: service.cap_drop || [],
        securityOpt: service.security_opt || [],
        devices: service.devices || [],
      });

      // Health check
      if (service.healthcheck) {
        setHealthCheck({
          test: Array.isArray(service.healthcheck.test)
            ? service.healthcheck.test.join(" ")
            : service.healthcheck.test || "",
          interval: service.healthcheck.interval || "30s",
          timeout: service.healthcheck.timeout || "10s",
          retries: service.healthcheck.retries || 3,
          start_period: service.healthcheck.start_period || "0s",
        });
      }

      // Labels
      const labelPairs = service.labels
        ? Object.entries(service.labels).map(([key, value]) => ({ key, value }))
        : [];
      setServiceLabels(labelPairs);

      // Metadata
      setServiceCategory(service["x-meta"]?.category || "");
      setServiceTags(service["x-meta"]?.tags || []);

      // Logging
      setLoggingConfig({
        driver: service.logging?.driver || "",
        options: service.logging?.options
          ? Object.entries(service.logging.options).map(([key, value]) => ({
              key,
              value,
            }))
          : [],
      });
    } else {
      // Reset for new service
      resetForm();
    }
  }, [serviceId, newStack.services]);

  const resetForm = () => {
    setServiceName("");
    setServiceImage("");
    setServiceCommand("");
    setServiceEntrypoint("");
    setServiceWorkingDir("");
    setServiceUser("");
    setServiceRestart("unless-stopped");
    setServicePorts([]);
    setServiceExpose([]);
    setServiceNetworks([]);
    setServiceHostname("");
    setServiceExtraHosts([]);
    setServiceEnvironment([]);
    setServiceEnvFiles([]);
    setServiceVolumes([]);
    setServiceTmpfs([]);
    setServiceDependsOn([]);
    setResourceLimits({
      cpus: "",
      memory: "",
      memoryReservation: "",
      memswapLimit: "",
      cpuShares: "",
    });
    setSecurityConfig({
      privileged: false,
      readOnly: false,
      user_ns_mode: "",
      pid: "",
      ipc: "",
      capAdd: [],
      capDrop: [],
      securityOpt: [],
      devices: [],
    });
    setHealthCheck({
      test: "",
      interval: "30s",
      timeout: "10s",
      retries: 3,
      start_period: "0s",
    });
    setServiceLabels([]);
    setServiceCategory("");
    setServiceTags([]);
    setLoggingConfig({
      driver: "",
      options: [],
    });
  };

  const handleSave = () => {
    if (!serviceName.trim() || !serviceImage.trim()) return;

    const finalServiceId =
      serviceId || serviceName.toLowerCase().replace(/[^a-z0-9]/g, "_");

    // Build the complete service configuration
    const serviceConfig: ServiceConfig = {
      image: serviceImage,
      restart: serviceRestart,
    };

    // Add optional basic properties
    if (serviceCommand) {
      serviceConfig.command = serviceCommand.includes(" ")
        ? serviceCommand.split(" ")
        : serviceCommand;
    }
    if (serviceEntrypoint) {
      serviceConfig.entrypoint = serviceEntrypoint.includes(" ")
        ? serviceEntrypoint.split(" ")
        : serviceEntrypoint;
    }
    if (serviceWorkingDir) serviceConfig.working_dir = serviceWorkingDir;
    if (serviceUser) serviceConfig.user = serviceUser;
    if (serviceHostname) serviceConfig.hostname = serviceHostname;

    // Add networking
    if (servicePorts.length > 0) {
      serviceConfig.ports = servicePorts.filter((port) => port.trim());
    }
    if (serviceExpose.length > 0) {
      serviceConfig.expose = serviceExpose
        .filter((port) => port.trim())
        .map((port) => parseInt(port) || port);
    }
    if (serviceNetworks.length > 0) {
      serviceConfig.networks = serviceNetworks.filter((net) => net.trim());
    }
    if (serviceExtraHosts.length > 0) {
      serviceConfig.extra_hosts = serviceExtraHosts
        .filter((host) => host.host.trim() && host.ip.trim())
        .map((host) => `${host.host}=${host.ip}`);
    }

    // Add environment
    if (serviceEnvironment.length > 0) {
      serviceConfig.environment = serviceEnvironment.reduce(
        (acc, { key, value }) => {
          if (key.trim()) {
            acc[key.trim()] = value;
          }
          return acc;
        },
        {} as Record<string, string>
      );
    }
    if (serviceEnvFiles.length > 0) {
      serviceConfig.env_file = serviceEnvFiles.filter((file) => file.trim());
    }

    // Add volumes
    if (serviceVolumes.length > 0) {
      serviceConfig.volumes = serviceVolumes
        .filter((vol) => vol.source.trim() && vol.target.trim())
        .map((vol) => {
          const mountStr = `${vol.source}:${vol.target}${
            vol.readOnly ? ":ro" : ""
          }`;
          return mountStr;
        });
    }
    if (serviceTmpfs.length > 0) {
      serviceConfig.tmpfs = serviceTmpfs.filter((tmp) => tmp.trim());
    }

    // Add dependencies
    if (serviceDependsOn.length > 0) {
      const filteredDeps = serviceDependsOn.filter((dep) => dep.service.trim());
      if (filteredDeps.every((dep) => dep.condition === "service_started")) {
        serviceConfig.depends_on = filteredDeps.map((dep) => dep.service);
      } else {
        serviceConfig.depends_on = filteredDeps.reduce((acc, dep) => {
          acc[dep.service] = { condition: dep.condition };
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Add resource limits
    if (resourceLimits.cpus) serviceConfig.cpus = resourceLimits.cpus;
    if (resourceLimits.memory) serviceConfig.mem_limit = resourceLimits.memory;
    if (resourceLimits.memoryReservation)
      serviceConfig.mem_reservation = resourceLimits.memoryReservation;
    if (resourceLimits.memswapLimit)
      serviceConfig.memswap_limit = resourceLimits.memswapLimit;
    if (resourceLimits.cpuShares)
      serviceConfig.cpu_shares = parseInt(resourceLimits.cpuShares);

    // Add health check
    if (healthCheck.test) {
      serviceConfig.healthcheck = {
        test: healthCheck.test,
        interval: healthCheck.interval,
        timeout: healthCheck.timeout,
        retries: healthCheck.retries,
        start_period: healthCheck.start_period,
      };
    }

    // Add security configuration
    if (securityConfig.privileged) serviceConfig.privileged = true;
    if (securityConfig.readOnly) serviceConfig.read_only = true;
    if (securityConfig.user_ns_mode)
      serviceConfig.user_ns_mode = securityConfig.user_ns_mode;
    if (securityConfig.pid) serviceConfig.pid = securityConfig.pid;
    if (securityConfig.ipc) serviceConfig.ipc = securityConfig.ipc;
    if (securityConfig.capAdd.length > 0)
      serviceConfig.cap_add = securityConfig.capAdd.filter((cap) => cap.trim());
    if (securityConfig.capDrop.length > 0)
      serviceConfig.cap_drop = securityConfig.capDrop.filter((cap) =>
        cap.trim()
      );
    if (securityConfig.securityOpt.length > 0)
      serviceConfig.security_opt = securityConfig.securityOpt.filter((opt) =>
        opt.trim()
      );
    if (securityConfig.devices.length > 0)
      serviceConfig.devices = securityConfig.devices.filter((dev) =>
        dev.trim()
      );

    // Add labels
    if (serviceLabels.length > 0) {
      serviceConfig.labels = serviceLabels.reduce((acc, { key, value }) => {
        if (key.trim()) {
          acc[key.trim()] = value;
        }
        return acc;
      }, {} as Record<string, string>);
    }

    // Add logging
    if (loggingConfig.driver || loggingConfig.options.length > 0) {
      serviceConfig.logging = {};
      if (loggingConfig.driver)
        serviceConfig.logging.driver = loggingConfig.driver;
      if (loggingConfig.options.length > 0) {
        serviceConfig.logging.options = loggingConfig.options.reduce(
          (acc, { key, value }) => {
            if (key.trim()) {
              acc[key.trim()] = value;
            }
            return acc;
          },
          {} as Record<string, string>
        );
      }
    }

    // Add metadata
    serviceConfig["x-meta"] = {
      category: serviceCategory,
      tags: serviceTags.filter((tag) => tag.trim()),
    };

    setNewStack((stack) => {
      if (!stack.services) stack.services = {};
      stack.services[finalServiceId] = serviceConfig;
    });

    onClose?.();
  };

  // Helper functions for managing arrays
  const addPort = () => setServicePorts([...servicePorts, ""]);
  const updatePort = (index: number, value: string) => {
    const newPorts = [...servicePorts];
    newPorts[index] = value;
    setServicePorts(newPorts);
  };
  const removePort = (index: number) =>
    setServicePorts(servicePorts.filter((_, i) => i !== index));

  const addExpose = () => setServiceExpose([...serviceExpose, ""]);
  const updateExpose = (index: number, value: string) => {
    const newExpose = [...serviceExpose];
    newExpose[index] = value;
    setServiceExpose(newExpose);
  };
  const removeExpose = (index: number) =>
    setServiceExpose(serviceExpose.filter((_, i) => i !== index));

  const addNetwork = () => setServiceNetworks([...serviceNetworks, ""]);
  const updateNetwork = (index: number, value: string) => {
    const newNetworks = [...serviceNetworks];
    newNetworks[index] = value;
    setServiceNetworks(newNetworks);
  };
  const removeNetwork = (index: number) =>
    setServiceNetworks(serviceNetworks.filter((_, i) => i !== index));

  const addExtraHost = () =>
    setServiceExtraHosts([...serviceExtraHosts, { host: "", ip: "" }]);
  const updateExtraHost = (
    index: number,
    field: "host" | "ip",
    value: string
  ) => {
    const newHosts = [...serviceExtraHosts];
    newHosts[index][field] = value;
    setServiceExtraHosts(newHosts);
  };
  const removeExtraHost = (index: number) =>
    setServiceExtraHosts(serviceExtraHosts.filter((_, i) => i !== index));

  const addEnvironmentVar = () =>
    setServiceEnvironment([...serviceEnvironment, { key: "", value: "" }]);
  const updateEnvironmentVar = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newEnv = [...serviceEnvironment];
    newEnv[index][field] = value;
    setServiceEnvironment(newEnv);
  };
  const removeEnvironmentVar = (index: number) =>
    setServiceEnvironment(serviceEnvironment.filter((_, i) => i !== index));

  const addEnvFile = () => setServiceEnvFiles([...serviceEnvFiles, ""]);
  const updateEnvFile = (index: number, value: string) => {
    const newFiles = [...serviceEnvFiles];
    newFiles[index] = value;
    setServiceEnvFiles(newFiles);
  };
  const removeEnvFile = (index: number) =>
    setServiceEnvFiles(serviceEnvFiles.filter((_, i) => i !== index));

  const addVolume = () =>
    setServiceVolumes([
      ...serviceVolumes,
      { type: "bind", source: "", target: "", readOnly: false },
    ]);
  const updateVolume = (
    index: number,
    field: keyof (typeof serviceVolumes)[0],
    value: any
  ) => {
    const newVolumes = [...serviceVolumes];
    newVolumes[index] = { ...newVolumes[index], [field]: value };
    setServiceVolumes(newVolumes);
  };
  const removeVolume = (index: number) =>
    setServiceVolumes(serviceVolumes.filter((_, i) => i !== index));

  const addTmpfs = () => setServiceTmpfs([...serviceTmpfs, ""]);
  const updateTmpfs = (index: number, value: string) => {
    const newTmpfs = [...serviceTmpfs];
    newTmpfs[index] = value;
    setServiceTmpfs(newTmpfs);
  };
  const removeTmpfs = (index: number) =>
    setServiceTmpfs(serviceTmpfs.filter((_, i) => i !== index));

  const addDependency = () =>
    setServiceDependsOn([
      ...serviceDependsOn,
      { service: "", condition: "service_started" },
    ]);
  const updateDependency = (
    index: number,
    field: "service" | "condition",
    value: string
  ) => {
    const newDeps = [...serviceDependsOn];
    newDeps[index][field] = value as any;
    setServiceDependsOn(newDeps);
  };
  const removeDependency = (index: number) =>
    setServiceDependsOn(serviceDependsOn.filter((_, i) => i !== index));

  const addCapability = (type: "add" | "drop") => {
    if (type === "add") {
      setSecurityConfig((prev) => ({ ...prev, capAdd: [...prev.capAdd, ""] }));
    } else {
      setSecurityConfig((prev) => ({
        ...prev,
        capDrop: [...prev.capDrop, ""],
      }));
    }
  };
  const updateCapability = (
    type: "add" | "drop",
    index: number,
    value: string
  ) => {
    setSecurityConfig((prev) => {
      const key = type === "add" ? "capAdd" : "capDrop";
      const newCaps = [...prev[key]];
      newCaps[index] = value;
      return { ...prev, [key]: newCaps };
    });
  };
  const removeCapability = (type: "add" | "drop", index: number) => {
    setSecurityConfig((prev) => {
      const key = type === "add" ? "capAdd" : "capDrop";
      return { ...prev, [key]: prev[key].filter((_, i) => i !== index) };
    });
  };

  const addSecurityOpt = () =>
    setSecurityConfig((prev) => ({
      ...prev,
      securityOpt: [...prev.securityOpt, ""],
    }));
  const updateSecurityOpt = (index: number, value: string) => {
    setSecurityConfig((prev) => {
      const newOpts = [...prev.securityOpt];
      newOpts[index] = value;
      return { ...prev, securityOpt: newOpts };
    });
  };
  const removeSecurityOpt = (index: number) => {
    setSecurityConfig((prev) => ({
      ...prev,
      securityOpt: prev.securityOpt.filter((_, i) => i !== index),
    }));
  };

  const addDevice = () =>
    setSecurityConfig((prev) => ({ ...prev, devices: [...prev.devices, ""] }));
  const updateDevice = (index: number, value: string) => {
    setSecurityConfig((prev) => {
      const newDevices = [...prev.devices];
      newDevices[index] = value;
      return { ...prev, devices: newDevices };
    });
  };
  const removeDevice = (index: number) => {
    setSecurityConfig((prev) => ({
      ...prev,
      devices: prev.devices.filter((_, i) => i !== index),
    }));
  };

  const addLabel = () =>
    setServiceLabels([...serviceLabels, { key: "", value: "" }]);
  const updateLabel = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newLabels = [...serviceLabels];
    newLabels[index][field] = value;
    setServiceLabels(newLabels);
  };
  const removeLabel = (index: number) =>
    setServiceLabels(serviceLabels.filter((_, i) => i !== index));

  const addTag = () => setServiceTags([...serviceTags, ""]);
  const updateTag = (index: number, value: string) => {
    const newTags = [...serviceTags];
    newTags[index] = value;
    setServiceTags(newTags);
  };
  const removeTag = (index: number) =>
    setServiceTags(serviceTags.filter((_, i) => i !== index));

  const addLoggingOption = () =>
    setLoggingConfig((prev) => ({
      ...prev,
      options: [...prev.options, { key: "", value: "" }],
    }));
  const updateLoggingOption = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    setLoggingConfig((prev) => {
      const newOptions = [...prev.options];
      newOptions[index][field] = value;
      return { ...prev, options: newOptions };
    });
  };
  const removeLoggingOption = (index: number) => {
    setLoggingConfig((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  // Options for dropdowns
  const restartOptions = [
    { value: "no", label: "No restart" },
    { value: "always", label: "Always restart" },
    { value: "unless-stopped", label: "Unless stopped" },
    { value: "on-failure", label: "On failure" },
  ];

  const serviceCategoryOptions = [
    { value: "", label: "Select a category..." },
    { value: "proxy", label: "Proxy" },
    { value: "media-player", label: "Media Player" },
    { value: "devops", label: "DevOps" },
    { value: "database", label: "Database" },
    { value: "web-server", label: "Web Server" },
    { value: "monitoring", label: "Monitoring" },
    { value: "security", label: "Security" },
    { value: "storage", label: "Storage" },
    { value: "communication", label: "Communication" },
    { value: "productivity", label: "Productivity" },
    { value: "development", label: "Development" },
  ];

  const volumeTypeOptions = [
    { value: "bind", label: "Bind Mount" },
    { value: "volume", label: "Named Volume" },
    { value: "tmpfs", label: "Temporary Filesystem" },
  ];

  const dependencyConditionOptions = [
    { value: "service_started", label: "Service Started" },
    { value: "service_healthy", label: "Service Healthy" },
    {
      value: "service_completed_successfully",
      label: "Service Completed Successfully",
    },
  ];

  const loggingDriverOptions = [
    { value: "", label: "Default" },
    { value: "json-file", label: "JSON File" },
    { value: "syslog", label: "Syslog" },
    { value: "journald", label: "Journald" },
    { value: "gelf", label: "GELF" },
    { value: "fluentd", label: "Fluentd" },
    { value: "awslogs", label: "AWS CloudWatch Logs" },
    { value: "splunk", label: "Splunk" },
    { value: "etwlogs", label: "ETW Logs (Windows)" },
    { value: "gcplogs", label: "Google Cloud Logging" },
    { value: "logentries", label: "Logentries" },
  ];

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>
          {isEditing ? `Edit Service: ${serviceName}` : "Add New Service"}
        </Drawer.Title>
      </Drawer.Header>

      <Drawer.Body gap="6" overflowY="auto">
        <Tabs.Root defaultValue="basic" variant="enclosed" size="sm">
          <Tabs.List>
            <Tabs.Trigger value="basic">
              Basic
              {(!serviceName || !serviceImage) && (
                <Badge colorPalette="red" size="xs" ml="1">
                  !
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="networking">
              Networking
              {servicePorts.length > 0 && (
                <Badge colorPalette="blue" size="xs" ml="1">
                  {servicePorts.length}
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="storage">
              Storage
              {serviceVolumes.length > 0 && (
                <Badge colorPalette="green" size="xs" ml="1">
                  {serviceVolumes.length}
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="resources">
              Resources
              {(resourceLimits.cpus || resourceLimits.memory) && (
                <Badge colorPalette="orange" size="xs" ml="1">
                  ✓
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="security">
              Security
              {(securityConfig.privileged ||
                securityConfig.capAdd.length > 0) && (
                <Badge colorPalette="red" size="xs" ml="1">
                  ⚠
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="advanced">
              Advanced
              {(healthCheck.test || loggingConfig.driver) && (
                <Badge colorPalette="purple" size="xs" ml="1">
                  ✓
                </Badge>
              )}
            </Tabs.Trigger>
          </Tabs.List>

          {/* Basic Configuration Tab */}
          <Tabs.Content value="basic">
            <Stack gap="6">
              <PropertySection title="Service Information">
                <TextField
                  label="Service Name"
                  defaultValue={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="my-service"
                />
                <TextField
                  label="Docker Image"
                  defaultValue={serviceImage}
                  onChange={(e) => setServiceImage(e.target.value)}
                  placeholder="nginx:latest"
                />
                <SelectField
                  label="Restart Policy"
                  options={restartOptions}
                  defaultValue={serviceRestart}
                  onChange={(e) => setServiceRestart(e.target.value as any)}
                />
              </PropertySection>

              <PropertySection title="Runtime Configuration">
                <TextField
                  label="Command"
                  defaultValue={serviceCommand}
                  onChange={(e) => setServiceCommand(e.target.value)}
                  placeholder="npm start"
                />
                <TextField
                  label="Entrypoint"
                  defaultValue={serviceEntrypoint}
                  onChange={(e) => setServiceEntrypoint(e.target.value)}
                  placeholder="/docker-entrypoint.sh"
                />
                <TextField
                  label="Working Directory"
                  defaultValue={serviceWorkingDir}
                  onChange={(e) => setServiceWorkingDir(e.target.value)}
                  placeholder="/app"
                />
                <TextField
                  label="User"
                  defaultValue={serviceUser}
                  onChange={(e) => setServiceUser(e.target.value)}
                  placeholder="1000:1000"
                />
              </PropertySection>

              <PropertySection
                title="Environment Variables"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addEnvironmentVar}
                  >
                    <PiPlus /> Add Variable
                  </Button>
                }
              >
                <Stack gap="2">
                  {serviceEnvironment.map((env, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={env.key}
                        placeholder="VARIABLE_NAME"
                        onChange={(e) =>
                          updateEnvironmentVar(index, "key", e.target.value)
                        }
                      />
                      <Text fontSize="sm" color="fg.muted">
                        =
                      </Text>
                      <Input
                        size="sm"
                        flex="1"
                        value={env.value}
                        placeholder="value"
                        onChange={(e) =>
                          updateEnvironmentVar(index, "value", e.target.value)
                        }
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeEnvironmentVar(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {serviceEnvironment.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No environment variables configured
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection
                title="Environment Files"
                action={
                  <Button size="sm" variant="outline" onClick={addEnvFile}>
                    <PiPlus /> Add File
                  </Button>
                }
              >
                <Stack gap="2">
                  {serviceEnvFiles.map((file, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={file}
                        placeholder=".env"
                        onChange={(e) => updateEnvFile(index, e.target.value)}
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeEnvFile(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {serviceEnvFiles.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No environment files configured
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection
                title="Dependencies"
                action={
                  <Button size="sm" variant="outline" onClick={addDependency}>
                    <PiPlus /> Add Dependency
                  </Button>
                }
              >
                <Stack gap="2">
                  {serviceDependsOn.map((dep, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={dep.service}
                        placeholder="service-name"
                        onChange={(e) =>
                          updateDependency(index, "service", e.target.value)
                        }
                      />
                      <SelectField
                        label=""
                        options={dependencyConditionOptions}
                        defaultValue={dep.condition}
                        onChange={(e) =>
                          updateDependency(index, "condition", e.target.value)
                        }
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeDependency(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {serviceDependsOn.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No dependencies configured
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection title="Metadata">
                <SelectField
                  label="Category"
                  options={serviceCategoryOptions}
                  defaultValue={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                />

                <Stack gap="2">
                  <HStack justify="space-between">
                    <Text fontWeight="semibold" textStyle="sm">
                      Tags
                    </Text>
                    <Button size="sm" variant="outline" onClick={addTag}>
                      <PiPlus /> Add Tag
                    </Button>
                  </HStack>

                  {serviceTags.map((tag, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={tag}
                        placeholder="web, database, monitoring..."
                        onChange={(e) => updateTag(index, e.target.value)}
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeTag(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {serviceTags.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No tags configured
                    </Text>
                  )}
                </Stack>
              </PropertySection>
            </Stack>
          </Tabs.Content>

          {/* Networking Tab */}
          <Tabs.Content value="networking">
            <Stack gap="6">
              <PropertySection
                title="Port Mappings"
                action={
                  <Button size="sm" variant="outline" onClick={addPort}>
                    <PiPlus /> Add Port
                  </Button>
                }
              >
                <Stack gap="2">
                  {servicePorts.map((port, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={port}
                        placeholder="8080:80 or 80"
                        onChange={(e) => updatePort(index, e.target.value)}
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removePort(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {servicePorts.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No ports mapped
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection
                title="Exposed Ports (Internal)"
                action={
                  <Button size="sm" variant="outline" onClick={addExpose}>
                    <PiPlus /> Add Port
                  </Button>
                }
              >
                <Stack gap="2">
                  {serviceExpose.map((port, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={port}
                        placeholder="80"
                        onChange={(e) => updateExpose(index, e.target.value)}
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeExpose(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {serviceExpose.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No internal ports exposed
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection
                title="Networks"
                action={
                  <Button size="sm" variant="outline" onClick={addNetwork}>
                    <PiPlus /> Add Network
                  </Button>
                }
              >
                <Stack gap="2">
                  {serviceNetworks.map((network, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={network}
                        placeholder="network-name"
                        onChange={(e) => updateNetwork(index, e.target.value)}
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeNetwork(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {serviceNetworks.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      Using default network
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection title="Hostname & DNS">
                <TextField
                  label="Hostname"
                  defaultValue={serviceHostname}
                  onChange={(e) => setServiceHostname(e.target.value)}
                  placeholder="my-service"
                />
              </PropertySection>

              <PropertySection
                title="Extra Hosts"
                action={
                  <Button size="sm" variant="outline" onClick={addExtraHost}>
                    <PiPlus /> Add Host
                  </Button>
                }
              >
                <Stack gap="2">
                  {serviceExtraHosts.map((host, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={host.host}
                        placeholder="hostname"
                        onChange={(e) =>
                          updateExtraHost(index, "host", e.target.value)
                        }
                      />
                      <Text fontSize="sm" color="fg.muted">
                        =
                      </Text>
                      <Input
                        size="sm"
                        flex="1"
                        value={host.ip}
                        placeholder="192.168.1.1"
                        onChange={(e) =>
                          updateExtraHost(index, "ip", e.target.value)
                        }
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeExtraHost(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {serviceExtraHosts.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No extra hosts configured
                    </Text>
                  )}
                </Stack>
              </PropertySection>
            </Stack>
          </Tabs.Content>

          {/* Storage Tab */}
          <Tabs.Content value="storage">
            <Stack gap="6">
              <PropertySection
                title="Volume Mounts"
                action={
                  <Button size="sm" variant="outline" onClick={addVolume}>
                    <PiPlus /> Add Volume
                  </Button>
                }
              >
                <Stack gap="4">
                  {serviceVolumes.map((volume, index) => (
                    <Stack
                      key={index}
                      gap="2"
                      p="3"
                      borderWidth="1px"
                      borderRadius="md"
                      borderColor="border.muted"
                    >
                      <HStack gap="2">
                        <SelectField
                          label=""
                          options={volumeTypeOptions}
                          defaultValue={volume.type}
                          onChange={(e) =>
                            updateVolume(index, "type", e.target.value as any)
                          }
                        />
                        <IconButton
                          size="sm"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => removeVolume(index)}
                        >
                          <PiX />
                        </IconButton>
                      </HStack>
                      <HStack gap="2">
                        <Input
                          size="sm"
                          flex="1"
                          value={volume.source}
                          placeholder={
                            volume.type === "bind"
                              ? "/host/path"
                              : "volume-name"
                          }
                          onChange={(e) =>
                            updateVolume(index, "source", e.target.value)
                          }
                        />
                        <Text fontSize="sm" color="fg.muted">
                          :
                        </Text>
                        <Input
                          size="sm"
                          flex="1"
                          value={volume.target}
                          placeholder="/container/path"
                          onChange={(e) =>
                            updateVolume(index, "target", e.target.value)
                          }
                        />
                      </HStack>
                      <Checkbox.Root
                        checked={volume.readOnly}
                        onCheckedChange={(e) =>
                          updateVolume(index, "readOnly", !!e.checked)
                        }
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>Read-only</Checkbox.Label>
                      </Checkbox.Root>
                    </Stack>
                  ))}

                  {serviceVolumes.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No volumes mounted
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection
                title="Temporary Filesystems"
                action={
                  <Button size="sm" variant="outline" onClick={addTmpfs}>
                    <PiPlus /> Add Tmpfs
                  </Button>
                }
              >
                <Stack gap="2">
                  {serviceTmpfs.map((tmpfs, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={tmpfs}
                        placeholder="/tmp"
                        onChange={(e) => updateTmpfs(index, e.target.value)}
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeTmpfs(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {serviceTmpfs.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No temporary filesystems configured
                    </Text>
                  )}
                </Stack>
              </PropertySection>
            </Stack>
          </Tabs.Content>

          {/* Resources Tab */}
          <Tabs.Content value="resources">
            <Stack gap="6">
              <PropertySection title="CPU Limits">
                <NumberField
                  label="CPU Limit"
                  defaultValue={resourceLimits.cpus}
                  onChange={(value) =>
                    setResourceLimits((prev) => ({ ...prev, cpus: value }))
                  }
                  step={0.1}
                  min={0}
                />
                <NumberField
                  label="CPU Shares"
                  defaultValue={resourceLimits.cpuShares}
                  onChange={(value) =>
                    setResourceLimits((prev) => ({ ...prev, cpuShares: value }))
                  }
                  min={0}
                />
              </PropertySection>

              <PropertySection title="Memory Limits">
                <TextField
                  label="Memory Limit"
                  defaultValue={resourceLimits.memory}
                  onChange={(e) =>
                    setResourceLimits((prev) => ({
                      ...prev,
                      memory: e.target.value,
                    }))
                  }
                  placeholder="512m"
                />
                <TextField
                  label="Memory Reservation"
                  defaultValue={resourceLimits.memoryReservation}
                  onChange={(e) =>
                    setResourceLimits((prev) => ({
                      ...prev,
                      memoryReservation: e.target.value,
                    }))
                  }
                  placeholder="256m"
                />
                <TextField
                  label="Swap Limit"
                  defaultValue={resourceLimits.memswapLimit}
                  onChange={(e) =>
                    setResourceLimits((prev) => ({
                      ...prev,
                      memswapLimit: e.target.value,
                    }))
                  }
                  placeholder="1g"
                />
              </PropertySection>
            </Stack>
          </Tabs.Content>

          {/* Security Tab */}
          <Tabs.Content value="security">
            <Stack gap="6">
              <PropertySection title="Security Options">
                <HStack gap="4">
                  <Checkbox.Root
                    checked={securityConfig.privileged}
                    onCheckedChange={(e) =>
                      setSecurityConfig((prev) => ({
                        ...prev,
                        privileged: !!e.checked,
                      }))
                    }
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>Privileged Mode</Checkbox.Label>
                  </Checkbox.Root>
                  <Checkbox.Root
                    checked={securityConfig.readOnly}
                    onCheckedChange={(e) =>
                      setSecurityConfig((prev) => ({
                        ...prev,
                        readOnly: !!e.checked,
                      }))
                    }
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>Read-only Root Filesystem</Checkbox.Label>
                  </Checkbox.Root>
                </HStack>

                <TextField
                  label="User Namespace Mode"
                  defaultValue={securityConfig.user_ns_mode}
                  onChange={(e) =>
                    setSecurityConfig((prev) => ({
                      ...prev,
                      user_ns_mode: e.target.value,
                    }))
                  }
                  placeholder="host"
                />
                <TextField
                  label="PID Mode"
                  defaultValue={securityConfig.pid}
                  onChange={(e) =>
                    setSecurityConfig((prev) => ({
                      ...prev,
                      pid: e.target.value,
                    }))
                  }
                  placeholder="host"
                />
                <TextField
                  label="IPC Mode"
                  defaultValue={securityConfig.ipc}
                  onChange={(e) =>
                    setSecurityConfig((prev) => ({
                      ...prev,
                      ipc: e.target.value,
                    }))
                  }
                  placeholder="host"
                />
              </PropertySection>

              <PropertySection
                title="Capabilities to Add"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addCapability("add")}
                  >
                    <PiPlus /> Add Capability
                  </Button>
                }
              >
                <Stack gap="2">
                  {securityConfig.capAdd.map((cap, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={cap}
                        placeholder="NET_ADMIN"
                        onChange={(e) =>
                          updateCapability("add", index, e.target.value)
                        }
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeCapability("add", index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {securityConfig.capAdd.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No capabilities added
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection
                title="Capabilities to Drop"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addCapability("drop")}
                  >
                    <PiPlus /> Drop Capability
                  </Button>
                }
              >
                <Stack gap="2">
                  {securityConfig.capDrop.map((cap, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={cap}
                        placeholder="ALL"
                        onChange={(e) =>
                          updateCapability("drop", index, e.target.value)
                        }
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeCapability("drop", index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {securityConfig.capDrop.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No capabilities dropped
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection
                title="Security Options"
                action={
                  <Button size="sm" variant="outline" onClick={addSecurityOpt}>
                    <PiPlus /> Add Option
                  </Button>
                }
              >
                <Stack gap="2">
                  {securityConfig.securityOpt.map((opt, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={opt}
                        placeholder="label=disable"
                        onChange={(e) =>
                          updateSecurityOpt(index, e.target.value)
                        }
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeSecurityOpt(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {securityConfig.securityOpt.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No security options configured
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection
                title="Device Mappings"
                action={
                  <Button size="sm" variant="outline" onClick={addDevice}>
                    <PiPlus /> Add Device
                  </Button>
                }
              >
                <Stack gap="2">
                  {securityConfig.devices.map((device, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={device}
                        placeholder="/dev/sda:/dev/xvda:rwm"
                        onChange={(e) => updateDevice(index, e.target.value)}
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeDevice(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {securityConfig.devices.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No device mappings configured
                    </Text>
                  )}
                </Stack>
              </PropertySection>
            </Stack>
          </Tabs.Content>

          {/* Advanced Tab */}
          <Tabs.Content value="advanced">
            <Stack gap="6">
              <PropertySection title="Health Check">
                <TextField
                  label="Health Check Command"
                  defaultValue={healthCheck.test}
                  onChange={(e) =>
                    setHealthCheck((prev) => ({
                      ...prev,
                      test: e.target.value,
                    }))
                  }
                  placeholder="curl -f http://localhost:8080/health || exit 1"
                />
                <HStack gap="4">
                  <TextField
                    label="Interval"
                    defaultValue={healthCheck.interval}
                    onChange={(e) =>
                      setHealthCheck((prev) => ({
                        ...prev,
                        interval: e.target.value,
                      }))
                    }
                    placeholder="30s"
                  />
                  <TextField
                    label="Timeout"
                    defaultValue={healthCheck.timeout}
                    onChange={(e) =>
                      setHealthCheck((prev) => ({
                        ...prev,
                        timeout: e.target.value,
                      }))
                    }
                    placeholder="10s"
                  />
                </HStack>
                <HStack gap="4">
                  <NumberField
                    label="Retries"
                    defaultValue={healthCheck.retries.toString()}
                    onChange={(value) =>
                      setHealthCheck((prev) => ({
                        ...prev,
                        retries: parseInt(value) || 3,
                      }))
                    }
                    min={0}
                  />
                  <TextField
                    label="Start Period"
                    defaultValue={healthCheck.start_period}
                    onChange={(e) =>
                      setHealthCheck((prev) => ({
                        ...prev,
                        start_period: e.target.value,
                      }))
                    }
                    placeholder="0s"
                  />
                </HStack>
              </PropertySection>

              <PropertySection title="Logging Configuration">
                <SelectField
                  label="Logging Driver"
                  options={loggingDriverOptions}
                  defaultValue={loggingConfig.driver}
                  onChange={(e) =>
                    setLoggingConfig((prev) => ({
                      ...prev,
                      driver: e.target.value,
                    }))
                  }
                />

                <Stack gap="2">
                  <HStack justify="space-between">
                    <Text fontWeight="semibold" textStyle="sm">
                      Logging Options
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addLoggingOption}
                    >
                      <PiPlus /> Add Option
                    </Button>
                  </HStack>

                  {loggingConfig.options.map((option, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={option.key}
                        placeholder="max-size"
                        onChange={(e) =>
                          updateLoggingOption(index, "key", e.target.value)
                        }
                      />
                      <Text fontSize="sm" color="fg.muted">
                        =
                      </Text>
                      <Input
                        size="sm"
                        flex="1"
                        value={option.value}
                        placeholder="10m"
                        onChange={(e) =>
                          updateLoggingOption(index, "value", e.target.value)
                        }
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeLoggingOption(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {loggingConfig.options.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No logging options configured
                    </Text>
                  )}
                </Stack>
              </PropertySection>

              <PropertySection
                title="Labels"
                action={
                  <Button size="sm" variant="outline" onClick={addLabel}>
                    <PiPlus /> Add Label
                  </Button>
                }
              >
                <Stack gap="2">
                  {serviceLabels.map((label, index) => (
                    <HStack key={index} gap="2">
                      <Input
                        size="sm"
                        flex="1"
                        value={label.key}
                        placeholder="traefik.enable"
                        onChange={(e) =>
                          updateLabel(index, "key", e.target.value)
                        }
                      />
                      <Text fontSize="sm" color="fg.muted">
                        =
                      </Text>
                      <Input
                        size="sm"
                        flex="1"
                        value={label.value}
                        placeholder="true"
                        onChange={(e) =>
                          updateLabel(index, "value", e.target.value)
                        }
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => removeLabel(index)}
                      >
                        <PiX />
                      </IconButton>
                    </HStack>
                  ))}

                  {serviceLabels.length === 0 && (
                    <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                      No labels configured
                    </Text>
                  )}
                </Stack>
              </PropertySection>
            </Stack>
          </Tabs.Content>
        </Tabs.Root>
      </Drawer.Body>

      <Drawer.Footer gap="3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          colorPalette="brand"
          disabled={!serviceName.trim() || !serviceImage.trim()}
          onClick={handleSave}
        >
          {isEditing ? "Update Service" : "Add Service"}
        </Button>
      </Drawer.Footer>

      <Drawer.CloseTrigger asChild>
        <CloseButton size="sm" />
      </Drawer.CloseTrigger>
    </>
  );
};
