import { type Slide, createSlideRegistry } from './types';

const slides: Slide[] = [
  { slug: '01-title', title: 'Write Code That AI Agents Love', steps: 0, section: 'Intro' },
  { slug: '02-about', title: 'About Emil', steps: 0, section: 'Intro' },
  { slug: '03-agentic-loop', title: 'The Agentic Loop', steps: 0, section: 'Map' },
  { slug: '04-agentic-loop-topics', title: 'Loop Topics', steps: 0, section: 'Map' },
  { slug: '05-agents-md', title: 'AGENTS.md', steps: 0, section: 'Prompt' },
  { slug: '06-architecture-docs', title: 'Architecture Docs', steps: 0, section: 'Orient' },
  { slug: '07-bounded-context', title: 'Bounded Context', steps: 0, section: 'Orient' },
  { slug: '08-subagents', title: 'Subagents', steps: 0, section: 'Retrieve' },
  { slug: '09-code-quality', title: 'Code Quality', steps: 0, section: 'Edit' },
  { slug: '10-code-quality-evidence', title: 'Code Quality Evidence', steps: 0, section: 'Edit' },
  {
    slug: '11-code-quality-structure',
    title: 'Code Quality Structure',
    steps: 5,
    section: 'Verify',
  },
  { slug: '12-generated-sdks', title: 'Generated SDKs', steps: 0, section: 'Edit' },
  { slug: '13-custom-rules', title: 'Custom Rules', steps: 0, section: 'Verify' },
  { slug: '14-impact-effort', title: 'Impact and Effort', steps: 0, section: 'Choose' },
  { slug: '15-close', title: 'Close', steps: 0, section: 'Close' },
];

const registry = createSlideRegistry(slides);

export type { Slide };
export const getAllSlides = registry.getAllSlides;
export const getSlideBySlug = registry.getSlideBySlug;
export const getAllSlideSlugs = registry.getAllSlideSlugs;
export const getSlideIndex = registry.getSlideIndex;
export const getAdjacentSlugs = registry.getAdjacentSlugs;
export const getSlideSteps = registry.getSlideSteps;
