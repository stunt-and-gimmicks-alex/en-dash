// src/services/api/apiStackService.ts
import { BaseApiService } from "./baseApiService";
import { type ApiContainer } from "./apiContainerService";
import {
  type DockerService,
  type ServiceParseLevel,
} from "./apiServicesService";

export interface ApiStack {
  compose_content: string | null;
  name: string;
  path: string;
  compose_file: string;
  status: "running" | "stopped" | "partial";
  services: string[]; // Keep original service names array
  parsed_services?: DockerService[]; // Add parsed services
  containers: ApiContainer[];
  last_modified?: string;
}

export interface ApiDockerStats {
  stacks: {
    total: number;
    running: number;
    stopped: number;
    partial: number;
  };
  containers: {
    total: number;
    running: number;
    stopped: number;
    paused: number;
  };
  images: {
    total: number;
    size: number;
  };
  networks: {
    total: number;
  };
  volumes: {
    total: number;
  };
  system: {
    docker_version: string;
    api_version: string;
    kernel_version: string;
    operating_system: string;
    architecture: string;
    cpus: number;
    memory: number;
  };
}

export class ApiStackService extends BaseApiService {
  // =============================================================================
  // DOCKER COMPOSE STACK MANAGEMENT
  // =============================================================================

  async getStacks(): Promise<ApiStack[]> {
    return this.fetchApi("/docker/stacks");
  }

  async getStack(stackName: string): Promise<ApiStack> {
    return this.fetchApi(`/docker/stacks/${stackName}`);
  }

  async startStack(stackName: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/start`, {
      method: "POST",
    });
  }

  async stopStack(stackName: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/stop`, {
      method: "POST",
    });
  }

  async restartStack(stackName: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/restart`, {
      method: "POST",
    });
  }

  async pullStack(stackName: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/pull`, {
      method: "POST",
    });
  }

  async removeStack(stackName: string): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}`, {
      method: "DELETE",
    });
  }

  async createStack(
    stackName: string,
    composeContent: string
  ): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}`, {
      method: "POST",
      body: JSON.stringify({
        name: stackName,
        compose_content: composeContent,
      }),
    });
  }

  async updateStack(
    stackName: string,
    composeContent: string
  ): Promise<{ message: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}`, {
      method: "PUT",
      body: JSON.stringify({
        compose_content: composeContent,
      }),
    });
  }

  async getStackLogs(
    stackName: string,
    lines = 100
  ): Promise<{ logs: string }> {
    return this.fetchApi(`/docker/stacks/${stackName}/logs?lines=${lines}`);
  }

  async getStackStats(stackName: string): Promise<any> {
    return this.fetchApi(`/docker/stacks/${stackName}/stats`);
  }

  // =============================================================================
  // DOCKER SYSTEM STATS
  // =============================================================================

  async getDockerStats(): Promise<ApiDockerStats> {
    return this.fetchApi("/docker/stats");
  }

  async getDockerInfo(): Promise<any> {
    return this.fetchApi("/docker/info");
  }

  async getDockerVersion(): Promise<any> {
    return this.fetchApi("/docker/version");
  }

  // =============================================================================
  // INTEGRATION WITH SERVICES
  // =============================================================================

  // Get stacks with parsed services (requires servicesService injection)
  async getStacksWithServices(
    servicesService: any, // Will be properly typed in orchestrator
    serviceLevel: ServiceParseLevel = "intermediate"
  ): Promise<ApiStack[]> {
    const stacks = await this.getStacks();

    return stacks.map((stack) => ({
      ...stack,
      parsed_services: servicesService.parseServices(
        stack.compose_content,
        stack.containers,
        serviceLevel
      ),
    }));
  }

  // Get single stack with parsed services
  async getStackWithServices(
    stackName: string,
    servicesService: any, // Will be properly typed in orchestrator
    serviceLevel: ServiceParseLevel = "intermediate"
  ): Promise<ApiStack> {
    const stack = await this.getStack(stackName);

    return {
      ...stack,
      parsed_services: servicesService.parseServices(
        stack.compose_content,
        stack.containers,
        serviceLevel
      ),
    };
  }
}
