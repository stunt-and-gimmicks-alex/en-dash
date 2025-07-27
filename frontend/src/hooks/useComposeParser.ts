// Updated hook without js-yaml dependency
// frontend/src/hooks/useComposeParser.ts
import { useMemo } from "react";
import {
  parseCompose,
  type ParsedCompose,
  type ParsedService,
} from "@/utils/composeParser";
import yaml from "js-yaml";

export type { ParsedService, ParsedCompose };

export const useComposeParser = (composeContent: string | null) => {
  const parsed = useMemo((): ParsedCompose | null => {
    if (!composeContent) return null;
    return parseCompose(composeContent);
  }, [composeContent]);

  // Helper functions
  const getServiceByName = (serviceName: string) => {
    return parsed?.services.find((s) => s.name === serviceName);
  };

  const getServiceDependencies = (serviceName: string) => {
    const service = getServiceByName(serviceName);
    return service?.depends_on || [];
  };

  const getServiceDependents = (serviceName: string) => {
    if (!parsed) return [];

    return parsed.services
      .filter((service) => service.depends_on.includes(serviceName))
      .map((service) => service.name);
  };

  const getAllPorts = () => {
    if (!parsed) return [];

    return parsed.services.flatMap((service) =>
      service.ports.map((port) => ({
        service: service.name,
        port,
        image: service.image,
      }))
    );
  };

  const getAllVolumes = () => {
    if (!parsed) return [];

    return parsed.services.flatMap((service) =>
      service.volumes.map((volume) => ({
        service: service.name,
        volume,
        image: service.image,
      }))
    );
  };

  const getImageList = () => {
    if (!parsed) return [];

    return [...new Set(parsed.services.map((s) => s.image).filter(Boolean))];
  };

  const getNetworkList = () => {
    if (!parsed) return [];

    const serviceNetworks = parsed.services.flatMap((s) => s.networks);
    const definedNetworks = Object.keys(parsed.networks);

    return [...new Set([...serviceNetworks, ...definedNetworks])];
  };

  const formattedYaml = useMemo(() => {
    if (!composeContent) return "";

    try {
      // Parse then dump with proper formatting
      const parsed = yaml.load(composeContent);
      return yaml.dump(parsed, {
        indent: 2,
        lineWidth: -1, // Don't wrap lines
        noRefs: true, // Don't use references
        quotingType: '"', // Use double quotes
        forceQuotes: false, // Only quote when necessary
      });
    } catch (error) {
      // If parsing fails, return original
      return composeContent;
    }
  }, [composeContent]);

  return {
    parsed,
    isValid: parsed !== null,

    // Helper functions
    getServiceByName,
    getServiceDependencies,
    getServiceDependents,
    getAllPorts,
    getAllVolumes,
    getImageList,
    getNetworkList,

    // Easy access
    services: parsed?.services || [],
    networks: parsed?.networks || {},
    volumes: parsed?.volumes || {},
    version: parsed?.version,
    formattedYaml,
  };
};
