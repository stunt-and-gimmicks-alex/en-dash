// frontend/src/hooks/v06-useStackActions.ts
// Clean stack actions hook - handles start/stop/restart operations via REST API
// Separated from data fetching for better architecture and testability

import { useCallback, useState } from "react";
import type { StackActionResponse } from "@/types/unified";

// API configuration
const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:8001/api`;
    }
  }
  return "http://localhost:8001/api";
};

interface StackAction {
  stackName: string;
  action: "start" | "stop" | "restart";
  timestamp: Date;
  success: boolean;
  error?: string;
}

interface UseStackActionsResult {
  // Action methods
  startStack: (stackName: string) => Promise<boolean>;
  stopStack: (stackName: string) => Promise<boolean>;
  restartStack: (stackName: string) => Promise<boolean>;

  // State
  isPerformingAction: boolean;
  lastAction: StackAction | null;
  actionHistory: StackAction[];

  // Utilities
  clearHistory: () => void;
  getStackActionHistory: (stackName: string) => StackAction[];
}

export const useStackActions = (): UseStackActionsResult => {
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [lastAction, setLastAction] = useState<StackAction | null>(null);
  const [actionHistory, setActionHistory] = useState<StackAction[]>([]);

  // Generic API call handler
  const performAction = useCallback(
    async (
      stackName: string,
      action: "start" | "stop" | "restart"
    ): Promise<boolean> => {
      if (isPerformingAction) {
        console.warn(
          `v06-stackActions: Action already in progress, skipping ${action} for ${stackName}`
        );
        return false;
      }

      setIsPerformingAction(true);

      const actionRecord: StackAction = {
        stackName,
        action,
        timestamp: new Date(),
        success: false,
      };

      try {
        console.log(`🎬 v06-stackActions: ${action} ${stackName}`);

        const response = await fetch(
          `${getApiBaseUrl()}/docker/stacks/${stackName}/${action}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: StackActionResponse = await response.json();

        if (result.success) {
          actionRecord.success = true;
          console.log(`✅ v06-stackActions: ${action} ${stackName} succeeded`);
        } else {
          actionRecord.error = result.message || `${action} operation failed`;
          console.error(
            `❌ v06-stackActions: ${action} ${stackName} failed:`,
            actionRecord.error
          );
        }

        return result.success;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : `Failed to ${action} stack`;
        actionRecord.error = errorMessage;

        console.error(
          `❌ v06-stackActions: ${action} ${stackName} error:`,
          errorMessage
        );
        return false;
      } finally {
        // Update state
        setLastAction(actionRecord);
        setActionHistory((prev) => [...prev, actionRecord]);
        setIsPerformingAction(false);

        console.log(`🏁 v06-stackActions: ${action} ${stackName} completed`, {
          success: actionRecord.success,
          error: actionRecord.error,
        });
      }
    },
    [isPerformingAction]
  );

  // Individual action methods
  const startStack = useCallback(
    async (stackName: string): Promise<boolean> => {
      return performAction(stackName, "start");
    },
    [performAction]
  );

  const stopStack = useCallback(
    async (stackName: string): Promise<boolean> => {
      return performAction(stackName, "stop");
    },
    [performAction]
  );

  const restartStack = useCallback(
    async (stackName: string): Promise<boolean> => {
      return performAction(stackName, "restart");
    },
    [performAction]
  );

  // Utility methods
  const clearHistory = useCallback(() => {
    console.log("🧹 v06-stackActions: Clearing action history");
    setActionHistory([]);
    setLastAction(null);
  }, []);

  const getStackActionHistory = useCallback(
    (stackName: string): StackAction[] => {
      return actionHistory.filter((action) => action.stackName === stackName);
    },
    [actionHistory]
  );

  return {
    // Action methods
    startStack,
    stopStack,
    restartStack,

    // State
    isPerformingAction,
    lastAction,
    actionHistory,

    // Utilities
    clearHistory,
    getStackActionHistory,
  };
};

// Convenience hook for a specific stack's actions
export const useStackAction = (stackName: string) => {
  const actions = useStackActions();

  return {
    ...actions,
    // Pre-bound methods for this specific stack
    start: () => actions.startStack(stackName),
    stop: () => actions.stopStack(stackName),
    restart: () => actions.restartStack(stackName),

    // Stack-specific history
    history: actions.getStackActionHistory(stackName),

    // Stack-specific state
    isThisStackActive:
      actions.lastAction?.stackName === stackName && actions.isPerformingAction,
  };
};

export default useStackActions;
