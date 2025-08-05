import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brandPrimary: {
          50: { value: "#eefff4" },
          100: { value: "#d7ffe7" },
          200: { value: "#b1ffd1" },
          300: { value: "#74ffaf" },
          400: { value: "#31f784" },
          500: { value: "#07e063" },
          600: { value: "#00bb4f" },
          700: { value: "#038c3e" },
          800: { value: "#097237" },
          900: { value: "#095e30" },
          950: { value: "#003518" },
        },
        brandGray: {
          50: { value: "#f6f6f6" },
          100: { value: "#e7e7e7" },
          200: { value: "#d1d1d1" },
          300: { value: "#b0b0b0" },
          400: { value: "#888888" },
          500: { value: "#6d6d6d" },
          600: { value: "#5d5d5d" },
          700: { value: "#4f4f4f" },
          800: { value: "#454545" },
          900: { value: "#3d3d3d" },
          950: { value: "#0d0d0d" },
        },
        brandSecondary: {
          50: { value: "#e8fffc" },
          100: { value: "#c6fff7" },
          200: { value: "#95fff0" },
          300: { value: "#4bffe8" },
          400: { value: "#00ffec" },
          500: { value: "#00f4fb" },
          600: { value: "#00c2d2" },
          700: { value: "#0099a9" },
          800: { value: "#037e8c" },
          900: { value: "#076472" },
          950: { value: "#00434f" },
        },
        brandRed: {
          50: { value: "#fef2f2" },
          100: { value: "#fee2e2" },
          200: { value: "#ffc9c9" },
          300: { value: "#fda4a4" },
          400: { value: "#fa6f6f" },
          500: { value: "#f14242" },
          600: { value: "#de2424" },
          700: { value: "#ba1a1a" },
          800: { value: "#9b1919" },
          900: { value: "#801c1c" },
          950: { value: "#460909" },
        },
        brandYellow: {
          50: { value: "#fefce8" },
          100: { value: "#fff9c2" },
          200: { value: "#fff085" },
          300: { value: "#ffe145" },
          400: { value: "#fccc13" },
          500: { value: "#ecb306" },
          600: { value: "#cc8b02" },
          700: { value: "#a26206" },
          800: { value: "#864d0d" },
          900: { value: "#723f11" },
          950: { value: "#432005" },
        },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          solid: {
            value: {
              _light: "#ffffff",
              _dark: "#000000",
            },
          },
          subtle: {
            value: {
              _light: "colors.brandGray.50",
              _dark: "colors.brandGray.950",
            },
          },
          muted: {
            value: {
              _light: "colors.brandGray.100",
              _dark: "colors.brandGray.900",
            },
          },
          emphasized: {
            value: {
              _light: "colors.brandGray.200",
              _dark: "colors.brandGray.800",
            },
          },
          inverted: {
            value: {
              _light: "#000000",
              _dark: "#ffffff",
            },
          },
          error: {
            value: {
              _light: "colors.brandRed.50",
              _dark: "colors.brandRed.950",
            },
          },
          warning: {
            value: {
              _light: "colors.brandYellow.50",
              _dark: "colors.brandGray.950",
            },
          },
          success: {
            value: {
              _light: "colors.brandPrimary.50",
              _dark: "colors.brandPrimary.950",
            },
          },
          info: {
            value: {
              _light: "colors.brandSecondary.50",
              _dark: "colors.brandGray.950",
            },
          },
        },
        border: {
          value: {
            _light: "colors.brandGray.200",
            _dark: "colors.brandGray.800",
          },
          muted: {
            value: {
              _light: "colors.brandGray.100",
              _dark: "colors.brandGray.900",
            },
          },
          subtle: {
            value: {
              _light: "colors.brandGray.50",
              _dark: "colors.brandGray.950",
            },
          },
          emphasized: {
            value: {
              _light: "colors.brandGray.300",
              _dark: "colors.brandGray.700",
            },
          },
          inverted: {
            value: {
              _light: "colors.brandGray.800",
              _dark: "colors.brandGray.200",
            },
          },
          error: {
            value: {
              _light: "colors.brandRed.500",
              _dark: "colors.brandRed.400",
            },
          },
          warning: {
            value: {
              _light: "colors.brandYellow.500",
              _dark: "colors.brandGray.400",
            },
          },
          success: {
            value: {
              _light: "colors.brandPrimary.500",
              _dark: "colors.brandPrimary.400",
            },
          },
          info: {
            value: {
              _light: "colors.brandSecondary.500",
              _dark: "colors.brandGray.400",
            },
          },
        },
        fg: {
          value: {
            _light: "colors.brandGray.950",
            _dark: "colors.brandGray.50",
          },
          branded: {
            value: {
              _light: "colors.brandPrimary.700",
              _dark: "colors.brandPrimary.300",
            },
          },
          muted: {
            value: {
              _light: "colors.brandGray.600",
              _dark: "colors.brandGray.400",
            },
          },
          subtle: {
            value: {
              _light: "colors.brandGray.400",
              _dark: "colors.brandGray.500",
            },
          },
          inverted: {
            value: {
              _light: "colors.brandGray.50",
              _dark: "colors.brandGray.950",
            },
          },
          error: {
            value: {
              _light: "colors.brandRed.500",
              _dark: "colors.brandRed.400",
            },
          },
          warning: {
            value: {
              _light: "colors.brandYellow.600",
              _dark: "colors.brandGray.300",
            },
          },
          success: {
            value: {
              _light: "colors.brandPrimary.600",
              _dark: "colors.brandPrimary.300",
            },
          },
          info: {
            value: {
              _light: "colors.brandSecondary.600",
              _dark: "colors.brandGray.300",
            },
          },
        },
        brand: {
          fg: {
            value: {
              _light: "colors.brandPrimary.700",
              _dark: "colors.brandPrimary.300",
            },
          },
          onSolid: {
            value: {
              _light: "colors.brandPrimary.200",
              _dark: "colors.brandPrimary.200",
            },
          },
          bg: {
            value: {
              _light: "colors.brandPrimary.50",
              _dark: "colors.brandPrimary.950",
            },
          },
          border: {
            value: {
              _light: "colors.brandPrimary.400",
              _dark: "colors.brandPrimary.600",
            },
          },
          solid: {
            value: {
              _light: "colors.brandPrimary.700",
              _dark: "colors.brandPrimary.700",
            },
          },
          contrast: {
            value: { _light: "#ffffff", _dark: "#FFFFFF" },
          },
          subtle: {
            value: {
              _light: "colors.brandPrimary.100",
              _dark: "colors.brandPrimary.900",
            },
          },
          muted: {
            value: {
              _light: "colors.brandPrimary.200",
              _dark: "colors.brandPrimary.800",
            },
          },
          emphasized: {
            value: {
              _light: "colors.brandPrimary.300",
              _dark: "colors.brandPrimary.700",
            },
          },
          focusRing: {
            value: {
              _light: "colors.brandPrimary.500",
              _dark: "colors.brandPrimary.500",
            },
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
        secondaryBrand: {
          bg: {
            value: {
              _light: "colors.brandSecondary.950",
              _dark: "colors.brandSecondary.50",
            },
          },
          border: {
            value: {
              _light: "colors.brandSecondary.800",
              _dark: "colors.brandSecondary.200",
            },
          },
          fg: {
            value: {
              _light: "colors.brandSecondary.900",
              _dark: "colors.brandSecondary.300",
            },
          },
          solid: {
            value: {
              _light: "colors.brandSecondary.700",
              _dark: "colors.brandSecondary.700",
            },
          },
          contrast: {
            value: {
              _light: "colors.brandGray.50",
              _dark: "colors.brandGray.50",
            },
          },
          subtle: {
            value: {
              _light: "colors.brandSecondary.100",
              _dark: "colors.brandSecondary.900",
            },
          },
          muted: {
            value: {
              _light: "colors.brandSecondary.600",
              _dark: "colors.brandSecondary.800",
            },
          },
          emphasized: {
            value: {
              _light: "colors.brandSecondary.300",
              _dark: "colors.brandSecondary.700",
            },
          },
          focusRing: {
            value: {
              _light: "colors.brandSecondary.500",
              _dark: "colors.brandSecondary.500",
            },
          },
        },
        yellowBrand: {
          bg: {
            value: {
              _light: "colors.brandYellow.50",
              _dark: "colors.brandYellow.950",
            },
          },
          border: {
            value: {
              _light: "colors.brandYellow.200",
              _dark: "colors.brandYellow.800",
            },
          },
          fg: {
            value: {
              _light: "colors.brandYellow.800",
              _dark: "colors.brandGray.300",
            },
          },
          solid: {
            value: {
              _light: "colors.brandYellow.400",
              _dark: "colors.brandYellow.400",
            },
          },
          contrast: {
            value: {
              _light: "colors.brandGray.950",
              _dark: "colors.brandGray.950",
            },
          },
          subtle: {
            value: {
              _light: "colors.brandYellow.100",
              _dark: "colors.brandYellow.900",
            },
          },
          muted: {
            value: {
              _light: "colors.brandYellow.200",
              _dark: "colors.brandYellow.800",
            },
          },
          emphasized: {
            value: {
              _light: "colors.brandYellow.300",
              _dark: "colors.brandYellow.700",
            },
          },
          focusRing: {
            value: {
              _light: "colors.brandYellow.500",
              _dark: "colors.brandYellow.500",
            },
          },
        },
        redBrand: {
          bg: {
            value: {
              _light: "#colors.brandRed.50",
              _dark: "colors.brandRed.950",
            },
          },
          border: {
            value: {
              _light: "colors.brandRed.200",
              _dark: "colors.brandRed.800",
            },
          },
          fg: {
            value: {
              _light: "colors.brandRed.700",
              _dark: "colors.brandRed.300",
            },
          },
          solid: {
            value: {
              _light: "colors.brandRed.600",
              _dark: "colors.brandRed.700",
            },
          },
          contrast: {
            value: { _light: "#ffffff", _dark: "#FFFFFF" },
          },
          subtle: {
            value: {
              _light: "colors.brandRed.100",
              _dark: "colors.brandRed.900",
            },
          },
          muted: {
            value: {
              _light: "colors.brandRed.200",
              _dark: "colors.brandRed.800",
            },
          },
          emphasized: {
            value: {
              _light: "colors.brandRed.300",
              _dark: "colors.brandRed.700",
            },
          },
          focusRing: {
            value: {
              _light: "colors.brandRed.500",
              _dark: "colors.brandRed.500",
            },
          },
        },
        grayBrand: {
          bg: {
            value: {
              _light: "colors.brandGray.50",
              _dark: "colors.brandGray.950",
            },
          },
          border: {
            value: {
              _light: "colors.brandGray.200",
              _dark: "colors.brandGray.800",
            },
          },
          fg: {
            value: {
              _light: "colors.brandGray.700",
              _dark: "colors.brandGray.300",
            },
          },
          solid: {
            value: {
              _light: "colors.brandGray.600",
              _dark: "colors.brandGray.600",
            },
          },
          contrast: {
            value: {
              _light: "colors.brandGray.950",
              _dark: "colors.brandGray.50",
            },
          },
          subtle: {
            value: {
              _light: "colors.brandGray.200",
              _dark: "colors.brandGray.800",
            },
          },
          muted: {
            value: {
              _light: "colors.brandGray.300",
              _dark: "colors.brandGray.700",
            },
          },
          emphasized: {
            value: {
              _light: "colors.brandGray.400",
              _dark: "colors.brandGray.600",
            },
          },
          focusRing: {
            value: {
              _light: "colors.brandGray.500",
              _dark: "colors.brandGray.500",
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
