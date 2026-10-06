import type { Metadata } from 'next';
import { Inter, Libre_Baskerville } from 'next/font/google';
import { PresentationLayout } from '@/components/presentations/shared/presentation-layout';
import { automateBasePath, getAllSlides } from '@/lib/presentations/automate';
import './oaiz-deck.css';

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-oz-serif',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-oz-sans',
});

export const metadata: Metadata = {
  title: 'Automate something important',
  robots: { index: false, follow: false },
};

export default function AutomateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`oz-deck ${libreBaskerville.variable} ${inter.variable}`}>
      <PresentationLayout basePath={automateBasePath} slides={getAllSlides()}>
        {children}
      </PresentationLayout>
    </div>
  );
}
