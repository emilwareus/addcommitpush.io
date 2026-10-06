'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

const canvasWidth = 1600;
const canvasHeight = 900;

// Slides are designed on a 1600x900 canvas and scaled to fit the viewport, so they
// render the same on a laptop, a projector and a TV. The background is painted once on
// the full viewport. Scenery that must reach the screen edges (sun, sea, palms) goes in
// `backdrop`: a layer at the same scale that stretches to the whole screen, so scenery
// anchored with left/right/bottom sticks to the real screen edges at any aspect ratio.
export function OzStage({
  background,
  backgroundStyle,
  backdrop,
  children,
}: {
  background: string;
  backgroundStyle?: CSSProperties;
  backdrop?: ReactNode;
  children?: ReactNode;
}) {
  const [viewport, setViewport] = useState({ width: canvasWidth, height: canvasHeight });

  useEffect(() => {
    const measure = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const scale = Math.min(viewport.width / canvasWidth, viewport.height / canvasHeight);

  return (
    <div className={`oz-viewport ${background}`} style={backgroundStyle}>
      {backdrop ? (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 overflow-hidden"
          style={{
            width: viewport.width / scale,
            height: viewport.height / scale,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {backdrop}
        </div>
      ) : null}
      {children ? (
        <div className="oz-canvas" style={{ transform: `scale(${scale})` }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
