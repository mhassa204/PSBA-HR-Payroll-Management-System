import React, { createContext, useContext, useEffect } from "react";
import { useColors } from "../hooks/useColors";

// Create Color Theme Context
const ColorThemeContext = createContext();

// Color Theme Provider Component
export const ColorThemeProvider = ({ children, defaultTheme = "default" }) => {
  const colorHook = useColors();

  // Apply default theme on mount
  useEffect(() => {
    if (defaultTheme !== "default") {
      colorHook.applyTheme(defaultTheme);
    }
  }, [defaultTheme, colorHook.applyTheme]);

  // Load saved theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-color-theme");
    if (savedTheme && colorHook.availableThemes.includes(savedTheme)) {
      colorHook.applyTheme(savedTheme);
    }
  }, [colorHook.applyTheme, colorHook.availableThemes]);

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("app-color-theme", colorHook.currentTheme);
  }, [colorHook.currentTheme]);

  return (
    <ColorThemeContext.Provider value={colorHook}>
      {children}
    </ColorThemeContext.Provider>
  );
};

// Hook to use color theme context
export const useColorTheme = () => {
  const context = useContext(ColorThemeContext);
  if (!context) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider");
  }
  return context;
};

// Color Theme Selector Component
export const ColorThemeSelector = ({ className = "" }) => {
  const { currentTheme, applyTheme, availableThemes } = useColorTheme();

  const themeLabels = {
    default: "Default Blue",
    blue: "Ocean Blue",
    green: "Nature Green",
    purple: "Royal Purple",
    orange: "Sunset Orange",
    dark: "Dark Mode",
  };

  const themeColors = {
    default: "#3b82f6",
    blue: "#3b82f6",
    green: "#22c55e",
    purple: "#a855f7",
    orange: "#f97316",
    dark: "#64748b",
  };

  return (
    <div className={`color-theme-selector ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Color Theme
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {availableThemes.map((theme) => (
          <button
            key={theme}
            onClick={() => applyTheme(theme)}
            className={`
              flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200
              ${
                currentTheme === theme
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }
            `}
          >
            <div
              className="w-4 h-4 rounded-full border border-gray-300"
              style={{ backgroundColor: themeColors[theme] }}
            />
            <span className="text-sm font-medium">{themeLabels[theme]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Custom Color Picker Component
export const CustomColorPicker = ({ className = "" }) => {
  const { updatePrimaryColor, getColor } = useColorTheme();
  const currentPrimary = getColor("primary.500");

  const handleColorChange = (event) => {
    updatePrimaryColor(event.target.value);
  };

  return (
    <div className={`custom-color-picker ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Custom Primary Color
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={currentPrimary}
          onChange={handleColorChange}
          className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
        />
        <div className="flex-1">
          <input
            type="text"
            value={currentPrimary}
            onChange={(e) => updatePrimaryColor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="#3b82f6"
          />
        </div>
      </div>
    </div>
  );
};

// Theme Settings Panel Component
export const ThemeSettingsPanel = ({ isOpen, onClose, className = "" }) => {
  const { resetColors, currentTheme } = useColorTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Panel */}
        <div
          className={`
          inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle 
          transition-all transform bg-white shadow-xl rounded-2xl ${className}
        `}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Theme Settings
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Theme Selector */}
            <ColorThemeSelector />

            {/* Custom Color Picker */}
            <CustomColorPicker />

            {/* Current Theme Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Current Theme
              </h4>
              <p className="text-sm text-gray-600">
                {currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}{" "}
                Theme
              </p>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetColors}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorThemeProvider;
