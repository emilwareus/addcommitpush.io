import { redirect } from 'next/navigation';

export const dynamic = 'error';

export default function PresentationIndex() {
  redirect('/presentations/deep-research/01-title');
}
