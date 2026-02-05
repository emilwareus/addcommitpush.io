'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllSlides,
  getSlideIndex,
  getAdjacentSlugs,
  getSlideSteps,
} from '@/lib/presentations/deep-research';

const SlideStepContext = createContext<number>(0);

export function useSlideStep() {
  return useContext(SlideStepContext);
}

function SlideStepProvider({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const currentSlug = pathname.split('/').pop() ?? '';
  const { prev, next } = getAdjacentSlugs(currentSlug);
  const maxSteps = getSlideSteps(currentSlug);
  const [step, setStep] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (step < maxSteps) {
          setStep((s) => s + 1);
        } else if (next) {
          router.push(`/presentations/deep-research/${next}`);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (step > 0) {
          setStep((s) => s - 1);
        } else if (prev) {
          router.push(`/presentations/deep-research/${prev}`);
        }
      }
    },
    [step, maxSteps, router, prev, next],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <SlideStepContext.Provider value={step}>
      {children}
    </SlideStepContext.Provider>
  );
}

export default function PresentationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const slides = getAllSlides();
  const currentSlug = pathname.split('/').pop() ?? '';
  const currentIndex = getSlideIndex(currentSlug);

  return (
    <div className="fixed inset-0 z-50 bg-background grid-bg overflow-hidden">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted/50 z-50">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{
            width: `${((currentIndex + 1) / slides.length) * 100}%`,
            boxShadow: '0 0 8px var(--primary), 0 0 16px var(--primary)',
          }}
        />
      </div>

      {/* Slide content with fade transition — key resets step state on route change */}
      <SlideStepProvider key={currentSlug} pathname={pathname}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full flex items-center justify-center"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </SlideStepProvider>

      {/* Slide counter */}
      <div className="fixed bottom-4 right-6 text-sm text-primary/40 z-50 font-mono">
        {currentIndex + 1} / {slides.length}
      </div>
    </div>
  );
}
