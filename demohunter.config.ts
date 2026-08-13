const demoHunterConfig = {
  baseURL: 'http://127.0.0.1:3000',
  outputDir: '.demohunter',
  cacheDir: '.demohunter/cache',
  viewport: { width: 1440, height: 900 },
  holdPaddingMs: 450,
  record: {
    showActions: false,
    showChapters: true,
    showCursor: true,
    showClickRipple: true,
    highlightStyle: 'ring',
  },
  tts: {
    provider: 'openai',
    model: 'gpt-4o-mini-tts',
    voice: 'marin',
    format: 'mp3',
    instructions: 'Speak clearly, warmly, and naturally for a polished product demo.',
  },
};

export default demoHunterConfig;
