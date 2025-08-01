import { useState, useEffect, useCallback } from "react";
import { colors, semanticColors, generateCSSVariables } from "../styles/colors";

/**
 * Custom hook for managing global colors
 * Allows dynamic color changes that affect the entire application
 */
export const useColors = () => {
  const [currentTheme, setCurrentTheme] = useState("default");
  const [customColors, setCustomColors] = useState(colors);

  // Apply colors to CSS custom properties
  const applyColors = useCallback(
    (colorSet = customColors) => {
      const root = document.documentElement;
      const cssVars = generateCSSVariables();

      // Apply all CSS variables
      Object.entries(cssVars).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      // Apply custom color overrides
      Object.entries(colorSet).forEach(([category, colorGroup]) => {
        if (typeof colorGroup === "object" && !Array.isArray(colorGroup)) {
          Object.entries(colorGroup).forEach(([shade, value]) => {
            root.style.setProperty(`--color-${category}-${shade}`, value);
          });
        }
      });
    },
    [customColors]
  );

  // Update primary color and regenerate theme
  const updatePrimaryColor = useCallback(
    (newPrimaryColor) => {
      const updatedColors = {
        ...customColors,
        primary: {
          ...customColors.primary,
          500: newPrimaryColor,
          600: adjustBrightness(newPrimaryColor, -10),
          700: adjustBrightness(newPrimaryColor, -20),
          400: adjustBrightness(newPrimaryColor, 10),
          300: adjustBrightness(newPrimaryColor, 20),
        },
      };

      setCustomColors(updatedColors);
      applyColors(updatedColors);
    },
    [customColors, applyColors]
  );

  // Update any color category
  const updateColorCategory = useCallback(
    (category, newColors) => {
      const updatedColors = {
        ...customColors,
        [category]: {
          ...customColors[category],
          ...newColors,
        },
      };

      setCustomColors(updatedColors);
      applyColors(updatedColors);
    },
    [customColors, applyColors]
  );

  // Reset to default colors
  const resetColors = useCallback(() => {
    setCustomColors(colors);
    applyColors(colors);
    setCurrentTheme("default");
  }, [applyColors]);

  // Predefined theme presets
  const applyTheme = useCallback(
    (themeName) => {
      const themes = {
        default: colors,
        blue: {
          ...colors,
          primary: {
            50: "#eff6ff",
            100: "#dbeafe",
            200: "#bfdbfe",
            300: "#93c5fd",
            400: "#60a5fa",
            500: "#3b82f6",
            600: "#2563eb",
            700: "#1d4ed8",
            800: "#1e40af",
            900: "#1e3a8a",
            950: "#172554",
          },
        },
        green: {
          ...colors,
          primary: {
            50: "#f0fdf4",
            100: "#dcfce7",
            200: "#bbf7d0",
            300: "#86efac",
            400: "#4ade80",
            500: "#22c55e",
            600: "#16a34a",
            700: "#15803d",
            800: "#166534",
            900: "#14532d",
            950: "#052e16",
          },
        },
        purple: {
          ...colors,
          primary: {
            50: "#faf5ff",
            100: "#f3e8ff",
            200: "#e9d5ff",
            300: "#d8b4fe",
            400: "#c084fc",
            500: "#a855f7",
            600: "#9333ea",
            700: "#7c3aed",
            800: "#6b21a8",
            900: "#581c87",
            950: "#3b0764",
          },
        },
        orange: {
          ...colors,
          primary: {
            50: "#fff7ed",
            100: "#ffedd5",
            200: "#fed7aa",
            300: "#fdba74",
            400: "#fb923c",
            500: "#f97316",
            600: "#ea580c",
            700: "#c2410c",
            800: "#9a3412",
            900: "#7c2d12",
            950: "#431407",
          },
        },
        dark: {
          ...colors,
          background: {
            primary: "#1e293b",
            secondary: "#334155",
            tertiary: "#475569",
            dark: "#0f172a",
            overlay: "rgba(0, 0, 0, 0.8)",
          },
          text: {
            primary: "#f8fafc",
            secondary: "#e2e8f0",
            tertiary: "#cbd5e1",
            inverse: "#0f172a",
            muted: "#94a3b8",
            disabled: "#64748b",
          },
        },
      };

      const selectedTheme = themes[themeName] || themes.default;
      setCustomColors(selectedTheme);
      applyColors(selectedTheme);
      setCurrentTheme(themeName);
    },
    [applyColors]
  );

  // Initialize colors on mount
  useEffect(() => {
    const root = document.documentElement;
    const cssVars = generateCSSVariables();

    // Apply all CSS variables
    Object.entries(cssVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Apply custom color overrides
    Object.entries(customColors).forEach(([category, colorGroup]) => {
      if (typeof colorGroup === "object" && !Array.isArray(colorGroup)) {
        Object.entries(colorGroup).forEach(([shade, value]) => {
          root.style.setProperty(`--color-${category}-${shade}`, value);
        });
      }
    });
  }, []); // Only run once on mount

  // Get current color value
  const getColor = useCallback(
    (path) => {
      const pathArray = path.split(".");
      let current = customColors;

      for (const key of pathArray) {
        if (current[key] !== undefined) {
          current = current[key];
        } else {
          return null;
        }
      }

      return current;
    },
    [customColors]
  );

  // Get semantic color value
  const getSemanticColor = useCallback((path) => {
    const pathArray = path.split(".");
    let current = semanticColors;

    for (const key of pathArray) {
      if (current[key] !== undefined) {
        current = current[key];
      } else {
        return null;
      }
    }

    return current;
  }, []);

  return {
    // Current state
    colors: customColors,
    semanticColors,
    currentTheme,

    // Color getters
    getColor,
    getSemanticColor,

    // Color updaters
    updatePrimaryColor,
    updateColorCategory,
    applyColors,

    // Theme management
    applyTheme,
    resetColors,

    // Available themes
    availableThemes: ["default", "blue", "green", "purple", "orange", "dark"],
  };
};

// Utility function to adjust color brightness
function adjustBrightness(hex, percent) {
  // Remove # if present
  hex = hex.replace("#", "");

  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Adjust brightness
  const newR = Math.max(0, Math.min(255, r + (r * percent) / 100));
  const newG = Math.max(0, Math.min(255, g + (g * percent) / 100));
  const newB = Math.max(0, Math.min(255, b + (b * percent) / 100));

  // Convert back to hex
  const toHex = (n) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

export default useColors;
