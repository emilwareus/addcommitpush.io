'use client';

import { ResourcesSlide as SharedResourcesSlide } from '@/components/presentations/shared/resources-slide';

const resources = [
  {
    label: 'Blog post (code walkthrough)',
    url: 'addcommitpush.io/blog/diffusion-deep-research',
  },
  {
    label: 'Reference implementation (Diffusion)',
    url: 'github.com/thinkdepthai/Deep_Research',
  },
  {
    label: 'STORM (Stanford)',
    url: 'github.com/stanford-oval/storm',
  },
  {
    label: 'DeepResearch Bench Leaderboard',
    url: 'huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard',
  },
];

export function ResourcesSlide() {
  return (
    <SharedResourcesSlide resources={resources} footer="Emil Wåreus &middot; addcommitpush.io" />
  );
}
