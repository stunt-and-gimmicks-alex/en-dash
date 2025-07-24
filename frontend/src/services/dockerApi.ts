// src/services/dockerApi.ts - Fallback service using Docker API directly
import type { DockgeStack, DockgeContainer, DockgeStats } from "./dockgeApi";

class DockerApiService {
    private baseUrl: string;

    constructor(baseUrl: string = "/api/docker") {
        this.baseUrl = baseUrl;
    }

    // Generic fetch wrapper with error handling
    private async fetchApi<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...options?.headers,
                },
                ...options,
            });

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }

            return await response.json();
        } catch (error) {
            console.error(`Docker API error (${endpoint}):`, error);
            throw error;
        }
    }

    // Get all containers
    async getContainers(): Promise<DockgeContainer[]> {
        const containers = await this.fetchApi<any[]>(
            "/containers/json?all=true"
        );

        return containers.map((container) => ({
            name:
                container.Names[0]?.replace("/", "") ||
                container.Id.substring(0, 12),
            status: this.mapContainerStatus(container.State),
            image: container.Image,
            ports:
                container.Ports?.map((port: any) =>
                    port.PublicPort
                        ? `${port.PublicPort}:${port.PrivatePort}`
                        : port.PrivatePort.toString()
                ) || [],
            created: new Date(container.Created * 1000).toISOString(),
            stack: this.extractStackName(container.Labels),
        }));
    }

    // Get stacks by scanning the stacks directory and Docker containers
    async getStacks(): Promise<DockgeStack[]> {
        try {
            // This would require a backend API endpoint that reads the /opt/stacks directory
            const stacksData = await this.fetchApi<any[]>("/stacks");
            const containers = await this.getContainers();

            return stacksData.map((stackData) => {
                const stackContainers = containers.filter(
                    (c) => c.stack === stackData.name
                );
                const runningContainers = stackContainers.filter(
                    (c) => c.status === "running"
                ).length;

                return {
                    name: stackData.name,
                    status: runningContainers > 0 ? "running" : "stopped",
                    containers: stackContainers,
                    path: stackData.path,
                    composeFile: stackData.composeFile,
                    lastUpdated: stackData.lastUpdated,
                };
            });
        } catch (error) {
            console.error("Failed to get stacks:", error);
            // Fallback: try to infer stacks from container labels
            return this.inferStacksFromContainers();
        }
    }

    // Get Docker system info and stats
    async getStats(): Promise<DockgeStats> {
        const [containers, images, volumes, networks] = await Promise.all([
            this.getContainers(),
            this.fetchApi<any[]>("/images/json"),
            this.fetchApi<any[]>("/volumes"),
            this.fetchApi<any[]>("/networks"),
        ]);

        const stacks = await this.getStacks();
        const runningContainers = containers.filter(
            (c) => c.status === "running"
        ).length;
        const exitedContainers = containers.filter(
            (c) => c.status === "exited"
        ).length;
        const inactiveContainers =
            containers.length - runningContainers - exitedContainers;

        return {
            totalStacks: stacks.length,
            runningStacks: stacks.filter((s) => s.status === "running").length,
            stoppedStacks: stacks.filter((s) => s.status === "stopped").length,
            totalContainers: containers.length,
            runningContainers,
            exitedContainers,
            inactiveContainers,
            totalImages: images.length,
            totalVolumes: volumes.length,
            totalNetworks: networks.length,
        };
    }

    // Stack operations
    async startStack(stackName: string): Promise<void> {
        await this.fetchApi(`/stacks/${stackName}/start`, {
            method: "POST",
        });
    }

    async stopStack(stackName: string): Promise<void> {
        await this.fetchApi(`/stacks/${stackName}/stop`, {
            method: "POST",
        });
    }

    async restartStack(stackName: string): Promise<void> {
        await this.fetchApi(`/stacks/${stackName}/restart`, {
            method: "POST",
        });
    }

    // Container operations
    async startContainer(containerName: string): Promise<void> {
        await this.fetchApi(`/containers/${containerName}/start`, {
            method: "POST",
        });
    }

    async stopContainer(containerName: string): Promise<void> {
        await this.fetchApi(`/containers/${containerName}/stop`, {
            method: "POST",
        });
    }

    async restartContainer(containerName: string): Promise<void> {
        await this.fetchApi(`/containers/${containerName}/restart`, {
            method: "POST",
        });
    }

    // Helper methods
    private mapContainerStatus(state: string): DockgeContainer["status"] {
        switch (state.toLowerCase()) {
            case "running":
                return "running";
            case "exited":
                return "exited";
            case "created":
                return "created";
            case "restarting":
                return "restarting";
            case "removing":
                return "removing";
            case "paused":
                return "paused";
            case "dead":
                return "dead";
            default:
                return "exited";
        }
    }

    private extractStackName(
        labels: { [key: string]: string } = {}
    ): string | undefined {
        // Try different label formats that might indicate stack name
        return (
            labels["com.docker.compose.project"] ||
            labels["com.docker.stack.namespace"] ||
            labels["project"] ||
            undefined
        );
    }

    private async inferStacksFromContainers(): Promise<DockgeStack[]> {
        const containers = await this.getContainers();
        const stackGroups = new Map<string, DockgeContainer[]>();

        // Group containers by stack
        containers.forEach((container) => {
            const stackName = container.stack || "unknown";
            if (!stackGroups.has(stackName)) {
                stackGroups.set(stackName, []);
            }
            stackGroups.get(stackName)!.push(container);
        });

        // Convert to stack objects
        return Array.from(stackGroups.entries()).map(([name, containers]) => {
            const runningContainers = containers.filter(
                (c) => c.status === "running"
            ).length;

            return {
                name,
                status: runningContainers > 0 ? "running" : "stopped",
                containers,
                path: `/opt/stacks/${name}`,
            };
        });
    }
}

// Create singleton instance
export const dockerApi = new DockerApiService();

export default DockerApiService;
