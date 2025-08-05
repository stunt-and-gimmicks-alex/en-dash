// Enhanced StackControlButtons with individual loading states and better UX
import React, { useState } from "react";
import { Button, Stack, Toast } from "@chakra-ui/react";
import { Toaster, toaster } from "@/components/ui/toaster";
import { PiArrowCounterClockwise, PiDownload, PiPower } from "react-icons/pi";

interface StackControlButtonsProps {
  status: "running" | "stopped" | "partial" | "empty" | "error";
  onStart: () => Promise<boolean>;
  onStop: () => Promise<boolean>;
  onRestart: () => Promise<boolean>;
  onUpdate?: () => Promise<boolean>;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  width?: string;
  height?: string;
  gap?: string;
  showUpdate?: boolean;
  buttonSize?: "xs" | "sm" | "md" | "lg" | "xl";
  stackName?: string;
}

interface OperationState {
  starting: boolean;
  stopping: boolean;
  restarting: boolean;
  updating: boolean;
}

export const StackControlButtons: React.FC<StackControlButtonsProps> = ({
  status,
  onStart,
  onStop,
  onRestart,
  onUpdate,
  disabled = false,
  orientation = "horizontal",
  width,
  height,
  gap = "0.5",
  showUpdate = true,
  buttonSize = "lg",
  stackName = "stack",
}) => {
  const [operationState, setOperationState] = useState<OperationState>({
    starting: false,
    stopping: false,
    restarting: false,
    updating: false,
  });

  // Show toast helper using toaster utility
  const showToast = (
    type: "success" | "error",
    title: string,
    description: string
  ) => {
    toaster.create({
      title,
      description,
      type,
      duration: type === "success" ? 3000 : 5000,
      closable: true,
    });
  };

  // Prevent event bubbling and handle operation with loading state
  const handleOperation = async (
    e: React.MouseEvent,
    operation: keyof OperationState,
    action: () => Promise<boolean>,
    operationName: string
  ) => {
    e.stopPropagation();

    if (operationState[operation] || disabled) return;

    setOperationState((prev) => ({ ...prev, [operation]: true }));

    try {
      const success = await action();

      if (success) {
        showToast(
          "success",
          "Success",
          `${stackName} ${operationName} successfully`
        );
      } else {
        throw new Error(
          `Failed to ${operationName.toLowerCase()} ${stackName}`
        );
      }
    } catch (error) {
      console.error(`Error ${operationName.toLowerCase()} stack:`, error);
      showToast(
        "error",
        "Error",
        `Failed to ${operationName.toLowerCase()} ${stackName}`
      );
    } finally {
      setOperationState((prev) => ({ ...prev, [operation]: false }));
    }
  };

  const isRunning = status === "running" || status === "partial";
  const anyOperationInProgress = Object.values(operationState).some(Boolean);

  return (
    <>
      <Stack
        direction={orientation === "horizontal" ? "row" : "column"}
        gap={gap}
        justify="space-evenly"
        align="stretch"
        w={width}
        h={height}
        bg="gray/10"
        borderWidth="1px"
        borderRadius="5px"
        p="1"
      >
        {/* Restart Button */}
        <Stack gap="0.5" flex="1">
          <Button
            variant="ghost"
            colorPalette="grayBrand"
            size={isRunning ? buttonSize : "sm"}
            onClick={(e) =>
              handleOperation(e, "restarting", onRestart, "Restarted")
            }
            disabled={!isRunning || disabled || anyOperationInProgress}
            loading={operationState.restarting}
            loadingText="Restarting..."
          >
            <PiArrowCounterClockwise />
            Restart
          </Button>
        </Stack>

        {/* Start/Stop Button */}
        <Stack gap="0.5" flex="1">
          {isRunning ? (
            <Button
              variant="ghost"
              colorPalette="redBrand"
              size={buttonSize}
              onClick={(e) => handleOperation(e, "stopping", onStop, "Stopped")}
              disabled={disabled || anyOperationInProgress}
              loading={operationState.stopping}
              loadingText="Stopping..."
            >
              <PiPower />
              Stop
            </Button>
          ) : (
            <Button
              variant="ghost"
              colorPalette="brand"
              size={buttonSize}
              onClick={(e) =>
                handleOperation(e, "starting", onStart, "Started")
              }
              disabled={disabled || anyOperationInProgress}
              loading={operationState.starting}
              loadingText="Starting..."
            >
              <PiPower />
              Start
            </Button>
          )}
        </Stack>

        {/* Update Button */}
        {showUpdate && onUpdate && (
          <Stack gap="0.5" flex="1">
            <Button
              variant="ghost"
              colorPalette="grayBrand"
              size={buttonSize}
              onClick={(e) =>
                handleOperation(e, "updating", onUpdate, "Updated")
              }
              disabled={disabled || anyOperationInProgress}
              loading={operationState.updating}
              loadingText="Updating..."
            >
              <PiDownload />
              Update
            </Button>
          </Stack>
        )}
      </Stack>
    </>
  );
};
