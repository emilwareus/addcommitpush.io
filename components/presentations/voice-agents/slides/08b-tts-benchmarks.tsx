'use client';

import { useState } from 'react';

interface Model {
  name: string;
  family: string;
  params: number;
  utmos: number | null;
  wer: number | null;
  rtf: number | null;
  color: string;
  qualitySource: string;
  qualityUrl: string;
  speedSource: string;
  speedUrl: string;
}

// VERIFIED DATA ONLY -- every number links to an official primary source
const models: Model[] = [
  // Kokoro-82M -- RTF from community benchmark gist, no UTMOS published
  {
    name: 'Kokoro-82M', family: 'Kokoro', params: 82, utmos: null, wer: null, rtf: 0.2,
    color: '#f472b6',
    qualitySource: 'No official UTMOS published',
    qualityUrl: '',
    speedSource: 'Benchmark gist (32-vCPU AMD EPYC, CPU)',
    speedUrl: 'https://gist.github.com/efemaer/23d9a3b949b751dde315192b4dcf0653',
  },
  {
    name: 'Kokoro-82M (A10G)', family: 'Kokoro', params: 82, utmos: null, wer: null, rtf: 0.0104,
    color: '#f472b6',
    qualitySource: 'No official UTMOS published',
    qualityUrl: '',
    speedSource: 'Benchmark gist (A10G GPU)',
    speedUrl: 'https://gist.github.com/efemaer/23d9a3b949b751dde315192b4dcf0653',
  },
  // F5-TTS -- all from arXiv 2410.06885
  {
    name: 'F5-TTS (32 NFE)', family: 'F5-TTS', params: 336, utmos: 3.90, wer: 2.42, rtf: 0.31,
    color: '#a78bfa',
    qualitySource: 'F5-TTS paper, Table 1 & 5 (LibriSpeech-PC)',
    qualityUrl: 'https://arxiv.org/abs/2410.06885',
    speedSource: 'F5-TTS paper (RTX 3090, 10s speech)',
    speedUrl: 'https://arxiv.org/abs/2410.06885',
  },
  {
    name: 'F5-TTS (16 NFE)', family: 'F5-TTS', params: 336, utmos: 3.88, wer: 2.53, rtf: 0.15,
    color: '#a78bfa',
    qualitySource: 'F5-TTS paper, Table 1 & 5 (LibriSpeech-PC)',
    qualityUrl: 'https://arxiv.org/abs/2410.06885',
    speedSource: 'F5-TTS paper (RTX 3090, 10s speech)',
    speedUrl: 'https://arxiv.org/abs/2410.06885',
  },
  // Spark-TTS -- from arXiv 2503.01710
  {
    name: 'Spark-TTS', family: 'Spark-TTS', params: 500, utmos: 4.35, wer: 1.98, rtf: null,
    color: '#34d399',
    qualitySource: 'Spark-TTS paper, Table 4 & 5 (LibriSpeech/Seed-TTS)',
    qualityUrl: 'https://arxiv.org/abs/2503.01710',
    speedSource: 'No official RTF published',
    speedUrl: '',
  },
  // XTTS v2 -- from arXiv 2406.04904
  {
    name: 'XTTS v2', family: 'XTTS', params: 482, utmos: 4.007, wer: null, rtf: null,
    color: '#fb923c',
    qualitySource: 'XTTS paper, Table 2 (English zero-shot)',
    qualityUrl: 'https://arxiv.org/abs/2406.04904',
    speedSource: 'No official RTF published',
    speedUrl: '',
  },
  // Fish Audio S2 -- from arXiv 2603.08823
  {
    name: 'Fish Audio S2', family: 'Fish Audio', params: 4400, utmos: null, wer: 0.99, rtf: 0.195,
    color: '#38bdf8',
    qualitySource: 'Fish Audio S2 report (Seed-TTS-Eval en)',
    qualityUrl: 'https://arxiv.org/abs/2603.08823',
    speedSource: 'Fish Audio S2 report (H200, SGLang)',
    speedUrl: 'https://arxiv.org/abs/2603.08823',
  },
  // Fish Speech v1.5 -- from arXiv 2411.01156
  {
    name: 'Fish Speech v1.5', family: 'Fish Audio', params: 500, utmos: null, wer: 6.89, rtf: 0.2,
    color: '#38bdf8',
    qualitySource: 'Fish Speech paper, Table 1',
    qualityUrl: 'https://arxiv.org/abs/2411.01156',
    speedSource: 'Fish Speech paper (RTX 4060 Mobile, ~1:5)',
    speedUrl: 'https://arxiv.org/abs/2411.01156',
  },
  // Dia -- from GitHub README benchmark table (RTX 4090, fp16 + torch.compile)
  // 2.2x real-time means RTF = 1/2.2 = 0.45
  {
    name: 'Dia', family: 'Dia', params: 1600, utmos: null, wer: null, rtf: 0.45,
    color: '#facc15',
    qualitySource: 'No official quality benchmarks',
    qualityUrl: '',
    speedSource: 'GitHub README (RTX 4090, fp16 + torch.compile)',
    speedUrl: 'https://github.com/nari-labs/dia',
  },
  // Piper -- third-party estimates
  {
    name: 'Piper', family: 'Piper', params: 20, utmos: null, wer: null, rtf: 0.2,
    color: '#94a3b8',
    qualitySource: 'No official quality benchmarks',
    qualityUrl: '',
    speedSource: 'Third-party estimate (CPU)',
    speedUrl: 'https://github.com/rhasspy/piper',
  },
];

