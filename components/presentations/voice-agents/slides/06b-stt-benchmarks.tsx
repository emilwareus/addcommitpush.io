'use client';

import { useState } from 'react';

interface Model {
  name: string;
  family: string;
  params: number;
  werClean: number;
  latencyMs: number | null;
  rtfx: number | null;
  color: string;
  werSource: string;
  werUrl: string;
  speedSource: string;
  speedUrl: string;
}

// VERIFIED DATA ONLY -- every number links to an official primary source
const models: Model[] = [
  // Whisper -- WER & latency from Moonshine v2 paper (arXiv:2602.12241) Tables 2 & 3
  // Large-v3 WER from Whisper paper (arXiv:2212.04356) Table 2 (reports large-v2 at 2.7%)
  {
    name: 'Whisper tiny',
    family: 'Whisper',
    params: 39,
    werClean: 7.54,
    latencyMs: 289,
    rtfx: null,
    color: '#a78bfa',
    werSource: 'Moonshine v2 paper, Table 3',
    werUrl: 'https://arxiv.org/abs/2602.12241',
    speedSource: 'Moonshine v2 paper, Table 2 (faster-whisper, Apple M3)',
    speedUrl: 'https://arxiv.org/abs/2602.12241',
  },
  {
    name: 'Whisper base',
    family: 'Whisper',
    params: 74,
    werClean: 5.66,
    latencyMs: 553,
    rtfx: null,
    color: '#a78bfa',
    werSource: 'Moonshine v2 paper, Table 3',
    werUrl: 'https://arxiv.org/abs/2602.12241',
    speedSource: 'Moonshine v2 paper, Table 2 (faster-whisper, Apple M3)',
    speedUrl: 'https://arxiv.org/abs/2602.12241',
  },
  {
    name: 'Whisper small',
    family: 'Whisper',
    params: 244,
    werClean: 3.43,
    latencyMs: 1940,
    rtfx: null,
    color: '#a78bfa',
    werSource: 'Moonshine v2 paper, Table 3',
    werUrl: 'https://arxiv.org/abs/2602.12241',
    speedSource: 'Moonshine v2 paper, Table 2 (faster-whisper, Apple M3)',
    speedUrl: 'https://arxiv.org/abs/2602.12241',
  },
  {
    name: 'Whisper large-v3',
    family: 'Whisper',
    params: 1550,
    werClean: 2.7,
    latencyMs: 11286,
    rtfx: null,
    color: '#a78bfa',
    werSource: 'Whisper paper, Table 2 (large-v2)',
    werUrl: 'https://arxiv.org/abs/2212.04356',
    speedSource: 'Moonshine v2 paper, Table 2 (faster-whisper, Apple M3)',
    speedUrl: 'https://arxiv.org/abs/2602.12241',
  },
  // Moonshine v2 -- all from Moonshine v2 paper (arXiv:2602.12241) Tables 2 & 3
  {
    name: 'Moonshine v2 Tiny',
    family: 'Moonshine',
    params: 34,
    werClean: 4.49,
    latencyMs: 50,
    rtfx: null,
    color: '#34d399',
    werSource: 'Moonshine v2 paper, Table 3',
    werUrl: 'https://arxiv.org/abs/2602.12241',
    speedSource: 'Moonshine v2 paper, Table 2 (ONNX, Apple M3)',
    speedUrl: 'https://arxiv.org/abs/2602.12241',
  },
  {
    name: 'Moonshine v2 Small',
    family: 'Moonshine',
    params: 123,
    werClean: 2.49,
    latencyMs: 148,
    rtfx: null,
    color: '#34d399',
    werSource: 'Moonshine v2 paper, Table 3',
    werUrl: 'https://arxiv.org/abs/2602.12241',
    speedSource: 'Moonshine v2 paper, Table 2 (ONNX, Apple M3)',
    speedUrl: 'https://arxiv.org/abs/2602.12241',
  },
  {
    name: 'Moonshine v2 Medium',
    family: 'Moonshine',
    params: 245,
    werClean: 2.08,
    latencyMs: 258,
    rtfx: null,
    color: '#34d399',
    werSource: 'Moonshine v2 paper, Table 3',
    werUrl: 'https://arxiv.org/abs/2602.12241',
    speedSource: 'Moonshine v2 paper, Table 2 (ONNX, Apple M3)',
    speedUrl: 'https://arxiv.org/abs/2602.12241',
  },
  // NVIDIA NeMo -- WER from HuggingFace model cards, RTFx from model cards / Open ASR Leaderboard
  {
    name: 'Parakeet-TDT-1.1B',
    family: 'NVIDIA',
    params: 1100,
    werClean: 1.39,
    latencyMs: null,
    rtfx: null,
    color: '#38bdf8',
    werSource: 'HuggingFace model card',
    werUrl: 'https://huggingface.co/nvidia/parakeet-tdt-1.1b',
    speedSource: 'No official RTFx published',
    speedUrl: '',
  },
  {
    name: 'Parakeet-TDT-0.6B',
    family: 'NVIDIA',
    params: 600,
    werClean: 1.93,
    latencyMs: null,
    rtfx: 3332,
    color: '#38bdf8',
    werSource: 'HuggingFace model card',
    werUrl: 'https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3',
    speedSource: 'Open ASR Leaderboard paper, A100-SXM4-80GB',
    speedUrl: 'https://arxiv.org/abs/2510.06961',
  },
  {
    name: 'Canary-1B-v2',
    family: 'NVIDIA',
    params: 978,
    werClean: 2.18,
    latencyMs: null,
    rtfx: 749,
    color: '#38bdf8',
    werSource: 'HuggingFace model card',
    werUrl: 'https://huggingface.co/nvidia/canary-1b-v2',
    speedSource: 'HuggingFace model card / Open ASR Leaderboard, A100',
    speedUrl: 'https://huggingface.co/nvidia/canary-1b-v2',
  },
  {
    name: 'Canary-Qwen-2.5B',
    family: 'NVIDIA',
    params: 2500,
    werClean: 1.6,
    latencyMs: null,
    rtfx: 418,
    color: '#38bdf8',
    werSource: 'HuggingFace model card',
    werUrl: 'https://huggingface.co/nvidia/canary-qwen-2.5b',
    speedSource: 'HuggingFace model card / Open ASR Leaderboard, A100',
    speedUrl: 'https://huggingface.co/nvidia/canary-qwen-2.5b',
  },
  // Voxtral family -- WER from Voxtral arXiv paper (2507.13264) Table 3
  // Self-reported, not independently reproduced (community has requested eval code)
  {
    name: 'Voxtral Mini (3B)',
    family: 'Voxtral',
    params: 3000,
    werClean: 1.86,
    latencyMs: null,
    rtfx: null,
    color: '#fb923c',
    werSource: 'Voxtral paper, Table 3 (self-reported)',
    werUrl: 'https://arxiv.org/abs/2507.13264',
    speedSource: 'No official latency/RTFx published',
    speedUrl: '',
  },
  {
    name: 'Voxtral Small (24B)',
    family: 'Voxtral',
    params: 24000,
    werClean: 1.53,
    latencyMs: null,
    rtfx: null,
    color: '#fb923c',
    werSource: 'Voxtral paper, Table 3 (self-reported)',
    werUrl: 'https://arxiv.org/abs/2507.13264',
    speedSource: 'No official latency/RTFx published',
    speedUrl: '',
  },
];

