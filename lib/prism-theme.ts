import type { PrismTheme } from 'prism-react-renderer';

interface BlogPrismPalette {
  background: string;
  foreground: string;
  primary: string;
  mutedForeground: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

function createBlogPrismTheme(palette: BlogPrismPalette): PrismTheme {
  return {
    plain: {
      color: palette.foreground,
      backgroundColor: palette.background,
    },
    styles: [
      {
        types: ['prolog', 'comment'],
        style: { color: palette.mutedForeground },
      },
      {
        types: ['keyword', 'interpolation-punctuation', 'function', 'class-name'],
        style: { color: palette.primary },
      },
      {
        types: ['string', 'attr-value', 'template-punctuation', 'selector', 'inserted'],
        style: { color: palette.success },
      },
      {
        types: ['number', 'constant'],
        style: { color: palette.warning },
      },
      {
        types: ['builtin', 'tag'],
        style: { color: palette.info },
      },
      {
        types: ['deleted', 'changed'],
        style: { color: palette.danger },
      },
      {
        types: ['attr-name', 'variable', 'punctuation', 'operator'],
        style: { color: palette.foreground },
      },
    ],
  };
}

export const blogLight = createBlogPrismTheme({
  background: '#e4edf2',
  foreground: '#123f63',
  primary: '#1268a8',
  mutedForeground: '#326d9d',
  success: '#236f4e',
  warning: '#7a5a00',
  danger: '#a62626',
  info: '#1268a8',
});

export const blogDark = createBlogPrismTheme({
  background: '#102033',
  foreground: '#d7e9f8',
  primary: '#82c2f4',
  mutedForeground: '#a9cbe8',
  success: '#8bd6aa',
  warning: '#f3d376',
  danger: '#ff9a9a',
  info: '#82c2f4',
});