type ViewMode = 'utmos-vs-params' | 'wer-vs-params' | 'rtf-vs-params';

const views: { key: ViewMode; label: string; xLabel: string; yLabel: string }[] = [
  { key: 'utmos-vs-params', label: 'Quality vs Size', xLabel: 'Parameters, log scale', yLabel: 'UTMOS (higher is better)' },
  { key: 'wer-vs-params', label: 'Intelligibility vs Size', xLabel: 'Parameters, log scale', yLabel: 'WER % (lower is better)' },
  { key: 'rtf-vs-params', label: 'Speed vs Size', xLabel: 'Parameters, log scale', yLabel: 'RTF (lower is faster)' },
];

function getModelsForView(view: ViewMode): Model[] {
  switch (view) {
    case 'utmos-vs-params':
      return models.filter((m) => m.utmos !== null);
    case 'wer-vs-params':
      return models.filter((m) => m.wer !== null);
    case 'rtf-vs-params':
      return models.filter((m) => m.rtf !== null);
  }
}

function getCoords(model: Model, view: ViewMode): { x: number; y: number } {
  switch (view) {
    case 'utmos-vs-params':
      return { x: model.params, y: model.utmos! };
    case 'wer-vs-params':
      return { x: model.params, y: model.wer! };
    case 'rtf-vs-params':
      return { x: model.params, y: model.rtf! };
  }
}

function getRange(view: ViewMode): { xMin: number; xMax: number; yMin: number; yMax: number } {
  switch (view) {
    case 'utmos-vs-params':
      return { xMin: 100, xMax: 1000, yMin: 3.5, yMax: 4.6 };
    case 'wer-vs-params':
      return { xMin: 100, xMax: 6000, yMin: 0, yMax: 8 };
    case 'rtf-vs-params':
      return { xMin: 10, xMax: 6000, yMin: 0, yMax: 0.55 };
  }
}

const LOG_TICKS_QUALITY = [100, 200, 300, 500, 800];
const LOG_TICKS_WER = [100, 200, 500, 1000, 2000, 5000];
const LOG_TICKS_SPEED = [10, 30, 100, 300, 1000, 3000];

function getXTicks(view: ViewMode): number[] {
  switch (view) {
    case 'utmos-vs-params': return LOG_TICKS_QUALITY;
    case 'wer-vs-params': return LOG_TICKS_WER;
    case 'rtf-vs-params': return LOG_TICKS_SPEED;
  }
}

function getYTicks(view: ViewMode): number[] {
  switch (view) {
    case 'utmos-vs-params': return [3.5, 3.7, 3.9, 4.1, 4.3, 4.5];
    case 'wer-vs-params': return [0, 2, 4, 6, 8];
    case 'rtf-vs-params': return [0, 0.1, 0.2, 0.3, 0.4, 0.5];
  }
}

function formatParamTick(val: number): string {
  if (val >= 1000) return `${(val / 1000)}B`;
  return `${val}M`;
}

function formatYTick(val: number, view: ViewMode): string {
  if (view === 'utmos-vs-params') return val.toFixed(1);
  if (view === 'wer-vs-params') return val.toFixed(0) + '%';
  return val.toFixed(1);
}

