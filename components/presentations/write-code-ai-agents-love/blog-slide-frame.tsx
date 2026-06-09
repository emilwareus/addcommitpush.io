'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

const slideWidth = 1360;
const slideHeight = 850;
const minimumReadableWidth = 640;

export function BlogSlideFrame({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(slideWidth);
  const maxWidth = compact ? 780 : 1120;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setFrameWidth(entry.contentRect.width);
    });

    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const displayWidth = Math.min(slideWidth, Math.max(frameWidth, minimumReadableWidth));
  const scale = displayWidth / slideWidth;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    frame.scrollLeft = Math.max((displayWidth - frameWidth) / 2, 0);
  }, [displayWidth, frameWidth]);

  return (
    <div
      ref={frameRef}
      data-blog-slide-frame
      className={`not-prose relative left-1/2 -translate-x-1/2 overflow-x-auto overflow-y-hidden rounded-lg bg-background ${
        compact ? 'my-0' : 'my-10'
      }`}
      style={{ width: `min(${maxWidth}px, calc(100vw - 2rem))`, height: slideHeight * scale }}
    >
      <div
        className="origin-top-left"
        style={{
          width: slideWidth,
          height: slideHeight,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
      <style jsx global>{`
        [data-blog-slide-frame] [data-source-link],
        [data-blog-slide-frame] [data-slide-claim] {
          display: none;
        }
      `}</style>
    </div>
  );
}
