// frontend/src/hooks/useDockerLibrary.ts
// Custom hook for fetching Docker Library services from the backend API

import { useState, useEffect } from "react";

// Base URL for the API (adjust based on your setup)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

// Types for the API response
interface DockerService {
  id: string;
  service_name: string;
  suggested_roles: string[];
  image: string;
  description: string;
  category: string;
  tags: string[];
  default_ports: string[];
  environment_vars: Array<{
    key: string;
    description: string;
    required: boolean;
  }>;
  github_url?: string;
  docker_hub_url?: string;
  updated_at: string;
  popularity_score: number;
}

interface DockerLibraryResponse {
  success: boolean;
  data: DockerService[];
  total_services: number;
  source: "surrealdb" | "fallback";
  timestamp: string;
  note?: string;
}

interface UseDockerLibraryReturn {
  services: DockerService[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  source: "surrealdb" | "fallback" | null;
}

// Custom hook to fetch Docker Library services
export const useDockerLibrary = (): UseDockerLibraryReturn => {
  const [services, setServices] = useState<DockerService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"surrealdb" | "fallback" | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Fetching Docker Library from API...");

      const response = await fetch(`${API_BASE_URL}/api/docker/library`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: DockerLibraryResponse = await response.json();

      console.log("✅ Docker Library fetched:", {
        total: data.total_services,
        source: data.source,
        services: data.data.length,
      });

      setServices(data.data);
      setSource(data.source);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching Docker Library:", err);

      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch Docker Library";
      setError(errorMessage);

      // Fallback to empty array on error
      setServices([]);
      setSource(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchServices();
  }, []);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
    source,
  };
};

// Helper hook for adding new services to the library
export const useCreateDockerLibraryService = () => {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createService = async (serviceData: Partial<DockerService>) => {
    try {
      setCreating(true);
      setError(null);

      console.log(
        "🔄 Adding service to Docker Library:",
        serviceData.service_name
      );

      const response = await fetch(`${API_BASE_URL}/api/docker/library`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();

      console.log("✅ Service added to Docker Library:", result);

      return result;
    } catch (err) {
      console.error("❌ Error adding service to Docker Library:", err);

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to add service to Docker Library";
      setError(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  };

  return {
    createService,
    creating,
    error,
  };
};

// Export the types for use in other components
export type { DockerService, DockerLibraryResponse };