export function TtsBenchmarksSlide() {
  const [view, setView] = useState<ViewMode>('utmos-vs-params');
  const [hovered, setHovered] = useState<string | null>(null);

  const currentView = views.find((v) => v.key === view)!;
  const visibleModels = getModelsForView(view);
  const range = getRange(view);
  const xTicks = getXTicks(view);
  const yTicks = getYTicks(view);

  const chartLeft = 14;
  const chartRight = 95;
  const chartTop = 3;
  const chartBottom = 50;

  function toSvgX(val: number): number {
    const logMin = Math.log10(range.xMin);
    const logMax = Math.log10(range.xMax);
    const logVal = Math.log10(Math.max(val, range.xMin));
    return chartLeft + ((logVal - logMin) / (logMax - logMin)) * (chartRight - chartLeft);
  }

  function toSvgY(val: number): number {
    return chartBottom - ((val - range.yMin) / (range.yMax - range.yMin)) * (chartBottom - chartTop);
  }

  const hiddenCount = models.length - visibleModels.length;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-6xl mx-auto px-8">
      <h2 className="text-3xl md:text-4xl font-bold mb-1 text-primary neon-glow text-center">
        TTS Benchmarks: Open-Source Models
      </h2>

      <div className="flex items-center gap-4 mb-2">
        <div className="flex gap-2">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => { setView(v.key); setHovered(null); }}
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
            {hiddenCount} hidden (no data for this view)
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="w-full max-w-5xl aspect-[16/9] relative">
        <svg viewBox="0 0 100 62" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <line key={`y-${tick}`} x1={chartLeft} y1={toSvgY(tick)} x2={chartRight} y2={toSvgY(tick)} stroke="#27272a" strokeWidth="0.12" />
          ))}
          {xTicks.map((tick) => (
            <line key={`x-${tick}`} x1={toSvgX(tick)} y1={chartTop} x2={toSvgX(tick)} y2={chartBottom} stroke="#27272a" strokeWidth="0.12" />
          ))}

          {/* Axes */}
          <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#52525b" strokeWidth="0.15" />
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#52525b" strokeWidth="0.15" />

          {/* Y-axis ticks */}
          {yTicks.map((tick) => (
            <text key={`yl-${tick}`} x={chartLeft - 1} y={toSvgY(tick) + 0.5} textAnchor="end" className="fill-muted-foreground" fontSize="1.6">
              {formatYTick(tick, view)}
            </text>
          ))}

          {/* X-axis ticks */}
          {xTicks.map((tick) => (
            <text key={`xl-${tick}`} x={toSvgX(tick)} y={chartBottom + 2} textAnchor="middle" className="fill-muted-foreground" fontSize="1.6">
              {formatParamTick(tick)}
            </text>
          ))}

          {/* Axis labels */}
          <text x={(chartLeft + chartRight) / 2} y={chartBottom + 4.5} textAnchor="middle" className="fill-muted-foreground" fontSize="1.6" fontFamily="monospace">
            {currentView.xLabel}
          </text>
          <text x={3} y={(chartTop + chartBottom) / 2} textAnchor="middle" className="fill-muted-foreground" fontSize="1.6" fontFamily="monospace" transform={`rotate(-90, 3, ${(chartTop + chartBottom) / 2})`}>
            {currentView.yLabel}
          </text>

          {/* Ground truth line for UTMOS */}
          {view === 'utmos-vs-params' && (
            <>
              <line x1={chartLeft} y1={toSvgY(4.08)} x2={chartRight} y2={toSvgY(4.08)} stroke="#34d399" strokeWidth="0.12" strokeDasharray="0.5 0.3" />
              <text x={chartRight - 1} y={toSvgY(4.08) - 0.8} textAnchor="end" className="fill-emerald-400/70" fontSize="1.3" fontFamily="monospace">
                Ground truth (4.08)
              </text>
            </>
          )}

          {/* Data points */}
          {visibleModels.map((model) => {
            const coords = getCoords(model, view);
            const cx = toSvgX(coords.x);
            const cy = toSvgY(coords.y);
            const isHovered = hovered === model.name;

            const refUrl = model.qualityUrl || model.speedUrl;
            return (
              <g
                key={model.name}
                onMouseEnter={() => setHovered(model.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => refUrl && window.open(refUrl, '_blank', 'noopener,noreferrer')}
                style={{ cursor: refUrl ? 'pointer' : 'default' }}
              >
                <circle cx={cx} cy={cy} r={3} fill="transparent" />
                {isHovered && <circle cx={cx} cy={cy} r={4} fill={model.color} opacity={0.12} />}
                <circle cx={cx} cy={cy} r={isHovered ? 1.4 : 1} fill={model.color} opacity={0.9} />

                <text x={cx + 1.8} y={cy + 0.5} fontSize={isHovered ? '1.8' : '1.3'} className={isHovered ? 'fill-white' : 'fill-muted-foreground'} fontFamily="monospace">
                  {model.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* HTML tooltip */}
        {hovered && (() => {
          const model = visibleModels.find((m) => m.name === hovered);
          if (!model) return null;
          return (
            <div className="absolute top-4 right-4 bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-xl max-w-md z-10 scale-150 origin-top-right">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: model.color }} />
                <span className="text-base font-bold text-white">{model.name}</span>
                <span className="text-sm font-mono text-muted-foreground">{model.params}M params</span>
              </div>
              <div className="space-y-1.5 text-sm font-mono">
                {model.utmos !== null && (
                  <div>
                    <span className="text-muted-foreground">UTMOS: </span>
                    <span className="text-white">{model.utmos}</span>
                    {model.qualityUrl && (
                      <>
                        <span className="text-muted-foreground"> -- </span>
                        <a href={model.qualityUrl} target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary hover:underline">
                          {model.qualitySource}
                        </a>
                      </>
                    )}
                  </div>
                )}
                {model.wer !== null && (
                  <div>
                    <span className="text-muted-foreground">WER: </span>
                    <span className="text-white">{model.wer}%</span>
                    {model.qualityUrl && (
                      <>
                        <span className="text-muted-foreground"> -- </span>
                        <a href={model.qualityUrl} target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary hover:underline">
                          {model.qualitySource}
                        </a>
                      </>
                    )}
                  </div>
                )}
                {model.rtf !== null && (
                  <div>
                    <span className="text-muted-foreground">RTF: </span>
                    <span className="text-white">{model.rtf}</span>
                    <span className="text-muted-foreground"> ({model.rtf < 1 ? `${(1/model.rtf).toFixed(0)}x real-time` : 'slower than real-time'})</span>
                    {model.speedUrl && (
                      <>
                        <span className="text-muted-foreground"> -- </span>
                        <a href={model.speedUrl} target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary hover:underline text-xs">
                          {model.speedSource}
                        </a>
                      </>
                    )}
                  </div>
                )}
                {model.utmos === null && model.wer === null && model.rtf === null && (
                  <span className="text-muted-foreground/60">No official benchmarks published</span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Legend + Sources */}
      <div className="flex items-center justify-between w-full max-w-5xl mt-1">
        <div className="flex gap-4 flex-wrap">
          {[
            { family: 'Kokoro', color: '#f472b6' },
            { family: 'F5-TTS', color: '#a78bfa' },
            { family: 'Spark-TTS', color: '#34d399' },
            { family: 'XTTS v2', color: '#fb923c' },
            { family: 'Fish Audio', color: '#38bdf8' },
            { family: 'Dia', color: '#facc15' },
            { family: 'Piper', color: '#94a3b8' },
          ].map((f) => (
            <div key={f.family} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
              <span className="text-sm font-mono text-muted-foreground">{f.family}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 text-xs font-mono">
          <a href="https://arxiv.org/abs/2410.06885" target="_blank" rel="noopener noreferrer" className="text-primary/50 hover:text-primary hover:underline">F5-TTS</a>
          <a href="https://arxiv.org/abs/2503.01710" target="_blank" rel="noopener noreferrer" className="text-primary/50 hover:text-primary hover:underline">Spark-TTS</a>
          <a href="https://arxiv.org/abs/2406.04904" target="_blank" rel="noopener noreferrer" className="text-primary/50 hover:text-primary hover:underline">XTTS v2</a>
          <a href="https://arxiv.org/abs/2603.08823" target="_blank" rel="noopener noreferrer" className="text-primary/50 hover:text-primary hover:underline">Fish Audio S2</a>
        </div>
      </div>
    </div>
  );
}