type ViewMode = 'error-vs-speed' | 'params-vs-error' | 'error-vs-rtfx';

const views: { key: ViewMode; label: string; xLabel: string; yLabel: string }[] = [
  {
    key: 'error-vs-speed',
    label: 'Error vs Latency (M3)',
    xLabel: 'Latency ms on Apple M3 (lower is better)',
    yLabel: 'WER % LibriSpeech clean (lower is better)',
  },
  {
    key: 'params-vs-error',
    label: 'Size vs Error',
    xLabel: 'Parameters, log scale (smaller is better)',
    yLabel: 'WER % LibriSpeech clean (lower is better)',
  },
  {
    key: 'error-vs-rtfx',
    label: 'Error vs Throughput (A100)',
    xLabel: 'RTFx on A100 (higher is better)',
    yLabel: 'WER % LibriSpeech clean (lower is better)',
  },
];

function getModelsForView(view: ViewMode): Model[] {
  switch (view) {
    case 'error-vs-speed':
      return models.filter((m) => m.latencyMs !== null);
    case 'params-vs-error':
      return models;
    case 'error-vs-rtfx':
      return models.filter((m) => m.rtfx !== null);
  }
}

function getCoords(model: Model, view: ViewMode): { x: number; y: number } {
  switch (view) {
    case 'error-vs-speed':
      return { x: model.latencyMs!, y: model.werClean };
    case 'params-vs-error':
      return { x: model.params, y: model.werClean };
    case 'error-vs-rtfx':
      return { x: model.rtfx!, y: model.werClean };
  }
}

// params-vs-error uses log scale on X
function isLogX(view: ViewMode): boolean {
  return view === 'params-vs-error';
}

function getRange(view: ViewMode): { xMin: number; xMax: number; yMin: number; yMax: number } {
  switch (view) {
    case 'error-vs-speed':
      return { xMin: 0, xMax: 12000, yMin: 0, yMax: 9 };
    case 'params-vs-error':
      // Log scale: min=20M, max=30000M (covers 34M to 24000M with padding)
      return { xMin: 20, xMax: 30000, yMin: 0, yMax: 9 };
    case 'error-vs-rtfx':
      return { xMin: 0, xMax: 3600, yMin: 0, yMax: 4 };
  }
}

