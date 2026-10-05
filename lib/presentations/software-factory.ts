import { type Slide, createSlideRegistry } from './types';

const slides: Slide[] = [
  { slug: '00-title', title: 'The software factory 0.1', steps: 0, section: 'Intro' },
  { slug: '00-who-i-am', title: 'Who I Am', steps: 0, section: 'Intro' },
  { slug: '01-old-way', title: 'Build the Process', steps: 0, section: 'Intro' },
  { slug: '01-build-the-machine', title: 'Build the Machine', steps: 0, section: 'Intro' },
  { slug: '02-craft', title: 'The Craft Is Not Dead', steps: 4, section: 'Intro' },
  { slug: '03-leverage', title: 'The Leverage', steps: 0, section: 'Leverage' },
  { slug: '04-architecture', title: 'Architecture', steps: 0, section: 'Code' },
  { slug: '04-code-quality', title: 'Code Quality', steps: 0, section: 'Code' },
  { slug: '05-lint', title: 'Lint Your Codebase', steps: 0, section: 'Code' },
  { slug: '05b-lint-structure', title: 'Lint the Shape', steps: 0, section: 'Code' },
  { slug: '06-test-hard', title: 'Test Hard What Can Be Tested Hard', steps: 0, section: 'Code' },
  { slug: '06b-generated-sdks', title: 'Generated SDKs', steps: 0, section: 'Code' },
  { slug: '07a-feedback-loops', title: 'Feedback Loops', steps: 0, section: 'Workflow' },
  { slug: '07-specdd', title: 'Spec-Driven Development', steps: 0, section: 'Workflow' },
  { slug: '08-server', title: 'Get a Server. Let It Run', steps: 0, section: 'Workflow' },
  { slug: '09-visibility', title: 'Give the Agent Visibility', steps: 0, section: 'Workflow' },
  { slug: '10-short-cycles', title: 'Where Do You Wait?', steps: 0, section: 'Product' },
  { slug: '10b-build-to-learn', title: 'Build to Learn', steps: 0, section: 'Product' },
  { slug: '11-focus', title: 'Know What Not to Build', steps: 0, section: 'Product' },
  { slug: '12-close', title: 'Build the Machine', steps: 0, section: 'Product' },
];

const registry = createSlideRegistry(slides);

export const getAllSlides = registry.getAllSlides;
export const getSlideBySlug = registry.getSlideBySlug;
export const getAllSlideSlugs = registry.getAllSlideSlugs;
