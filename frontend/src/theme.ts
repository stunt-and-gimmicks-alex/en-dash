import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#c3ffd0" },
          100: { value: "#65ff92" },
          200: { value: "#09e46a" },
          300: { value: "#06c55a" },
          400: { value: "#05aa4d" },
          500: { value: "#038c3e" },
          600: { value: "#027030" },
          700: { value: "#015322" },
          800: { value: "#003915" },
          900: { value: "#002109" },
          950: { value: "#001505" },
        },
        brandGrey: {
          50: { value: "#F1F1F1" },
          100: { value: "#D9D9D9" },
          200: { value: "#C4C4C4" },
          300: { value: "#A6A6A6" },
          400: { value: "#898989" },
          500: { value: "#6D6D6D" },
          600: { value: "#555555" },
          700: { value: "#3B3B3B" },
          800: { value: "#242424" },
          900: { value: "#0D0D0D" },
          950: { value: "#070707" },
        },
      },
    },
    semanticTokens: {
      colors: {
        primary: { value: "{colors.brand.500}" },
        "primary.hover": { value: "{colors.brand.600}" },
      },
    },
  },
  globalCss: {
    "html, body": {
      margin: 0,
      padding: 0,
      minHeight: "100vh",
    },
    // Custom scrollbar styling
    "::-webkit-scrollbar": {
      width: "8px",
    },
    "::-webkit-scrollbar-track": {
      bg: { base: "gray.100", _dark: "gray.800" },
    },
    "::-webkit-scrollbar-thumb": {
      bg: { base: "gray.400", _dark: "gray.600" },
      borderRadius: "4px",
    },
    "::-webkit-scrollbar-thumb:hover": {
      bg: { base: "gray.500", _dark: "gray.500" },
    },
  },
});

export const system = createSystem(defaultConfig, config);
