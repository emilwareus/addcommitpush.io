import { redirect } from 'next/navigation';

export const dynamic = 'error';
export const revalidate = false;

export default function PresentationIndex() {
  redirect('/presentations/write-code-ai-agents-love/01-title');
}
