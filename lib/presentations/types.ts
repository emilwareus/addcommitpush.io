export interface Slide {
  slug: string;
  title: string;
  steps: number;
  section?: string;
}

export function createSlideRegistry(slides: Slide[]) {
  return {
    getAllSlides: () => slides,
    getSlideBySlug: (slug: string) => slides.find((s) => s.slug === slug) ?? null,
    getAllSlideSlugs: () => slides.map((s) => s.slug),
    getSlideIndex: (slug: string) => slides.findIndex((s) => s.slug === slug),
    getAdjacentSlugs: (slug: string) => {
      const idx = slides.findIndex((s) => s.slug === slug);
      return {
        prev: idx > 0 ? slides[idx - 1].slug : null,
        next: idx < slides.length - 1 ? slides[idx + 1].slug : null,
      };
    },
    getSlideSteps: (slug: string) => slides.find((s) => s.slug === slug)?.steps ?? 0,
  };
}
