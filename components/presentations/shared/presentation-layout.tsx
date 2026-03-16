'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Slide } from '@/lib/presentations/types';

const SlideStepContext = createContext<number>(0);

export function useSlideStep() {
  return useContext(SlideStepContext);
}

function SlideStepProvider({
  pathname,
  basePath,
  slides,
  children,
}: {
  pathname: string;
  basePath: string;
  slides: Slide[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const currentSlug = pathname.split('/').pop() ?? '';

  const idx = slides.findIndex((s) => s.slug === currentSlug);
  const prev = idx > 0 ? slides[idx - 1].slug : null;
  const next = idx < slides.length - 1 ? slides[idx + 1].slug : null;
  const maxSteps = slides.find((s) => s.slug === currentSlug)?.steps ?? 0;

  const [step, setStep] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (step < maxSteps) {
          setStep((s) => s + 1);
        } else if (next) {
          router.push(`${basePath}/${next}`);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (step > 0) {
          setStep((s) => s - 1);
        } else if (prev) {
          router.push(`${basePath}/${prev}`);
        }
      }
    },
    [step, maxSteps, router, prev, next, basePath],
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

interface PresentationLayoutProps {
  children: React.ReactNode;
  basePath: string;
  slides: Slide[];
  sidebar?: React.ReactNode;
}

export function PresentationLayout({
  children,
  basePath,
  slides,
  sidebar,
}: PresentationLayoutProps) {
  const pathname = usePathname();
  const currentSlug = pathname.split('/').pop() ?? '';
  const currentIndex = slides.findIndex((s) => s.slug === currentSlug);

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

      <div className="h-full flex">
        {/* Slide content with fade transition */}
        <div className="flex-1 h-full">
          <SlideStepProvider
            key={currentSlug}
            pathname={pathname}
            basePath={basePath}
            slides={slides}
          >
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
        </div>

        {/* Optional sidebar */}
        {sidebar}
      </div>

      {/* Slide counter */}
      <div className="fixed bottom-4 right-6 text-sm text-primary/40 z-50 font-mono">
        {currentIndex + 1} / {slides.length}
      </div>
    </div>
  );
}
