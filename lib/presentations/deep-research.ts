export interface Slide {
  slug: string;
  title: string;
  steps: number;
}

const slides: Slide[] = [
  { slug: '01-title', title: 'Learn to build Deep Research Agents', steps: 0 },
  { slug: '02-group-project', title: 'The Group Project Problem', steps: 1 },
  { slug: '03-the-result', title: 'The Result', steps: 0 },
  { slug: '04-the-reveal', title: 'The AI Connection', steps: 2 },
  { slug: '05-about', title: 'Emil Wåreus', steps: 0 },
  { slug: '06-audience-poll', title: 'Quick Poll', steps: 2 },
  { slug: '07-timeline', title: 'Evolution of Research Agents', steps: 1 },
  { slug: '08-cot', title: 'Chain-of-Thought: Show Your Work', steps: 2 },
  { slug: '09-react', title: 'ReAct: Reasoning + Acting', steps: 1 },
  { slug: '09-react-demo', title: 'Live Demo: ReAct', steps: 0 },
  { slug: '08-storm-intro', title: 'STORM: Multi-Perspective Research', steps: 1 },
  { slug: '09-storm-architecture', title: 'STORM: Four Phases', steps: 3 },
  { slug: '10-storm-demo', title: 'Live Demo: STORM', steps: 0 },
  { slug: '11-limitation', title: 'The Problem with Linear Pipelines', steps: 2 },
  { slug: '12-diffusion-insight', title: 'Research as Diffusion', steps: 1 },
  { slug: '13-diffusion-architecture', title: 'Diffusion Deep Research', steps: 0 },
  { slug: '14-loop-visualized', title: 'The Draft Evolves', steps: 0 },
  { slug: '15-parallel-agents', title: 'Parallel Research, Isolated Contexts', steps: 0 },
  { slug: '16-diffusion-demo', title: 'Live Demo: Diffusion', steps: 0 },
  { slug: '17-benchmarks', title: 'Why Diffusion Wins', steps: 0 },
  { slug: '18-takeaways', title: 'What You Can Apply Today', steps: 0 },
  { slug: '19-resources', title: 'Questions & Resources', steps: 0 },
];

export function getAllSlides(): Slide[] {
  return slides;
}

export function getSlideBySlug(slug: string): Slide | null {
  return slides.find((s) => s.slug === slug) ?? null;
}

export function getAllSlideSlugs(): string[] {
  return slides.map((s) => s.slug);
}

export function getSlideIndex(slug: string): number {
  return slides.findIndex((s) => s.slug === slug);
}

export function getAdjacentSlugs(slug: string): { prev: string | null; next: string | null } {
  const idx = getSlideIndex(slug);
  return {
    prev: idx > 0 ? slides[idx - 1].slug : null,
    next: idx < slides.length - 1 ? slides[idx + 1].slug : null,
  };
}

export function getSlideSteps(slug: string): number {
  return slides.find((s) => s.slug === slug)?.steps ?? 0;
}
