'use client';

import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  applyTheme,
  resetTheme,
  loadThemeFromStorage,
  saveThemeToStorage,
  validateColor,
  validateRadius,
  validateFont,
  normalizeColor,
  normalizeFont,
  type Theme,
} from '@/lib/theme';

export function ThemeSelector() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = loadThemeFromStorage();
    if (stored) {
      setCurrentTheme(stored);
      applyTheme(stored);
    }
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate theme');
      }

      const { theme } = await response.json();

      // Validate all theme values before applying
      const validatedTheme: Theme = {};
      const invalidValues: string[] = [];

      for (const [key, value] of Object.entries(theme)) {
        if (key === 'radius') {
          validatedTheme[key] = validateRadius(value as number);
        } else if (key === 'font-sans' || key === 'font-mono') {
          // Handle fonts
          if (typeof value === 'string') {
            const normalized = normalizeFont(value);
            if (validateFont(normalized)) {
              validatedTheme[key as keyof Theme] = normalized;
            } else {
              invalidValues.push(`${key}: "${value}"`);
              console.warn(`Invalid font for ${key}:`, value, '-> normalized:', normalized);
            }
          }
        } else if (typeof value === 'string') {
          // Handle colors
          const normalized = normalizeColor(value);
          if (validateColor(normalized)) {
            validatedTheme[key as keyof Theme] = normalized;
          } else {
            invalidValues.push(`${key}: "${value}"`);
            console.warn(`Invalid color for ${key}:`, value, '-> normalized:', normalized);
          }
        }
      }

      // Only show error if we have invalid values AND we still have valid ones
      // If all are invalid, we'll show a different error below
      if (invalidValues.length > 0 && Object.keys(validatedTheme).length > 0) {
        setError(`Some values were invalid: ${invalidValues.slice(0, 2).join(', ')}${invalidValues.length > 2 ? '...' : ''}`);
      }

      if (Object.keys(validatedTheme).length === 0) {
        setError('No valid theme values were generated');
        return;
      }

      applyTheme(validatedTheme);
      setCurrentTheme(validatedTheme);
      saveThemeToStorage(validatedTheme);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate theme');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    resetTheme();
    setCurrentTheme(null);
    setError(null);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-1">Custom Theme</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Describe your ideal color scheme and AI will generate CSS variables
            </p>
          </div>

          <Textarea
            placeholder='e.g., "make it ugly", "word document style", "retro website", "hackery green terminal", "ocean blue with sunset accents"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !loading && prompt.trim()) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            rows={3}
            disabled={loading}
            className="text-sm"
          />

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={loading} size="sm" className="flex-1">
              {loading ? 'Generating...' : 'Generate'}
            </Button>
            {currentTheme && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={loading}
                size="sm"
              >
                Reset
              </Button>
            )}
          </div>

          {error && (
            <div className="text-destructive text-xs bg-destructive/10 p-2 rounded-md">
              {error}
            </div>
          )}

          {currentTheme && (
            <div className="pt-2 border-t space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Theme preview:</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <div
                        className="h-8 rounded border"
                        style={{ backgroundColor: 'var(--background)' }}
                      />
                      <p className="text-xs text-muted-foreground">BG</p>
                    </div>
                    <div className="space-y-1">
                      <div
                        className="h-8 rounded border"
                        style={{ backgroundColor: 'var(--primary)' }}
                      />
                      <p className="text-xs text-muted-foreground">Primary</p>
                    </div>
                    <div className="space-y-1">
                      <div
                        className="h-8 rounded border"
                        style={{ backgroundColor: 'var(--secondary)' }}
                      />
                      <p className="text-xs text-muted-foreground">Secondary</p>
                    </div>
                    <div className="space-y-1">
                      <div
                        className="h-8 rounded border"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                      <p className="text-xs text-muted-foreground">Accent</p>
                    </div>
                  </div>
                  {(currentTheme.card || currentTheme.popover || currentTheme.input || currentTheme.navbar) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      {currentTheme.navbar && (
                        <div className="space-y-1">
                          <div
                            className="h-6 rounded border"
                            style={{ backgroundColor: 'var(--navbar)' }}
                          />
                          <p className="text-xs text-muted-foreground">Navbar</p>
                        </div>
                      )}
                      {currentTheme.card && (
                        <div className="space-y-1">
                          <div
                            className="h-6 rounded border"
                            style={{ backgroundColor: 'var(--card)' }}
                          />
                          <p className="text-xs text-muted-foreground">Card</p>
                        </div>
                      )}
                      {currentTheme.popover && (
                        <div className="space-y-1">
                          <div
                            className="h-6 rounded border"
                            style={{ backgroundColor: 'var(--popover)' }}
                          />
                          <p className="text-xs text-muted-foreground">Popover</p>
                        </div>
                      )}
                      {currentTheme.input && (
                        <div className="space-y-1">
                          <div
                            className="h-6 rounded border"
                            style={{ backgroundColor: 'var(--input)' }}
                          />
                          <p className="text-xs text-muted-foreground">Input</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {(currentTheme['font-sans'] || currentTheme['font-mono']) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Fonts:</p>
                  <div className="space-y-1 text-xs">
                    {currentTheme['font-sans'] && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Sans:</span>
                        <span style={{ fontFamily: `var(--font-sans)` }}>
                          {currentTheme['font-sans']}
                        </span>
                      </div>
                    )}
                    {currentTheme['font-mono'] && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Mono:</span>
                        <span style={{ fontFamily: `var(--font-mono)` }}>
                          {currentTheme['font-mono']}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {currentTheme.radius !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Border radius: {currentTheme.radius}rem</p>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
