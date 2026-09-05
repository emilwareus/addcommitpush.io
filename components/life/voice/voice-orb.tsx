'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { BAND_COUNT, SILENT_BANDS, type VoiceLevelMeter } from './voice-level-meter';
import type { VoiceActivity } from './use-realtime-voice-session';

const SIZE = 184;
const RING_RADIUS = 62;
const MAX_BAR_LENGTH = 26;
const BAR_WIDTH = 2.5;
/** Radians per millisecond for the "thinking" sweep. */
const SWEEP_SPEED = 0.0022;

/**
 * Draws the live spectrum of whichever side is talking. It samples the meter on
 * every animation frame and never re-renders React, so a loud conversation costs
 * nothing beyond the canvas.
 */
export function VoiceOrb({
  activity,
  meterRef,
  children,
}: {
  activity: VoiceActivity;
  meterRef: RefObject<VoiceLevelMeter | null>;
  children: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const idle = activity === 'idle';

  // Re-runs on every activity change, which is a handful of times per session.
  // Both the colour and the sampled source are therefore resolved once here
  // rather than inside the frame loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const pixelRatio = window.devicePixelRatio;
    canvas.width = SIZE * pixelRatio;
    canvas.height = SIZE * pixelRatio;
    context.scale(pixelRatio, pixelRatio);

    // Reading a computed style forces a synchronous style recalculation of the
    // document, so it must not happen per frame.
    const color = window.getComputedStyle(canvas).color;
    const source = activity === 'assistant_speaking' ? 'assistant' : 'microphone';

    let frame = 0;
    const draw = (timestamp: number) => {
      // An idle orb is a still image: paint one resting frame and stop.
      if (!idle) frame = window.requestAnimationFrame(draw);
      const meter = meterRef.current;
      const reading = idle || !meter ? { level: 0, bands: SILENT_BANDS } : meter.sample(source);

      context.clearRect(0, 0, SIZE, SIZE);
      context.strokeStyle = color;
      context.fillStyle = color;

      const center = SIZE / 2;
      const coreRadius = RING_RADIUS * (0.55 + reading.level * 0.16);

      context.globalAlpha = 0.1;
      context.beginPath();
      context.arc(center, center, coreRadius, 0, Math.PI * 2);
      context.fill();

      context.globalAlpha = 0.35;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(center, center, RING_RADIUS, 0, Math.PI * 2);
      context.stroke();

      context.lineWidth = BAR_WIDTH;
      context.lineCap = 'round';
      for (let bar = 0; bar < BAND_COUNT; bar += 1) {
        // Mirror the spectrum across the vertical axis so the orb reads as one shape.
        const half = BAND_COUNT / 2;
        const band = bar < half ? bar : BAND_COUNT - 1 - bar;
        const magnitude = reading.bands[band];
        if (magnitude < 0.02) continue;
        const angle = (bar / BAND_COUNT) * Math.PI * 2 - Math.PI / 2;
        const inner = RING_RADIUS + 3;
        const outer = inner + magnitude * MAX_BAR_LENGTH;
        context.globalAlpha = 0.35 + magnitude * 0.65;
        context.beginPath();
        context.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner);
        context.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer);
        context.stroke();
      }

      if (activity === 'thinking') {
        const sweepStart = timestamp * SWEEP_SPEED;
        context.globalAlpha = 0.9;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(center, center, RING_RADIUS + 8, sweepStart, sweepStart + Math.PI / 3);
        context.stroke();
      }

      context.globalAlpha = 1;
    };

    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [activity, idle, meterRef]);

  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: SIZE, height: SIZE }}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 ${ORB_COLORS[activity]}`}
        style={{ width: SIZE, height: SIZE }}
      />
      <div className="relative grid size-20 place-items-center rounded-full border border-border bg-card">
        {children}
      </div>
    </div>
  );
}

const ORB_COLORS: Record<VoiceActivity, string> = {
  idle: 'text-muted-foreground',
  listening: 'text-muted-foreground',
  user_speaking: 'text-primary',
  thinking: 'text-muted-foreground',
  assistant_speaking: 'text-success',
};
