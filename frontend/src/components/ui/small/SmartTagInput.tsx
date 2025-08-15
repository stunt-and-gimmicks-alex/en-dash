// SmartTagInput.tsx - Textarea-based tag input with visual tag display and smart color selection

import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Field,
  HStack,
  Stack,
  Tag,
  Textarea,
  Wrap,
} from "@chakra-ui/react";

interface SmartTagInputProps {
  label?: string;
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

// Available ChakraUI/Tailwind color palettes
const COLOR_PALETTES = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "cyan",
  "purple",
  "pink",
];

export const SmartTagInput: React.FC<SmartTagInputProps> = ({
  label,
  placeholder = "Type tags separated by commas or press Tab...",
  value = [],
  onChange,
  maxTags,
  size = "sm",
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [tagColors, setTagColors] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Smart color picker that avoids consecutive and current duplicates
  const getNextColor = (currentColors: string[]): string => {
    const lastColor = currentColors[currentColors.length - 1];
    const usedColors = new Set(currentColors);

    // Available colors (excluding used colors and last color)
    const availableColors = COLOR_PALETTES.filter(
      (color) => color !== lastColor && !usedColors.has(color)
    );

    // If we've used all colors or no available colors, fall back to excluding just the last color
    const finalOptions =
      availableColors.length > 0
        ? availableColors
        : COLOR_PALETTES.filter((color) => color !== lastColor);

    // If still no options (shouldn't happen with 9 colors), just use gray
    if (finalOptions.length === 0) return "gray";

    // Pick random color from available options
    return finalOptions[Math.floor(Math.random() * finalOptions.length)];
  };

  // Update colors when tags change
  useEffect(() => {
    if (value.length > tagColors.length) {
      // Adding tags - generate new colors
      const newColors = [...tagColors];
      while (newColors.length < value.length) {
        newColors.push(getNextColor(newColors));
      }
      setTagColors(newColors);
    } else if (value.length < tagColors.length) {
      // Removing tags - trim colors
      setTagColors(tagColors.slice(0, value.length));
    }
  }, [value.length]);

  // Process input and create tags
  const processInput = (input: string, triggerChar?: string) => {
    if (!input.trim()) return;

    // Split by commas, newlines, or if triggered by tab
    const separators = triggerChar === "Tab" ? [input] : input.split(/[,\n]+/);

    const newTags = separators
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .filter((tag) => !value.includes(tag)); // Avoid duplicates

    if (newTags.length > 0) {
      const updatedTags = [...value, ...newTags];
      const finalTags = maxTags ? updatedTags.slice(0, maxTags) : updatedTags;
      onChange(finalTags);
      setInputValue("");
    }
  };

  // Handle textarea changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;

    // Check for comma or newline
    if (input.includes(",") || input.includes("\n")) {
      processInput(input);
    } else {
      setInputValue(input);
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    switch (e.key) {
      case "Tab":
        e.preventDefault();
        if (inputValue.trim()) {
          processInput(inputValue.trim(), "Tab");
        }
        break;
      case "Enter":
        e.preventDefault();
        if (inputValue.trim()) {
          processInput(inputValue.trim(), "Enter");
        }
        break;
      case "Backspace":
        // If input is empty and there are tags, remove the last tag
        if (!inputValue && value.length > 0) {
          const newTags = [...value];
          newTags.pop();
          onChange(newTags);
        }
        break;
    }
  };

  // Handle tag removal
  const removeTag = (indexToRemove: number) => {
    const newTags = value.filter((_, index) => index !== indexToRemove);
    onChange(newTags);
  };

  // Focus textarea when clicking on the container
  const handleContainerClick = () => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Handle blur - process any remaining input
  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue.trim()) {
      processInput(inputValue.trim());
    }
  };

  return (
    <Field.Root>
      {label && <Field.Label>{label}</Field.Label>}

      <Box
        borderWidth="1px"
        borderColor={isFocused ? "brand.500" : "border"}
        borderRadius="md"
        p="2"
        w="full"
        minH="20"
        cursor={disabled ? "not-allowed" : "text"}
        bg={disabled ? "bg.muted" : "bg"}
        transition="border-color 0.2s"
        onClick={handleContainerClick}
        _hover={{
          borderColor: disabled
            ? "border"
            : isFocused
            ? "brand.500"
            : "border.hover",
        }}
      >
        <Stack gap="2">
          {/* Display existing tags */}
          {value.length > 0 && (
            <Wrap gap="1">
              {value.map((tag, index) => (
                <Tag.Root
                  key={`${tag}-${index}`}
                  size={size}
                  colorPalette={tagColors[index] || "gray"}
                  variant="subtle"
                >
                  <Tag.Label>{tag}</Tag.Label>
                  {!disabled && (
                    <Tag.EndElement>
                      <Tag.CloseTrigger
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(index);
                        }}
                      />
                    </Tag.EndElement>
                  )}
                </Tag.Root>
              ))}
            </Wrap>
          )}

          {/* Input textarea */}
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder={value.length === 0 ? placeholder : "Add more tags..."}
            disabled={disabled}
            variant="flushed"
            resize="none"
            rows={1}
            maxH="32"
            p="0"
            border="none"
            _focus={{
              outline: "none",
              boxShadow: "none",
            }}
          />
        </Stack>
      </Box>

      {/* Helper text */}
      <Field.HelperText fontSize="xs" color="fg.muted">
        {maxTags && (
          <>
            {value.length}/{maxTags} tags •{" "}
          </>
        )}
        Separate with commas or press Tab/Enter
      </Field.HelperText>
    </Field.Root>
  );
};

// Usage example for the drawer components:
/*
833-459-1791
<SmartTagInput
  label="Application Tags"
  value={appTags}
  onChange={setAppTags}
  placeholder="Enter tags like: web, database, monitoring..."
  maxTags={10}
  colorPalette="blue"
/>

*/
