'use client';

import { ResourcesSlide as SharedResourcesSlide } from '@/components/presentations/shared/resources-slide';

const resources = [
  {
    label: 'faster-whisper',
    url: 'github.com/SYSTRAN/faster-whisper',
  },
  {
    label: 'kokoro-onnx',
    url: 'github.com/thewh1teagle/kokoro-onnx',
  },
  {
    label: 'Silero VAD',
    url: 'github.com/snakers4/silero-vad',
  },
  {
    label: 'Groq API',
    url: 'console.groq.com/docs',
  },
  {
    label: 'Podidex — Talk to your podcast',
    url: 'podidex.com',
  },
];

export function ResourcesSlide() {
  return (
    <SharedResourcesSlide
      resources={resources}
      footer="Emil Wåreus &middot; addcommitpush.io"
    />
  );
}
