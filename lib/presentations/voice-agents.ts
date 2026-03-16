import { type Slide, createSlideRegistry } from './types';

const slides: Slide[] = [
  { slug: '01-title', title: 'Building Real-Time Voice Agents', steps: 0 },
  { slug: '02-about', title: 'Emil Wåreus', steps: 0 },
  { slug: '03-the-dream', title: '"Hey Jarvis..." — What We\'re Building', steps: 1 },
  { slug: '04-architecture-overview', title: 'The Voice Agent Pipeline', steps: 3 },
  { slug: '05-stt-landscape', title: 'Speech-to-Text: The Ears', steps: 2 },
  { slug: '06-whisper-deep-dive', title: 'Whisper: How It Works', steps: 2 },
  { slug: '07-tts-landscape', title: 'Text-to-Speech: The Voice', steps: 2 },
  { slug: '08-kokoro-deep-dive', title: 'Kokoro-82M: Fast & Open TTS', steps: 2 },
  { slug: '09-vad', title: 'Voice Activity Detection', steps: 2 },
  { slug: '10-realtime-transport', title: 'Making It Feel Real-Time', steps: 3 },
  { slug: '11-latency-budget', title: 'The Latency Budget', steps: 2 },
  { slug: '12-podidex-architecture', title: 'Podidex: Talk to Your Podcast', steps: 2 },
  { slug: '13-podidex-demo', title: 'Live Demo: Podidex Voice Chat', steps: 0 },
  { slug: '14-homegrown-vs-api', title: 'Homegrown vs API: Trade-offs', steps: 2 },
  { slug: '15-code-walkthrough', title: "Let's Build It", steps: 0 },
  { slug: '16-jarvis-reveal', title: '"Jarvis, what have we talked about?"', steps: 0 },
  { slug: '17-how-jarvis-works', title: 'How Jarvis Was Built', steps: 2 },
  { slug: '18-takeaways', title: 'What You Can Build Today', steps: 0 },
  { slug: '19-resources', title: 'Questions & Resources', steps: 0 },
];

const registry = createSlideRegistry(slides);

export type { Slide };
export const getAllSlides = registry.getAllSlides;
export const getSlideBySlug = registry.getSlideBySlug;
export const getAllSlideSlugs = registry.getAllSlideSlugs;
export const getSlideIndex = registry.getSlideIndex;
export const getAdjacentSlugs = registry.getAdjacentSlugs;
export const getSlideSteps = registry.getSlideSteps;
