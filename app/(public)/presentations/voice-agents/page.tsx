import { redirect } from 'next/navigation';

export const dynamic = 'error';

export default function PresentationIndex() {
  redirect('/presentations/voice-agents/01-title');
}
