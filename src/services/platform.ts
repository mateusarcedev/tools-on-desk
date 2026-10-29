/**
 * Cross-platform detection and formatting utilities for ToolsOnDesk.
 * Provides unified helper functions for macOS, Windows and Linux.
 */

export type PlatformType = 'macos' | 'windows' | 'linux';

const detectPlatform = (): PlatformType => {
  if (typeof window === 'undefined' || !window.navigator) {
    return 'windows';
  }

  const userAgent = (navigator.userAgent || '').toLowerCase();
  const platform = ((navigator as any).userAgentData?.platform || navigator.platform || '').toLowerCase();

  if (platform.includes('mac') || userAgent.includes('macintosh') || userAgent.includes('mac os')) {
    return 'macos';
  }

  if (platform.includes('linux') || userAgent.includes('linux')) {
    return 'linux';
  }

  return 'windows';
};

export const currentPlatform: PlatformType = detectPlatform();

export const isMacOS = currentPlatform === 'macos';
export const isWindows = currentPlatform === 'windows';
export const isLinux = currentPlatform === 'linux';

/**
 * Returns the primary modifier key symbol for the current platform.
 * macOS: '⌘' (Command)
 * Windows/Linux: 'Ctrl'
 */
export const getModifierKey = (): string => {
  return isMacOS ? '⌘' : 'Ctrl';
};

/**
 * Formats a keyboard shortcut with the platform's native modifier symbol.
 * E.g., formatShortcut('K') -> '⌘K' on macOS, 'Ctrl K' on Windows/Linux.
 */
export const formatShortcut = (key: string, glue = ' '): string => {
  if (isMacOS) {
    return `⌘${key}`;
  }
  return `Ctrl${glue}${key}`;
};

/**
 * Formats a keyboard shortcut specifically for title bars or tooltips (e.g. 'Ctrl+K' vs '⌘K').
 */
export const formatTitleShortcut = (key: string): string => {
  if (isMacOS) {
    return `⌘${key}`;
  }
  return `Ctrl+${key}`;
};
