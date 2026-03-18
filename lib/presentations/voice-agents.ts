import { type Slide, createSlideRegistry } from './types';

const slides: Slide[] = [
  { slug: '01-title', title: 'Building Real-Time Voice Agents', steps: 0 },
  { slug: '02-about', title: 'Emil Wåreus', steps: 0 },
  { slug: '03-the-dream', title: '"Hey Jarvis..." — What We\'re Building', steps: 0 },
  { slug: '04-architecture-overview', title: 'The Voice Agent Pipeline', steps: 0 },
  { slug: '05-vad', title: 'Voice Activity Detection', steps: 0 },
  { slug: '06-stt-landscape', title: 'Open-Source STT Landscape', steps: 0 },
  { slug: '06b-stt-benchmarks', title: 'STT Benchmarks', steps: 0 },
  { slug: '07-whisper-deep-dive', title: 'Whisper: How It Works', steps: 0 },
  { slug: '07b-whisper-innovation', title: 'Why Whisper Changed Everything', steps: 0 },
  { slug: '07c-moonshine-deep-dive', title: 'Moonshine v2: How It Works', steps: 0 },
  { slug: '07d-moonshine-innovation', title: 'Why Moonshine Matters for Voice Agents', steps: 0 },
  { slug: '08-tts-landscape', title: 'Open-Source TTS Landscape', steps: 0 },
  { slug: '08b-tts-benchmarks', title: 'TTS Benchmarks', steps: 0 },
  { slug: '09-kokoro-deep-dive', title: 'Kokoro: How Inference Works', steps: 0 },
  { slug: '09b-kokoro-core-ideas', title: 'Why 82M Still Sounds Good', steps: 0 },
  { slug: '10-realtime-transport', title: 'Transport: WebSocket vs WebRTC', steps: 0 },
  { slug: '15-resources', title: 'Questions & Resources', steps: 0 },
];

const registry = createSlideRegistry(slides);

export type { Slide };
export const getAllSlides = registry.getAllSlides;
export const getSlideBySlug = registry.getSlideBySlug;
export const getAllSlideSlugs = registry.getAllSlideSlugs;
export const getSlideIndex = registry.getSlideIndex;
export const getAdjacentSlugs = registry.getAdjacentSlugs;
export const getSlideSteps = registry.getSlideSteps;
