// src/hooks/useDockge.ts - React hooks for Dockge data
import { useState, useEffect, useCallback, useRef } from "react";
import {
    dockgeApi,
    type DockgeStack,
    type DockgeContainer,
    type DockgeStats,
    type DockgeSystemInfo,
} from "@/services/dockgeApi";

// Connection status hook
export const useDockgeConnection = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const connectionAttempted = useRef(false);

    const connect = useCallback(async () => {
        if (connectionAttempted.current) return;

        setIsConnecting(true);
        setError(null);
        connectionAttempted.current = true;

        try {
            await dockgeApi.connect();
            setIsConnected(true);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to connect to Dockge"
            );
            setIsConnected(false);
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        dockgeApi.disconnect();
        setIsConnected(false);
        connectionAttempted.current = false;
    }, []);

    useEffect(() => {
        // Set up connection status listeners
        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);
        const handleError = (error: any) => {
            setError(error.message || "Connection error");
            setIsConnected(false);
        };

        dockgeApi.onConnect(handleConnect);
        dockgeApi.onDisconnect(handleDisconnect);
        dockgeApi.onError(handleError);

        // Auto-connect on mount
        connect();

        return () => {
            dockgeApi.offConnect(handleConnect);
            dockgeApi.offDisconnect(handleDisconnect);
            dockgeApi.offError(handleError);
        };
    }, [connect]);

    return {
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
    };
};

// Stacks data hook
export const useDockgeStacks = () => {
    const [stacks, setStacks] = useState<DockgeStack[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshStacks = useCallback(() => {
        if (dockgeApi.isConnected()) {
            dockgeApi.requestStacks();
        }
    }, []);

    useEffect(() => {
        const handleStackList = (stackList: DockgeStack[]) => {
            setStacks(stackList);
            setLoading(false);
            setError(null);
        };

        const handleStackChanged = (stack: DockgeStack) => {
            setStacks((prev) => {
                const index = prev.findIndex((s) => s.name === stack.name);
                if (index >= 0) {
                    const newStacks = [...prev];
                    newStacks[index] = stack;
                    return newStacks;
                }
                return [...prev, stack];
            });
        };

        dockgeApi.onStackList(handleStackList);
        dockgeApi.onStackChanged(handleStackChanged);

        // Request initial data if connected
        if (dockgeApi.isConnected()) {
            refreshStacks();
        }

        return () => {
            dockgeApi.offStackList(handleStackList);
            dockgeApi.offStackChanged(handleStackChanged);
        };
    }, [refreshStacks]);

    const startStack = useCallback((stackName: string) => {
        dockgeApi.startStack(stackName);
    }, []);

    const stopStack = useCallback((stackName: string) => {
        dockgeApi.stopStack(stackName);
    }, []);

    const restartStack = useCallback((stackName: string) => {
        dockgeApi.restartStack(stackName);
    }, []);

    const updateStack = useCallback((stackName: string) => {
        dockgeApi.updateStack(stackName);
    }, []);

    const deleteStack = useCallback((stackName: string) => {
        dockgeApi.deleteStack(stackName);
    }, []);

    return {
        stacks,
        loading,
        error,
        refreshStacks,
        startStack,
        stopStack,
        restartStack,
        updateStack,
        deleteStack,
    };
};

// Containers data hook
export const useDockgeContainers = () => {
    const [containers, setContainers] = useState<DockgeContainer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshContainers = useCallback(() => {
        if (dockgeApi.isConnected()) {
            dockgeApi.requestContainers();
        }
    }, []);

    useEffect(() => {
        const handleContainerList = (containerList: DockgeContainer[]) => {
            setContainers(containerList);
            setLoading(false);
            setError(null);
        };

        const handleContainerChanged = (container: DockgeContainer) => {
            setContainers((prev) => {
                const index = prev.findIndex((c) => c.name === container.name);
                if (index >= 0) {
                    const newContainers = [...prev];
                    newContainers[index] = container;
                    return newContainers;
                }
                return [...prev, container];
            });
        };

        dockgeApi.onContainerList(handleContainerList);
        dockgeApi.onContainerChanged(handleContainerChanged);

        // Request initial data if connected
        if (dockgeApi.isConnected()) {
            refreshContainers();
        }

        return () => {
            dockgeApi.offContainerList(handleContainerList);
            dockgeApi.offContainerChanged(handleContainerChanged);
        };
    }, [refreshContainers]);

    const startContainer = useCallback((containerName: string) => {
        dockgeApi.startContainer(containerName);
    }, []);

    const stopContainer = useCallback((containerName: string) => {
        dockgeApi.stopContainer(containerName);
    }, []);

    const restartContainer = useCallback((containerName: string) => {
        dockgeApi.restartContainer(containerName);
    }, []);

    return {
        containers,
        loading,
        error,
        refreshContainers,
        startContainer,
        stopContainer,
        restartContainer,
    };
};

// Stats data hook
export const useDockgeStats = () => {
    const [stats, setStats] = useState<DockgeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshStats = useCallback(() => {
        if (dockgeApi.isConnected()) {
            dockgeApi.requestStats();
        }
    }, []);

    useEffect(() => {
        const handleStats = (statsData: DockgeStats) => {
            setStats(statsData);
            setLoading(false);
            setError(null);
        };

        dockgeApi.onStats(handleStats);

        // Request initial data if connected
        if (dockgeApi.isConnected()) {
            refreshStats();
        }

        // Set up periodic refresh (every 30 seconds)
        const interval = setInterval(() => {
            if (dockgeApi.isConnected()) {
                refreshStats();
            }
        }, 30000);

        return () => {
            dockgeApi.offStats(handleStats);
            clearInterval(interval);
        };
    }, [refreshStats]);

    return {
        stats,
        loading,
        error,
        refreshStats,
    };
};

// System info hook
export const useDockgeSystemInfo = () => {
    const [systemInfo, setSystemInfo] = useState<DockgeSystemInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleSystemInfo = (info: DockgeSystemInfo) => {
            setSystemInfo(info);
            setLoading(false);
            setError(null);
        };

        dockgeApi.onSystemInfo(handleSystemInfo);

        // Request initial data if connected
        if (dockgeApi.isConnected()) {
            dockgeApi.requestSystemInfo();
        }

        return () => {
            dockgeApi.offSystemInfo(handleSystemInfo);
        };
    }, []);

    return {
        systemInfo,
        loading,
        error,
    };
};

