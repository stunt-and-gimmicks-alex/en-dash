import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        primary: {
          50: { value: "#C5FFC9" },
          100: { value: "#89FA9E" },
          200: { value: "#6DDD84" },
          300: { value: "#50C16B" },
          400: { value: "#31A553" },
          500: { value: "#008A3C" },
          600: { value: "#006E2F" },
          700: { value: "#005321" },
          800: { value: "#003915" },
          900: { value: "#002109" },
          950: { value: "#001505" },
        },
        secondary: {
          50: { value: "#DDF8DB" },
          100: { value: "#CEEACD" },
          200: { value: "#B3CEB2" },
          300: { value: "#98B297" },
          400: { value: "#7E977E" },
          500: { value: "#657D65" },
          600: { value: "#4C644E" },
          700: { value: "#354C37" },
          800: { value: "#1F3522" },
          900: { value: "#0A200E" },
          950: { value: "#011505" },
        },
        tertiary: {
          50: { value: "#D2F7FF" },
          100: { value: "#AFEDF9" },
          200: { value: "#94D0DC" },
          300: { value: "#78B5C0" },
          400: { value: "#5E9AA5" },
          500: { value: "#43808B" },
          600: { value: "#266771" },
          700: { value: "#004F58" },
          800: { value: "#00363D" },
          900: { value: "#001F24" },
          950: { value: "#001417" },
        },
        neutral: {
          50: { value: "#F0F1EC" },
          100: { value: "#E2E3DD" },
          200: { value: "#C5C7C2" },
          300: { value: "#AAACA7" },
          400: { value: "#8F918D" },
          500: { value: "#757873" },
          600: { value: "#5D5F5B" },
          700: { value: "#454744" },
          800: { value: "#2E312E" },
          900: { value: "#1A1C19" },
          950: { value: "#0F120F" },
        },
        neutralVariant: {
          50: { value: "#ECF3E8" },
          100: { value: "#DDE5DA" },
          200: { value: "#C1C9BE" },
          300: { value: "#A6ADA3" },
          400: { value: "#8B9389" },
          500: { value: "#727970" },
          600: { value: "#596058" },
          700: { value: "#414941" },
          800: { value: "#2B322B" },
          900: { value: "#171D17" },
          950: { value: "#0C130C" },
        },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: {
            value: {
              _light: "colors.primary.600",
              _dark: "colors.primary.600",
            },
          },
          contrast: {
            value: { _light: "#ffffff", _dark: "#FFFFFF" },
          },
          fg: {
            value: { _light: "#181D18", _dark: "#E0E4DC" },
          },
          muted: {
            value: { _light: "#9BD4A0", _dark: "#35693F" },
          },
          subtle: {
            value: { _light: "#B6F1BA", _dark: "#1C5129" },
          },
          emphasized: {
            value: { _light: "#35693F", _dark: "#9BD4A0" },
          },
          focusRing: {
            value: { _light: "#1C5129", _dark: "#B6F1BA" },
          },
          primary: {
            value: { _light: "#35693F", _dark: "#9BD4A0" },
          },
          surfaceTint: {
            value: { _light: "#35693F", _dark: "#9BD4A0" },
          },
          onPrimary: {
            value: { _light: "#FFFFFF", _dark: "#003915" },
          },
          primaryContainer: {
            value: { _light: "#B6F1BA", _dark: "#1C5129" },
          },
          onPrimaryContainer: {
            value: { _light: "#1C5129", _dark: "#B6F1BA" },
          },
          secondary: {
            value: { _light: "#516351", _dark: "#B8CCB6" },
          },
          onSecondary: {
            value: { _light: "#FFFFFF", _dark: "#233425" },
          },
          secondaryContainer: {
            value: { _light: "#D4E8D1", _dark: "#394B3A" },
          },
          onSecondaryContainer: {
            value: { _light: "#394B3A", _dark: "#D4E8D1" },
          },
          tertiary: {
            value: { _light: "#39656D", _dark: "#A1CED7" },
          },
          onTertiary: {
            value: { _light: "#FFFFFF", _dark: "#00363D" },
          },
          tertiaryContainer: {
            value: { _light: "#BDEAF3", _dark: "#1F4D54" },
          },
          onTertiaryContainer: {
            value: { _light: "#1F4D54", _dark: "#BDEAF3" },
          },
          error: {
            value: { _light: "#BA1A1A", _dark: "#FFB4AB" },
          },
          onError: {
            value: { _light: "#FFFFFF", _dark: "#690005" },
          },
          errorContainer: {
            value: { _light: "#FFDAD6", _dark: "#93000A" },
          },
          onErrorContainer: {
            value: { _light: "#93000A", _dark: "#FFDAD6" },
          },
          background: {
            value: { _light: "#F7FBF2", _dark: "#101510" },
          },
          onBackground: {
            value: { _light: "#181D18", _dark: "#E0E4DC" },
          },
          surface: {
            value: { _light: "#F7FBF2", _dark: "#101510" },
          },
          onSurface: {
            value: { _light: "#181D18", _dark: "#E0E4DC" },
          },
          surfaceVariant: {
            value: { _light: "#DDE5DA", _dark: "#414941" },
          },
          onSurfaceVariant: {
            value: { _light: "#414941", _dark: "#C1C9BE" },
          },
          outline: {
            value: { _light: "#727970", _dark: "#8B9389" },
          },
          outlineVariant: {
            value: { _light: "#C1C9BE", _dark: "#414941" },
          },
          shadow: {
            value: { _light: "#000000", _dark: "#000000" },
          },
          scrim: {
            value: { _light: "#000000", _dark: "#000000" },
          },
          inverseSurface: {
            value: { _light: "#2D322C", _dark: "#E0E4DC" },
          },
          inverseOnSurface: {
            value: { _light: "#EEF2EA", _dark: "#2D322C" },
          },
          inversePrimary: {
            value: { _light: "#9BD4A0", _dark: "#35693F" },
          },
          primaryFixed: {
            value: { _light: "#B6F1BA", _dark: "#B6F1BA" },
          },
          onPrimaryFixed: {
            value: { _light: "#002109", _dark: "#002109" },
          },
          primaryFixedDim: {
            value: { _light: "#9BD4A0", _dark: "#9BD4A0" },
          },
          onPrimaryFixedVariant: {
            value: { _light: "#1C5129", _dark: "#1C5129" },
          },
          secondaryFixed: {
            value: { _light: "#D4E8D1", _dark: "#D4E8D1" },
          },
          onSecondaryFixed: {
            value: { _light: "#0F1F11", _dark: "#0F1F11" },
          },
          secondaryFixedDim: {
            value: { _light: "#B8CCB6", _dark: "#B8CCB6" },
          },
          onSecondaryFixedVariant: {
            value: { _light: "#394B3A", _dark: "#394B3A" },
          },
          tertiaryFixed: {
            value: { _light: "#BDEAF3", _dark: "#BDEAF3" },
          },
          onTertiaryFixed: {
            value: { _light: "#001F24", _dark: "#001F24" },
          },
          tertiaryFixedDim: {
            value: { _light: "#A1CED7", _dark: "#A1CED7" },
          },
          onTertiaryFixedVariant: {
            value: { _light: "#1F4D54", _dark: "#1F4D54" },
          },
          surfaceDim: {
            value: { _light: "#D7DBD3", _dark: "#101510" },
          },
          surfaceBright: {
            value: { _light: "#F7FBF2", _dark: "#363A35" },
          },
          surfaceContainerLowest: {
            value: { _light: "#FFFFFF", _dark: "#0B0F0B" },
          },
          surfaceContainerLow: {
            value: { _light: "#F1F5EC", _dark: "#181D18" },
          },
          surfaceContainer: {
            value: { _light: "#EBEFE7", _dark: "#1C211C" },
          },
          surfaceContainerHigh: {
            value: { _light: "#E5E9E1", _dark: "#262B26" },
          },
          surfaceContainerHighest: {
            value: { _light: "#E0E4DC", _dark: "#313630" },
          },
        },
        brandError: {
          error: {
            value: { _light: "#BA1A1A", _dark: "#FFB4AB" },
          },
          onError: {
            value: { _light: "#FFFFFF", _dark: "#690005" },
          },
          errorContainer: {
            value: { _light: "#FFDAD6", _dark: "#93000A" },
          },
          onErrorContainer: {
            value: { _light: "#93000A", _dark: "#FFDAD6" },
            solid: {
              value: {
                _light: "#BA1A1A",
                _dark: "#FFB4AB",
              },
            },
            contrast: {
              value: { _light: "#FFFFFF", _dark: "#690005" },
            },
            fg: {
              value: { _light: "#BA1A1A", _dark: "#FFB4AB" },
            },
            muted: {
              value: { _light: "#FFDAD6", _dark: "#93000A" },
            },
            subtle: {
              value: { _light: "#FFDAD6", _dark: "#690005" },
            },
            emphasized: {
              value: { _light: "#93000A", _dark: "#FFDAD6" },
            },
            focusRing: {
              value: { _light: "#BA1A1A", _dark: "#BA1A1A" },
            },
          },
        },
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
