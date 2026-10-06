import { redirect } from 'next/navigation';

export const dynamic = 'error';
export const revalidate = false;

export default function PresentationIndex() {
  redirect('/presentations/software-factory/00-title');
}
