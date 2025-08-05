// src/components/ui/small/StackControlButtons.tsx
// Generic stack control buttons component with flexible layout options

import React from "react";
import { Button, Stack } from "@chakra-ui/react";
import {
  LuCirclePower,
  LuHardDriveDownload,
  LuRotateCcw,
} from "react-icons/lu";

interface StackControlButtonsProps {
  status: "running" | "stopped" | "partial" | "empty" | "error";
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onUpdate?: () => void;
  disabled?: boolean;
  loading?: boolean;
  orientation?: "horizontal" | "vertical";
  width?: string;
  height?: string;
  gap?: string;
  showUpdate?: boolean;
  buttonSize?: "xs" | "sm" | "md" | "lg" | "xl";
}

export const StackControlButtons: React.FC<StackControlButtonsProps> = ({
  status,
  onStart,
  onStop,
  onRestart,
  onUpdate,
  disabled = false,
  loading = false,
  orientation = "horizontal",
  width,
  height,
  gap = "0.5",
  showUpdate = true,
  buttonSize = "lg",
}) => {
  // Prevent event bubbling from buttons
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const isRunning = status === "running" || status === "partial";

  return (
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
          color="brand.onSecondaryContainer"
          bg={{ _hover: "brand.secondaryContainer/75" }}
          size={isRunning ? buttonSize : "sm"}
          onClick={(e) => handleButtonClick(e, onRestart)}
          disabled={!isRunning || disabled || loading}
        >
          <LuRotateCcw /> Restart
        </Button>
      </Stack>

      {/* Start/Stop Button */}
      <Stack gap="0.5" flex="1">
        {isRunning ? (
          <Button
            size={buttonSize}
            color="brand.onErrorContainer"
            bg={{ _hover: "brand.errorContainer/75" }}
            variant="ghost"
            onClick={(e) => handleButtonClick(e, onStop)}
            disabled={disabled || loading}
          >
            <LuCirclePower />
            Stop
          </Button>
        ) : (
          <Button
            size={buttonSize}
            color="brand.onContainer"
            bg={{ _hover: "brand.primaryContainer/80" }}
            variant="ghost"
            onClick={(e) => handleButtonClick(e, onStart)}
            disabled={disabled || loading}
          >
            <LuCirclePower />
            Start
          </Button>
        )}
      </Stack>

      {/* Update Button (optional) */}
      {showUpdate && (
        <Stack gap="0.5" flex="1">
          <Button
            size={buttonSize}
            color="brand.onTertiaryContainer"
            bg={{ _hover: "brand.tertiaryContainer/75" }}
            variant="ghost"
            onClick={(e) => handleButtonClick(e, onUpdate || (() => {}))}
            disabled={disabled || !onUpdate}
          >
            <LuHardDriveDownload />
            Update
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
