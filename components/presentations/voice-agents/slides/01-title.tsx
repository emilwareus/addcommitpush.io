'use client';

import { TitleSlide as SharedTitleSlide } from '@/components/presentations/shared/title-slide';

export function TitleSlide() {
  return (
    <SharedTitleSlide
      title="Building Real-Time Voice Agents"
      subtitle="Malmö AI Devs"
      speaker="Emil Wåreus"
    />
  );
}
