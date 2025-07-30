// src/services/api/apiContainerService.ts
import { BaseApiService } from "./baseApiService";

export interface ApiContainer {
  id: string;
  short_id: string;
  name: string;
  status: string;
  state: string;
  image: string;
  image_id: string;
  created: string;
  started_at?: string;
  finished_at?: string;
  ports: string[];
  labels: Record<string, string>;
  environment?: string[];
  mounts?: any[];
  networks?: string[];
  restart_policy?: string;
  compose_project?: string;
  compose_service?: string;
}

interface EnvVar {
  key: string;
  value: string;
}

interface Mount {
  source: string;
  destination: string;
  type: string;
  mode: string;
}

export interface StackContainer {
  label: string;
  description?: string;
  id: string;
  full_id: string;
  status: string;
  state: string;
  image: string;
  image_id: string;
  created_at: string;
  started_at: string;
  finished_at?: string;
  version?: string;
  stack?: {
    name?: string;
    service?: string;
    configPath?: string;
    workingPath?: string;
  };
  config: {
    ports: string[];
    config_hash?: string;
    container_number?: string;
    dependencies?: string[];
    oneoff?: boolean;
    service?: string;
    environment?: EnvVar[];
    mounts?: Mount[];
    networks?: string[];
    restart_policy?: string;
  };
  container_image: {
    created: string;
    license?: string;
    revision?: string;
    source?: string;
    title?: string;
    url?: string;
    version?: string;
  };
}

export class ApiContainerService extends BaseApiService {
  // =============================================================================
  // CONTAINER MANAGEMENT
  // =============================================================================

  async getContainers(): Promise<ApiContainer[]> {
    return this.fetchApi("/containers");
  }

  async getContainer(containerId: string): Promise<ApiContainer> {
    return this.fetchApi(`/containers/${containerId}`);
  }

  async startContainer(containerId: string): Promise<{ message: string }> {
    return this.fetchApi(`/containers/${containerId}/start`, {
      method: "POST",
    });
  }

  async stopContainer(containerId: string): Promise<{ message: string }> {
    return this.fetchApi(`/containers/${containerId}/stop`, {
      method: "POST",
    });
  }

  async restartContainer(containerId: string): Promise<{ message: string }> {
    return this.fetchApi(`/containers/${containerId}/restart`, {
      method: "POST",
    });
  }

  async removeContainer(containerId: string): Promise<{ message: string }> {
    return this.fetchApi(`/containers/${containerId}`, {
      method: "DELETE",
    });
  }

  async getContainerLogs(
    containerId: string,
    lines = 100
  ): Promise<{ logs: string }> {
    return this.fetchApi(`/containers/${containerId}/logs?lines=${lines}`);
  }

  async getContainerStats(containerId: string): Promise<any> {
    return this.fetchApi(`/containers/${containerId}/stats`);
  }

  // =============================================================================
  // DATA TRANSFORMATION UTILITIES
  // =============================================================================

  mapToStackContainer(apiContainer: ApiContainer): StackContainer {
    return {
      label: apiContainer.name,
      description: apiContainer.labels["org.opencontainers.image.description"],
      id: apiContainer.short_id,
      full_id: apiContainer.id,
      status: apiContainer.status,
      state: apiContainer.state,
      image: apiContainer.image,
      image_id: apiContainer.image_id,
      created_at: apiContainer.created,
      started_at: apiContainer.started_at || "",
      finished_at: apiContainer.finished_at,

      stack: {
        name: apiContainer.compose_project,
        service: apiContainer.compose_service,
        configPath:
          apiContainer.labels["com.docker.compose.project.config_files"],
        workingPath:
          apiContainer.labels["com.docker.compose.project.working_dir"],
      },

      config: {
        ports: apiContainer.ports,
        config_hash: apiContainer.labels["com.docker.compose.config-hash"],
        container_number:
          apiContainer.labels["com.docker.compose.container-number"],
        dependencies:
          apiContainer.labels["com.docker.compose.depends_on"]?.split(",") ||
          [],
        oneoff: apiContainer.labels["com.docker.compose.oneoff"] === "True",
        environment: apiContainer.environment?.map((env) => {
          const [key, ...valueParts] = env.split("=");
          return { key, value: valueParts.join("=") };
        }),
        mounts: apiContainer.mounts,
        networks: apiContainer.networks,
        restart_policy: apiContainer.restart_policy,
      },

      container_image: {
        created: apiContainer.labels["org.opencontainers.image.created"],
        license: apiContainer.labels["org.opencontainers.image.licenses"],
        revision: apiContainer.labels["org.opencontainers.image.revision"],
        source: apiContainer.labels["org.opencontainers.image.source"],
        title: apiContainer.labels["org.opencontainers.image.title"],
        url: apiContainer.labels["org.opencontainers.image.url"],
        version: apiContainer.labels["org.opencontainers.image.version"],
      },
    };
  }

  mapToStackContainers(apiContainers: ApiContainer[]): StackContainer[] {
    return apiContainers.map(this.mapToStackContainer.bind(this));
  }
}
