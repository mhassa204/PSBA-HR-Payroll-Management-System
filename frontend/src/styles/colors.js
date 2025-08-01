// Global Color System - Centralized color management
// Change colors here to update the entire application

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Main primary color
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Secondary Brand Colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',  // Main secondary color
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Success Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Main success color
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Warning Colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // Main warning color
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Error/Danger Colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Main error color
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Info Colors
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',  // Main info color
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },

  // Neutral/Gray Colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',  // Main neutral color
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    dark: '#0f172a',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text Colors
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#64748b',
    inverse: '#ffffff',
    muted: '#94a3b8',
    disabled: '#cbd5e1',
  },

  // Border Colors
  border: {
    light: '#e2e8f0',
    medium: '#cbd5e1',
    dark: '#94a3b8',
    focus: '#3b82f6',
    error: '#ef4444',
    success: '#22c55e',
  },

  // Shadow Colors
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
};

// Semantic Color Mappings - Use these for consistent theming
export const semanticColors = {
  // Button Colors
  button: {
    primary: {
      bg: colors.primary[600],
      bgHover: colors.primary[700],
      bgActive: colors.primary[800],
      text: colors.text.inverse,
      border: colors.primary[600],
    },
    secondary: {
      bg: colors.secondary[100],
      bgHover: colors.secondary[200],
      bgActive: colors.secondary[300],
      text: colors.secondary[700],
      border: colors.secondary[300],
    },
    success: {
      bg: colors.success[600],
      bgHover: colors.success[700],
      bgActive: colors.success[800],
      text: colors.text.inverse,
      border: colors.success[600],
    },
    warning: {
      bg: colors.warning[500],
      bgHover: colors.warning[600],
      bgActive: colors.warning[700],
      text: colors.text.inverse,
      border: colors.warning[500],
    },
    error: {
      bg: colors.error[600],
      bgHover: colors.error[700],
      bgActive: colors.error[800],
      text: colors.text.inverse,
      border: colors.error[600],
    },
  },

  // Form Colors
  form: {
    input: {
      bg: colors.background.primary,
      border: colors.border.light,
      borderFocus: colors.border.focus,
      borderError: colors.border.error,
      text: colors.text.primary,
      placeholder: colors.text.muted,
    },
    label: {
      text: colors.text.secondary,
      required: colors.error[500],
    },
  },

  // Status Colors
  status: {
    active: colors.success[500],
    inactive: colors.neutral[400],
    pending: colors.warning[500],
    error: colors.error[500],
    terminated: colors.error[600],
    resigned: colors.warning[600],
    onLeave: colors.info[500],
  },

  // Navigation Colors
  navigation: {
    bg: colors.background.primary,
    border: colors.border.light,
    text: colors.text.secondary,
    textActive: colors.primary[600],
    textHover: colors.text.primary,
  },

  // Card Colors
  card: {
    bg: colors.background.primary,
    border: colors.border.light,
    shadow: colors.shadow.base,
    header: colors.background.secondary,
  },

  // Table Colors
  table: {
    header: colors.background.secondary,
    border: colors.border.light,
    stripe: colors.background.tertiary,
    hover: colors.primary[50],
  },
};

// CSS Custom Properties Generator
export const generateCSSVariables = () => {
  const cssVars = {};
  
  // Generate CSS variables for all colors
  Object.entries(colors).forEach(([category, colorSet]) => {
    if (typeof colorSet === 'object' && !Array.isArray(colorSet)) {
      Object.entries(colorSet).forEach(([shade, value]) => {
        cssVars[`--color-${category}-${shade}`] = value;
      });
    }
  });

  // Generate semantic color variables
  Object.entries(semanticColors).forEach(([category, colorSet]) => {
    const flattenObject = (obj, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && !Array.isArray(value)) {
          flattenObject(value, `${prefix}${key}-`);
        } else {
          cssVars[`--semantic-${category}-${prefix}${key}`] = value;
        }
      });
    };
    flattenObject(colorSet);
  });

  return cssVars;
};

export default colors;
