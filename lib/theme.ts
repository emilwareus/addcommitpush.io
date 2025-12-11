export const ALLOWED_VARS = [
  'background',
  'foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'muted',
  'muted-foreground',
  'border',
  'ring',
  'radius',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'input',
  'navbar',
  'navbar-foreground',
  'navbar-border',
  'navbar-active',
  'navbar-hover',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'font-sans',
  'font-mono',
] as const;

export type Theme = Partial<Record<(typeof ALLOWED_VARS)[number], string | number>>;

const STORAGE_KEY = 'byo-css-theme';

export function normalizeColor(color: string): string {
  if (!color || typeof color !== 'string') return '';

  // Trim whitespace and remove quotes
  let normalized = color.trim().replace(/^["']|["']$/g, '');

  // Remove any trailing semicolons or commas
  normalized = normalized.replace(/[;,]+$/, '');

  return normalized.trim();
}

export function validateColor(color: string): boolean {
  const normalized = normalizeColor(color);
  if (!normalized) return false;

  // Check for common valid CSS color formats
  const colorPatterns = [
    /^oklch\([^)]+\)$/i, // oklch() format (case insensitive) - valid even if browser doesn't support it
    /^#[0-9a-fA-F]{3,8}$/, // hex colors
    /^rgb\([^)]+\)$/i, // rgb()
    /^rgba\([^)]+\)$/i, // rgba()
    /^hsl\([^)]+\)$/i, // hsl()
    /^hsla\([^)]+\)$/i, // hsla()
    /^[a-z]+$/i, // named colors like "red", "blue", etc.
  ];

  // Check if it matches a pattern
  const matchesPattern = colorPatterns.some((pattern) => pattern.test(normalized));
  if (!matchesPattern) return false;

  // For oklch(), it's a valid CSS format even if browser doesn't support it yet
  // So we accept it if it matches the pattern
  if (/^oklch\([^)]+\)$/i.test(normalized)) {
    return true;
  }

  // For other formats, validate with CSS.supports
  try {
    return CSS.supports('color', normalized);
  } catch {
    return false;
  }
}

export function validateRadius(radius: number | undefined): number {
  if (typeof radius !== 'number') return 0.5;
  return Math.max(0, Math.min(24, radius));
}

export function validateFont(font: string): boolean {
  if (!font || typeof font !== 'string') return false;
  const normalized = font.trim();
  if (!normalized) return false;

  // Font stacks should be comma-separated font names, optionally with quotes
  // Examples: "Inter, sans-serif", 'Space Grotesk', 'Geist Mono', 'Geist Mono Fallback'
  // Allow font names with spaces, numbers, hyphens
  const fontPattern = /^['"]?[a-zA-Z0-9\s\-]+['"]?(\s*,\s*['"]?[a-zA-Z0-9\s\-]+['"]?)*$/;
  return fontPattern.test(normalized);
}

export function normalizeFont(font: string): string {
  if (!font || typeof font !== 'string') return '';
  // Trim and clean up font stack
  let normalized = font.trim();
  // Remove outer quotes but keep inner structure
  normalized = normalized.replace(/^["']|["']$/g, '');
  // Clean up spacing around commas
  normalized = normalized.replace(/\s*,\s*/g, ', ');
  return normalized.trim();
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;

  for (const [key, value] of Object.entries(theme)) {
    if (!ALLOWED_VARS.includes(key as (typeof ALLOWED_VARS)[number])) {
      continue;
    }

    if (key === 'radius') {
      const radius = validateRadius(value as number);
      root.style.setProperty(`--${key}`, `${radius}rem`);
    } else if (key === 'font-sans' || key === 'font-mono') {
      // Handle font stacks
      if (typeof value === 'string') {
        const normalized = normalizeFont(value);
        if (validateFont(normalized)) {
          root.style.setProperty(`--${key}`, normalized);
        }
      }
    } else if (typeof value === 'string') {
      // Handle colors
      const normalized = normalizeColor(value);
      if (validateColor(normalized)) {
        root.style.setProperty(`--${key}`, normalized);
      }
    }
  }
}

export function resetTheme() {
  const root = document.documentElement;
  for (const key of ALLOWED_VARS) {
    root.style.removeProperty(`--${key}`);
  }
  localStorage.removeItem(STORAGE_KEY);
}

export function loadThemeFromStorage(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const theme = JSON.parse(stored);
    return theme;
  } catch {
    return null;
  }
}

export function saveThemeToStorage(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // Ignore storage errors
  }
}

