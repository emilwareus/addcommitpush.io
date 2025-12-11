'use client';

import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const stored = loadThemeFromStorage();
    if (stored) {
      setCurrentTheme(stored);
      applyTheme(stored);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        setError(
          `Some values were invalid: ${invalidValues.slice(0, 2).join(', ')}${invalidValues.length > 2 ? '...' : ''}`
        );
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

  const contentSpacing = isMobile ? 'space-y-3' : 'space-y-4';
  const content = (
    <div className={contentSpacing}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary shadow-sm ring-1 ring-primary/30">
          <Palette className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-sm">Custom Theme</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Personalize my blog with... AI?
          </p>
        </div>
      </div>

      <Textarea
        placeholder='e.g., "retro website", "hackery green terminal", "ocean blue with sunset accents"'
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !loading && prompt.trim()) {
            e.preventDefault();
            handleGenerate();
          }
        }}
        rows={isMobile ? 2 : 3}
        disabled={loading}
        className="text-sm resize-none rounded-lg border-border/60 bg-background/60 backdrop-blur-sm"
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleGenerate} disabled={loading} size="sm" className="flex-1">
          {loading ? 'Generating...' : 'Generate'}
        </Button>
        {currentTheme && (
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            Reset
          </Button>
        )}
      </div>

      {error && (
        <div className="text-destructive text-xs bg-destructive/10 p-2 rounded-md border border-destructive/30">
          {error}
        </div>
      )}

      {currentTheme && (
        <div className="pt-2 border-t border-border/60 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Theme preview</p>
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <div
                    className="h-8 rounded border"
                    style={{ backgroundColor: 'var(--background)' }}
                  />
                  <p className="text-xs text-muted-foreground text-center">BG</p>
                </div>
                <div className="space-y-1">
                  <div
                    className="h-8 rounded border"
                    style={{ backgroundColor: 'var(--primary)' }}
                  />
                  <p className="text-xs text-muted-foreground text-center">Primary</p>
                </div>
                <div className="space-y-1">
                  <div
                    className="h-8 rounded border"
                    style={{ backgroundColor: 'var(--secondary)' }}
                  />
                  <p className="text-xs text-muted-foreground text-center">Secondary</p>
                </div>
                <div className="space-y-1">
                  <div
                    className="h-8 rounded border"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                  <p className="text-xs text-muted-foreground text-center">Accent</p>
                </div>
              </div>
              {(currentTheme.card ||
                currentTheme.popover ||
                currentTheme.input ||
                currentTheme.navbar) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  {currentTheme.navbar && (
                    <div className="space-y-1">
                      <div
                        className="h-6 rounded border"
                        style={{ backgroundColor: 'var(--navbar)' }}
                      />
                      <p className="text-xs text-muted-foreground text-center">Navbar</p>
                    </div>
                  )}
                  {currentTheme.card && (
                    <div className="space-y-1">
                      <div
                        className="h-6 rounded border"
                        style={{ backgroundColor: 'var(--card)' }}
                      />
                      <p className="text-xs text-muted-foreground text-center">Card</p>
                    </div>
                  )}
                  {currentTheme.popover && (
                    <div className="space-y-1">
                      <div
                        className="h-6 rounded border"
                        style={{ backgroundColor: 'var(--popover)' }}
                      />
                      <p className="text-xs text-muted-foreground text-center">Popover</p>
                    </div>
                  )}
                  {currentTheme.input && (
                    <div className="space-y-1">
                      <div
                        className="h-6 rounded border"
                        style={{ backgroundColor: 'var(--input)' }}
                      />
                      <p className="text-xs text-muted-foreground text-center">Input</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {(currentTheme['font-sans'] || currentTheme['font-mono']) && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Fonts</p>
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
              <p className="text-xs text-muted-foreground mb-1">
                Border radius: {currentTheme.radius}rem
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="w-full">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between rounded-xl border border-border/50 bg-card/80"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Theme
          </span>
          <span className="text-xs text-muted-foreground">{open ? 'Hide' : 'Show'}</span>
        </Button>
        {open && (
          <div className="mt-3 rounded-xl border border-border/60 bg-card/95 p-3 shadow-md shadow-primary/10 backdrop-blur-sm max-h-[55vh] overflow-auto">
            {content}
          </div>
        )}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-[26rem] p-5" align="end">
        {content}
      </PopoverContent>
    </Popover>
  );
}
