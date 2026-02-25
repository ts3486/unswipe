// LOCKED theme constants for the Unmatch app.
// Palette and paperTheme must not be changed without explicit approval.
// No default exports.

import { MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// ---------------------------------------------------------------------------
// Palette (LOCKED)
// ---------------------------------------------------------------------------

export const colors = {
  /** App background — deepest layer */
  background: '#0B1220',
  /** Surface / card background — raised layer */
  surface: '#121C2E',
  /** Primary accent — CTA buttons, active tab indicator */
  primary: '#4C8DFF',
  /** Secondary accent — supporting highlights */
  secondary: '#7AA7FF',
  /** Primary text */
  text: '#E6EDF7',
  /** Secondary / muted text */
  muted: '#A7B3C7',
  /** Borders and dividers */
  border: '#223049',
  /** Success states */
  success: '#47C28B',
  /** Warning states */
  warning: '#F2C14E',
  /** Danger / panic accent */
  danger: '#FF4C6E',
} as const;

export type AppColors = typeof colors;

// ---------------------------------------------------------------------------
// Theme object
// ---------------------------------------------------------------------------

export const theme = {
  colors,
} as const;

export type AppTheme = typeof theme;

// ---------------------------------------------------------------------------
// react-native-paper MD3 compatible theme (LOCKED)
// Overrides MD3DarkTheme tokens to match the locked palette.
// ---------------------------------------------------------------------------

export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // Core surface roles
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surface,
    // Primary roles
    primary: colors.primary,
    primaryContainer: '#1A3366',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: colors.secondary,
    // Secondary roles
    secondary: colors.secondary,
    secondaryContainer: '#1A2D4D',
    onSecondary: '#0B1220',
    onSecondaryContainer: colors.text,
    // Tertiary (mapped to success for positive feedback)
    tertiary: colors.success,
    tertiaryContainer: '#1A3D2E',
    onTertiary: '#0B1220',
    onTertiaryContainer: colors.text,
    // On-surface text
    onSurface: colors.text,
    onSurfaceVariant: colors.muted,
    onBackground: colors.text,
    // Outline / border
    outline: colors.border,
    outlineVariant: colors.border,
    // Error (kept from MD3DarkTheme; no locked value)
    error: MD3DarkTheme.colors.error,
    errorContainer: MD3DarkTheme.colors.errorContainer,
    onError: MD3DarkTheme.colors.onError,
    onErrorContainer: MD3DarkTheme.colors.onErrorContainer,
    // Inverse (kept from MD3DarkTheme)
    inverseSurface: MD3DarkTheme.colors.inverseSurface,
    inverseOnSurface: MD3DarkTheme.colors.inverseOnSurface,
    inversePrimary: MD3DarkTheme.colors.inversePrimary,
    // Disabled states (semi-transparent text/surface)
    surfaceDisabled: 'rgba(18, 28, 46, 0.38)',
    onSurfaceDisabled: 'rgba(230, 237, 247, 0.38)',
    // Overlay helpers
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(11, 18, 32, 0.8)',
    // Elevation tints (dark theme uses primary-tinted surfaces)
    elevation: {
      level0: 'transparent',
      level1: '#121C2E',
      level2: '#162338',
      level3: '#1A2A42',
      level4: '#1C2D47',
      level5: '#1F334E',
    },
  },
};
