'use client';

import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  applyTheme,
  loadThemeFromStorage,
  normalizeColor,
  normalizeFont,
  resetTheme,
  saveThemeToStorage,
  validateColor,
  validateFont,
  validateRadius,
  type Theme,
} from '@/lib/theme';

type ColorMode = 'light' | 'dark';

const MODE_STORAGE_KEY = 'acp-color-mode';

function getInitialMode(): ColorMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return localStorage.getItem(MODE_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

function applyColorMode(mode: ColorMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  localStorage.setItem(MODE_STORAGE_KEY, mode);
}

function validateTheme(theme: Record<string, unknown>) {
  const validatedTheme: Theme = {};
  const invalidValues: string[] = [];

  for (const [key, value] of Object.entries(theme)) {
    if (key === 'radius') {
      validatedTheme[key] = validateRadius(value as number);
      continue;
    }

    if (key === 'font-sans' || key === 'font-mono') {
      if (typeof value !== 'string') {
        invalidValues.push(key);
        continue;
      }

      const normalized = normalizeFont(value);
      if (validateFont(normalized)) {
        validatedTheme[key] = normalized;
      } else {
        invalidValues.push(`${key}: "${value}"`);
      }
      continue;
    }

    if (typeof value !== 'string') {
      invalidValues.push(key);
      continue;
    }

    const normalized = normalizeColor(value);
    if (validateColor(normalized)) {
      validatedTheme[key as keyof Theme] = normalized;
    } else {
      invalidValues.push(`${key}: "${value}"`);
    }
  }

  return { invalidValues, validatedTheme };
}

export function ThemeSelector() {
  const [mode, setMode] = useState<ColorMode>(getInitialMode);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return loadThemeFromStorage();
  });

  useEffect(() => {
    applyColorMode(mode);
  }, [mode]);

  useEffect(() => {
    if (currentTheme) {
      applyTheme(currentTheme);
    }
  }, [currentTheme]);

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError('Enter a theme prompt first.');
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch('/api/user-theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: trimmedPrompt }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? 'Theme generation failed.');
      setLoading(false);
      return;
    }

    const data = (await response.json()) as { theme: Record<string, unknown> };
    const { invalidValues, validatedTheme } = validateTheme(data.theme);

    if (Object.keys(validatedTheme).length === 0) {
      setError('The generated theme did not contain valid CSS values.');
      setLoading(false);
      return;
    }

    if (invalidValues.length > 0) {
      setError(`Skipped invalid values: ${invalidValues.slice(0, 2).join(', ')}`);
    }

    setCurrentTheme(validatedTheme);
    saveThemeToStorage(validatedTheme);
    setPrompt('');
    setLoading(false);
  }

  function handleResetCustomTheme() {
    resetTheme();
    setCurrentTheme(null);
    setError(null);
  }

  const nextMode = mode === 'dark' ? 'light' : 'dark';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ml-2 inline-flex items-center gap-2 border border-dashed border-border bg-transparent px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          aria-label="Open theme controls"
        >
          <span aria-hidden>{mode === 'dark' ? '◐' : '◑'}</span>
          <span>{mode === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,24rem)] border-dashed p-0">
        <div className="border-b border-dashed border-border px-4 py-3">
          <div className="section-kicker">Theme</div>
          <button
            type="button"
            className="mt-3 w-full border border-dashed border-border px-3 py-2 text-left text-xs uppercase tracking-[0.08em] text-primary transition-colors hover:bg-[var(--hover)]"
            onClick={() => setMode(nextMode)}
          >
            Switch to {nextMode}
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div>
            <div className="section-kicker">LLM Tweaks</div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Generate a temporary CSS variable theme for this browser.
            </p>
          </div>

          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !loading) {
                event.preventDefault();
                void handleGenerate();
              }
            }}
            placeholder='e.g. "paper terminal with green ink"'
            rows={3}
            disabled={loading}
            className="resize-none rounded-none border-dashed bg-transparent text-xs"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="border border-dashed border-border px-3 py-2 text-xs uppercase tracking-[0.08em] text-primary transition-colors hover:bg-[var(--hover)] disabled:opacity-50"
            >
              {loading ? 'Generating' : 'Generate'}
            </button>
            {currentTheme && (
              <button
                type="button"
                onClick={handleResetCustomTheme}
                disabled={loading}
                className="border border-dashed border-border px-3 py-2 text-xs uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
              >
                Reset Tweaks
              </button>
            )}
          </div>

          {error && (
            <p className="border border-dashed border-destructive px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
