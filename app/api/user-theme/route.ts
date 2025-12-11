import { NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';
import { z } from 'zod';

// Helper to normalize color strings
function normalizeColorString(color: string): string {
  return color
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[;,]+$/, '')
    .trim();
}

// Helper to normalize font strings (preserve commas in font stacks)
function normalizeFontString(font: string): string {
  let normalized = font.trim();
  // Remove outer quotes but preserve inner structure
  normalized = normalized.replace(/^["']|["']$/g, '');
  // Fix mismatched quotes
  normalized = normalized.replace(/'/g, "'").replace(/"/g, '"');
  // Clean up spacing around commas
  normalized = normalized.replace(/\s*,\s*/g, ', ');
  return normalized.trim();
}

const themeSchema = z.object({
  background: z.string().describe('Main background color'),
  foreground: z.string().describe('Main text/foreground color'),
  primary: z.string().describe('Primary action color (buttons, links)'),
  'primary-foreground': z.string().describe('Text color on primary background'),
  secondary: z.string().describe('Secondary action color'),
  'secondary-foreground': z.string().describe('Text color on secondary background'),
  accent: z.string().describe('Accent/highlight color'),
  'accent-foreground': z.string().describe('Text color on accent background'),
  muted: z.string().describe('Muted/subtle background color'),
  'muted-foreground': z.string().describe('Text color on muted background'),
  border: z.string().describe('Border color'),
  ring: z.string().describe('Focus ring color'),
  card: z.string().optional().describe('Card component background color'),
  'card-foreground': z.string().optional().describe('Card text color'),
  popover: z.string().optional().describe('Popover/dropdown background color'),
  'popover-foreground': z.string().optional().describe('Popover text color'),
  input: z.string().optional().describe('Input field background color'),
  navbar: z.string().optional().describe('Navigation bar background color'),
  'navbar-foreground': z.string().optional().describe('Navigation bar text color (for links)'),
  'navbar-border': z.string().optional().describe('Navigation bar border color'),
  'navbar-active': z.string().optional().describe('Navigation bar active link color'),
  'navbar-hover': z.string().optional().describe('Navigation bar hover color'),
  sidebar: z.string().optional().describe('Sidebar background color'),
  'sidebar-foreground': z.string().optional().describe('Sidebar text color'),
  'sidebar-primary': z.string().optional().describe('Sidebar primary color'),
  'sidebar-primary-foreground': z.string().optional().describe('Sidebar primary text color'),
  'sidebar-accent': z.string().optional().describe('Sidebar accent color'),
  'sidebar-accent-foreground': z.string().optional().describe('Sidebar accent text color'),
  'sidebar-border': z.string().optional().describe('Sidebar border color'),
  'sidebar-ring': z.string().optional().describe('Sidebar focus ring color'),
  radius: z
    .number()
    .min(0)
    .max(24)
    .describe('Border radius in rem (0 = sharp corners, 24 = very rounded)'),
  'font-sans': z.string().optional().describe('Sans-serif font stack'),
  'font-mono': z.string().optional().describe('Monospace font stack'),
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const openrouter = createOpenRouter({
      apiKey,
    });

    const { object: theme } = await generateObject({
      model: openrouter('google/gemini-2.5-flash-lite'),
      schema: themeSchema,
      prompt: `You are a creative UI/UX designer generating a complete theme based on this user request: "${prompt}"

INTERPRET THE REQUEST CREATIVELY:
- "Make it ugly" → Use clashing colors, poor contrast, garish combinations, Comic Sans font
- "Make it look like a word document" → White background, black text, Times New Roman, minimal styling, sharp corners
- "Make it feel like a retro website" → 90s/2000s aesthetic, bright colors, pixel fonts, low contrast, nostalgic palette
- "Make it feel hackery, green text terminal" → Dark green/black terminal aesthetic, monospace fonts, matrix green (#00ff00), minimal UI
- "Make it professional" → Clean, muted colors, high contrast, modern fonts, subtle styling
- "Make it playful" → Bright, vibrant colors, rounded corners, fun fonts
- "Make it dark and moody" → Deep dark backgrounds, muted accents, atmospheric
- "Make it corporate" → Blues and grays, conservative fonts, high contrast, professional

COLOR FORMAT REQUIREMENTS:
- Use oklch() format (preferred): oklch(L C H) where L=lightness 0-1, C=chroma 0-0.4, H=hue 0-360
- Or hex: #rrggbb or #rgb
- Or rgb/rgba: rgb(r, g, b) or rgba(r, g, b, a)
- Or hsl/hsla: hsl(h, s%, l%) or hsla(h, s%, l%, a)
- Or named colors: red, blue, green, etc. (use sparingly)
- NO quotes, semicolons, or extra characters - just the raw color value

THEME COMPONENTS TO GENERATE:

1. Core colors (REQUIRED):
   - background: Main page background
   - foreground: Main text color
   - primary: Buttons, links, primary actions
   - primary-foreground: Text on primary buttons
   - secondary: Secondary buttons/actions
   - secondary-foreground: Text on secondary buttons
   - accent: Highlights, accents
   - accent-foreground: Text on accent elements
   - muted: Subtle backgrounds
   - muted-foreground: Text on muted backgrounds
   - border: Border colors
   - ring: Focus ring color

2. NAVIGATION BAR COLORS (CRITICAL - MUST BE INCLUDED):
   The navigation bar is a prominent UI element at the top of every page. It should have distinct colors that match the theme aesthetic.
   - navbar: Navigation bar background color (the bar itself at the top)
   - navbar-foreground: Navigation bar text color for inactive/normal links
   - navbar-border: Navigation bar bottom border/separator color
   - navbar-active: Navigation bar active/selected link color (currently active page)
   - navbar-hover: Navigation bar hover color (when user hovers over links)
   
   IMPORTANT NAVBAR GUIDELINES:
   - The navbar should be visually distinct from the main background
   - For "word document": navbar should be white or light gray
   - For "hackery terminal": navbar should be black or very dark green
   - For "ugly": navbar can be bright, clashing colors
   - For "retro": navbar should match the retro aesthetic (bright, saturated)
   - navbar-active should stand out clearly from navbar-foreground
   - navbar-hover should provide clear visual feedback

3. Component colors (OPTIONAL but recommended):
   - card: Card component backgrounds
   - card-foreground: Card text
   - popover: Dropdown/popover backgrounds
   - popover-foreground: Popover text
   - input: Input field backgrounds
   - sidebar: Sidebar background (if applicable)
   - sidebar-foreground: Sidebar text
   - sidebar-primary: Sidebar primary elements
   - sidebar-primary-foreground: Sidebar primary text
   - sidebar-accent: Sidebar accents
   - sidebar-accent-foreground: Sidebar accent text
   - sidebar-border: Sidebar borders
   - sidebar-ring: Sidebar focus rings

3. Typography (OPTIONAL):
   - font-sans: Sans-serif font stack (e.g., "Times New Roman, serif" for Word doc, "Courier New, monospace" for terminal)
   - font-mono: Monospace font stack (e.g., "Courier New, monospace" for retro/terminal)

4. Styling:
   - radius: Border radius 0-24 rem (0 = sharp/sharp corners, 8-12 = modern rounded, 24 = very rounded)

DESIGN PRINCIPLES:
- Match the aesthetic described in the prompt exactly
- ALWAYS include navbar colors - the navigation bar is a critical UI element
- For "ugly": Use clashing colors, poor contrast, inappropriate fonts, bright/garish navbar
- For "word document": White/off-white background, black text, serif fonts, radius 0, light navbar (white/light gray)
- For "retro": Bright saturated colors, pixel fonts, nostalgic palette, medium radius, colorful navbar matching retro aesthetic
- For "hackery terminal": Dark green/black, monospace everything, matrix aesthetic, sharp corners, dark navbar (black/dark green) with green text
- For "professional": Clean, muted colors, subtle navbar that complements but doesn't distract
- For "playful": Bright navbar colors that match the playful theme
- Ensure all colors are valid CSS color values
- Create a cohesive theme that matches the requested aesthetic
- The navbar should be visually distinct and match the overall theme style

EXAMPLES:
- Word document: 
  background=#ffffff, foreground=#000000, navbar=#f5f5f5, navbar-foreground=#666666, navbar-active=#000000, navbar-border=#e0e0e0, font-sans="Times New Roman, serif", radius=0
  
- Terminal hackery: 
  background=#000000, foreground=#00ff00, navbar=#001100, navbar-foreground=#00ff00, navbar-active=#00ff00, navbar-border=#003300, navbar-hover=#00ff00, font-sans="Courier New, monospace", font-mono="Courier New, monospace", radius=0
  
- Retro: 
  background=#ff00ff, foreground=#ffff00, navbar=#00ffff, navbar-foreground=#000000, navbar-active=#ff00ff, navbar-border=#0000ff, radius=8
  
- Ugly: 
  background=#ff00ff, foreground=#00ff00, navbar=#ffff00, navbar-foreground=#ff0000, navbar-active=#0000ff, navbar-border=#ff00ff, Use clashing colors, Comic Sans if possible`,
    });

    // Normalize all strings after generation
    const normalizedTheme = Object.fromEntries(
      Object.entries(theme).map(([key, value]) => [
        key,
        typeof value === 'string'
          ? key === 'font-sans' || key === 'font-mono'
            ? normalizeFontString(value)
            : normalizeColorString(value)
          : value,
      ])
    );

    return NextResponse.json({ theme: normalizedTheme });
  } catch (error) {
    console.error('Error generating theme:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate theme',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
