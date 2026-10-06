import { type Slide, createSlideRegistry } from './types';

// Unlisted deck: not linked from /presentations, not in the sitemap, served with noindex.
export const automateBasePath = '/presentations/automate-x7k2';

const slides: Slide[] = [
  { slug: '01-title', title: 'Automate something important', steps: 0 },
  { slug: '02-what-we-do', title: 'What we do', steps: 0 },
  { slug: '03-what-oaiz-is', title: 'What OAIZ is', steps: 0 },
  { slug: '04-chat-to-workflow', title: 'From a sentence to a workflow', steps: 4 },
  { slug: '05-agent-fit', title: 'Pick the agent by the problem', steps: 6 },
  { slug: '06-event-queue', title: 'Every change becomes an event', steps: 10 },
  { slug: '07-two-builds', title: 'Now we build two', steps: 0 },
  { slug: '08-live-archive', title: 'Ask the archive. Get the page.', steps: 0 },
  { slug: '09-live-colleague', title: 'An AI colleague for the product manager', steps: 0 },
  { slug: '10-same-blocks', title: 'Same blocks. Different work.', steps: 0 },
  { slug: '11-where-we-are', title: 'Let humans do human work', steps: 0 },
  { slug: '12-questions', title: 'What would you automate first?', steps: 0 },
];

const registry = createSlideRegistry(slides);

export const getAllSlides = registry.getAllSlides;
export const getSlideBySlug = registry.getSlideBySlug;
export const getAllSlideSlugs = registry.getAllSlideSlugs;
