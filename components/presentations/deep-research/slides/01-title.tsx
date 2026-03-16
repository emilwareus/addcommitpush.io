'use client';

import { TitleSlide as SharedTitleSlide } from '@/components/presentations/shared/title-slide';

export function TitleSlide() {
  return (
    <SharedTitleSlide
      title="Learn to build Deep Research Agents"
      subtitle="Malmö AI Devs &middot; Slagthuset"
      speaker="Emil Wåreus &middot; Feb 5, 2026"
    />
  );
}