// Log-spaced ticks for params view
const LOG_PARAM_TICKS = [30, 100, 300, 1000, 3000, 10000, 30000];

function getTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(min + i * step));
}

function formatTick(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return String(val);
}

function formatParamTick(val: number): string {
  if (val >= 1000) return `${val / 1000}B`;
  return `${val}M`;
}

export function SttBenchmarksSlide() {
  const [view, setView] = useState<ViewMode>('params-vs-error');
  const [hovered, setHovered] = useState<string | null>(null);

  const currentView = views.find((v) => v.key === view)!;
  const visibleModels = getModelsForView(view);
  const range = getRange(view);
  const useLogX = isLogX(view);
  const xTicks = useLogX ? LOG_PARAM_TICKS : getTicks(range.xMin, range.xMax, 5);
  const yTicks = getTicks(range.yMin, range.yMax, 4);

  const chartLeft = 14;
  const chartRight = 95;
  const chartTop = 3;
  const chartBottom = 50;

  function toSvgX(val: number): number {
    if (useLogX) {
      const logMin = Math.log10(range.xMin);
      const logMax = Math.log10(range.xMax);
      const logVal = Math.log10(Math.max(val, range.xMin));
      return chartLeft + ((logVal - logMin) / (logMax - logMin)) * (chartRight - chartLeft);
    }
    return chartLeft + ((val - range.xMin) / (range.xMax - range.xMin)) * (chartRight - chartLeft);
  }

  function toSvgY(val: number): number {
    return (
      chartBottom - ((val - range.yMin) / (range.yMax - range.yMin)) * (chartBottom - chartTop)
    );
  }

  const hiddenCount = models.length - visibleModels.length;

  // Collect unique source URLs for visible models
  const sourceLinks = new Map<string, string>();
  for (const m of visibleModels) {
    if (m.werUrl) sourceLinks.set(m.werSource, m.werUrl);
    if (m.speedUrl) sourceLinks.set(m.speedSource, m.speedUrl);
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-6xl mx-auto px-8">
      <h2 className="text-3xl md:text-4xl font-bold mb-1 text-primary neon-glow text-center">
        STT Benchmarks: Open-Source Models
      </h2>

      <div className="flex items-center gap-4 mb-2">
        {/* View toggle buttons */}
        <div className="flex gap-2">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => {
                setView(v.key);
                setHovered(null);
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-mono transition-colors ${
                view === v.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {hiddenCount > 0 && (
          <span className="text-xs text-muted-foreground/60">
            {hiddenCount} hidden (no {view === 'error-vs-speed' ? 'M3 latency' : 'RTFx'} data)
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="w-full max-w-5xl aspect-[16/9] relative">
        <svg viewBox="0 0 100 62" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <line
              key={`y-${tick}`}
              x1={chartLeft}
              y1={toSvgY(tick)}
              x2={chartRight}
              y2={toSvgY(tick)}
              stroke="#27272a"
              strokeWidth="0.12"
            />
          ))}
          {xTicks.map((tick) => (
            <line
              key={`x-${tick}`}
              x1={toSvgX(tick)}
              y1={chartTop}
              x2={toSvgX(tick)}
              y2={chartBottom}
              stroke="#27272a"
              strokeWidth="0.12"
            />
          ))}

          {/* Axes */}
          <line
            x1={chartLeft}
            y1={chartBottom}
            x2={chartRight}
            y2={chartBottom}
            stroke="#52525b"
            strokeWidth="0.15"
          />
          <line
            x1={chartLeft}
            y1={chartTop}
            x2={chartLeft}
            y2={chartBottom}
            stroke="#52525b"
            strokeWidth="0.15"
          />

          {/* Y-axis ticks */}
          {yTicks.map((tick) => (
            <text
              key={`yl-${tick}`}
              x={chartLeft - 1}
              y={toSvgY(tick) + 0.5}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize="1.6"
            >
              {formatTick(tick)}
            </text>
          ))}

          {/* X-axis ticks */}
          {xTicks.map((tick) => (
            <text
              key={`xl-${tick}`}
              x={toSvgX(tick)}
              y={chartBottom + 2}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="1.6"
            >
              {useLogX ? formatParamTick(tick) : formatTick(tick)}
            </text>
          ))}

          {/* Axis labels */}
          <text
            x={(chartLeft + chartRight) / 2}
            y={chartBottom + 4.5}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="1.6"
            fontFamily="monospace"
          >
            {currentView.xLabel}
          </text>
          <text
            x={3}
            y={(chartTop + chartBottom) / 2}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="1.6"
            fontFamily="monospace"
            transform={`rotate(-90, 3, ${(chartTop + chartBottom) / 2})`}
          >
            {currentView.yLabel}
          </text>

          {/* Data points */}
          {visibleModels.map((model) => {
            const coords = getCoords(model, view);
            const cx = toSvgX(coords.x);
            const cy = toSvgY(coords.y);
            const isHovered = hovered === model.name;

            const refUrl = model.werUrl || model.speedUrl;
            return (
              <g
                key={model.name}
                onMouseEnter={() => setHovered(model.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => refUrl && window.open(refUrl, '_blank', 'noopener,noreferrer')}
                style={{ cursor: refUrl ? 'pointer' : 'default' }}
              >
                {/* Large invisible hit area */}
                <circle cx={cx} cy={cy} r={3} fill="transparent" />
                {isHovered && <circle cx={cx} cy={cy} r={4} fill={model.color} opacity={0.12} />}
                <circle cx={cx} cy={cy} r={isHovered ? 1.4 : 1} fill={model.color} opacity={0.9} />

                {/* Label next to dot */}
                <text
                  x={cx + 1.8}
                  y={cy + 0.5}
                  fontSize={isHovered ? '1.8' : '1.3'}
                  className={isHovered ? 'fill-white' : 'fill-muted-foreground'}
                  fontFamily="monospace"
                >
                  {model.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* HTML tooltip -- rendered outside SVG for proper sizing */}
        {hovered &&
          (() => {
            const model = visibleModels.find((m) => m.name === hovered);
            if (!model) return null;
            return (
              <div className="absolute top-4 right-4 bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-xl max-w-md z-10 scale-150 origin-top-right">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: model.color }} />
                  <span className="text-base font-bold text-white">{model.name}</span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {model.params}M params
                  </span>
                </div>
                <div className="space-y-1.5 text-sm font-mono">
                  <div>
                    <span className="text-muted-foreground">WER: </span>
                    <span className="text-white">{model.werClean}%</span>
                    <span className="text-muted-foreground"> -- </span>
                    {model.werUrl ? (
                      <a
                        href={model.werUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary/70 hover:text-primary hover:underline"
                      >
                        {model.werSource}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/60">{model.werSource}</span>
                    )}
                  </div>
                  <div>
                    {model.latencyMs !== null && (
                      <>
                        <span className="text-muted-foreground">Latency: </span>
                        <span className="text-white">{model.latencyMs}ms</span>
                        <span className="text-muted-foreground"> (M3)</span>
                      </>
                    )}
                    {model.rtfx !== null && (
                      <>
                        {model.latencyMs !== null && (
                          <span className="text-muted-foreground"> | </span>
                        )}
                        <span className="text-muted-foreground">RTFx: </span>
                        <span className="text-white">{model.rtfx}x</span>
                        <span className="text-muted-foreground"> (A100)</span>
                      </>
                    )}
                    {model.latencyMs === null && model.rtfx === null && (
                      <span className="text-muted-foreground/60">No official speed data</span>
                    )}
                  </div>
                  {model.speedUrl && (
                    <div>
                      <a
                        href={model.speedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary/70 hover:text-primary hover:underline text-xs"
                      >
                        {model.speedSource}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
      </div>

      {/* Legend + Sources */}
      <div className="flex items-center justify-between w-full max-w-5xl mt-1">
        <div className="flex gap-5">
          {[
            { family: 'Whisper', color: '#a78bfa' },
            { family: 'Moonshine', color: '#34d399' },
            { family: 'NVIDIA NeMo', color: '#38bdf8' },
            { family: 'Voxtral', color: '#fb923c' },
          ].map((f) => (
            <div key={f.family} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
              <span className="text-sm font-mono text-muted-foreground">{f.family}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 text-xs font-mono">
          <a
            href="https://arxiv.org/abs/2602.12241"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/50 hover:text-primary hover:underline"
          >
            Moonshine v2 paper
          </a>
          <a
            href="https://arxiv.org/abs/2212.04356"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/50 hover:text-primary hover:underline"
          >
            Whisper paper
          </a>
          <a
            href="https://arxiv.org/abs/2510.06961"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/50 hover:text-primary hover:underline"
          >
            Open ASR Leaderboard
          </a>
          <a
            href="https://huggingface.co/nvidia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/50 hover:text-primary hover:underline"
          >
            NVIDIA HF cards
          </a>
          <a
            href="https://arxiv.org/abs/2507.13264"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/50 hover:text-primary hover:underline"
          >
            Voxtral paper
          </a>
        </div>
      </div>
    </div>
  );
}
