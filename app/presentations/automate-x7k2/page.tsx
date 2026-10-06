import { redirect } from 'next/navigation';
import { automateBasePath } from '@/lib/presentations/automate';

export const dynamic = 'error';
export const revalidate = false;

export default function AutomateIndex() {
  redirect(`${automateBasePath}/01-title`);
}