// Combined hook for Docker overview page
export const useDockgeOverview = () => {
    const connection = useDockgeConnection();
    const {
        stacks,
        loading: stacksLoading,
        ...stackActions
    } = useDockgeStacks();
    const {
        containers,
        loading: containersLoading,
        ...containerActions
    } = useDockgeContainers();
    const { stats, loading: statsLoading, refreshStats } = useDockgeStats();
    const { systemInfo } = useDockgeSystemInfo();

    // Calculate derived stats
    const derivedStats = {
        totalStacks: stacks.length,
        runningStacks: stacks.filter((s) => s.status === "running").length,
        stoppedStacks: stacks.filter((s) => s.status === "stopped").length,
        totalContainers: containers.length,
        runningContainers: containers.filter((c) => c.status === "running")
            .length,
        exitedContainers: containers.filter((c) => c.status === "exited")
            .length,
        inactiveContainers: containers.filter(
            (c) => !["running", "exited"].includes(c.status)
        ).length,
    };

    return {
        // Connection status
        ...connection,

        // Data
        stacks,
        containers,
        stats: stats || derivedStats,
        systemInfo,

        // Loading states
        loading: stacksLoading || containersLoading || statsLoading,

        // Actions
        ...stackActions,
        ...containerActions,
        refreshStats,

        // Computed data for UI
        stacksForSidebar: stacks.map((stack) => ({
            name: stack.name,
            status:
                stack.status === "running"
                    ? ("active" as const)
                    : stack.status === "stopped"
                    ? ("inactive" as const)
                    : ("exited" as const),
        })),
    };
};
