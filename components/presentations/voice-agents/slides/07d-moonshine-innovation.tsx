export function MoonshineInnovationSlide() {
  const latencyRows = [
    { model: 'Moonshine v2 Tiny', params: '34M', latency: '50ms', vs: '5.8x faster than Whisper Tiny', highlight: false },
    { model: 'Moonshine v2 Small', params: '123M', latency: '148ms', vs: '13.1x faster than Whisper Small', highlight: true },
    { model: 'Moonshine v2 Medium', params: '245M', latency: '258ms', vs: '43.7x faster than Whisper Large-v3', highlight: false },
  ];

  const diffs = [
    { feature: 'Audio input', whisper: 'Mel spectrogram (STFT + filterbank)', moonshine: 'Raw waveform (learned frontend)' },
    { feature: 'Input length', whisper: 'Fixed 30s, zero-padded', moonshine: 'Variable length, no padding' },
    { feature: 'Encoder attention', whisper: 'Full O(T\u00B2)', moonshine: 'Sliding window O(T*w)' },
    { feature: 'Position encoding', whisper: 'Fixed sinusoidal', moonshine: 'None (ergodic)' },
    { feature: 'Streaming', whisper: 'Not native', moonshine: 'Native 5-stage ONNX pipeline' },
    { feature: 'Languages', whisper: '99 languages', moonshine: '8 languages' },
    { feature: 'Runtime', whisper: 'PyTorch', moonshine: 'ONNX Runtime (C++, mmap)' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-6xl mx-auto px-8">
      <h2 className="text-3xl md:text-4xl font-bold mb-3 text-primary neon-glow text-center">
        Why Moonshine Matters for Voice Agents
      </h2>

      <p className="text-base text-muted-foreground mb-5 text-center max-w-3xl">
        Bounded, constant TTFT regardless of utterance length
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-5">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-lg font-bold text-primary mb-3">Latency Comparison (Apple M3)</h3>

          <div className="space-y-2">
            {latencyRows.map((row) => (
              <div
                key={row.model}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                  row.highlight
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-zinc-950/40 border-zinc-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${row.highlight ? 'text-primary' : 'text-zinc-300'}`}>
                      {row.model}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-muted-foreground">
                      {row.params}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{row.vs}</span>
                </div>
                <span className={`text-lg font-mono font-bold shrink-0 ${row.highlight ? 'text-primary' : 'text-zinc-300'}`}>
                  {row.latency}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary/90 text-center">
            Medium beats Whisper Large-v3 accuracy at lower latency than Whisper Tiny
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-lg font-bold text-primary mb-3">Key Differences vs Whisper</h3>

          <div className="space-y-1">
            {diffs.map((d) => (
              <div key={d.feature} className="grid grid-cols-[90px_1fr_1fr] gap-2 px-2 py-1.5 rounded text-xs even:bg-zinc-950/40">
                <span className="font-semibold text-zinc-400">{d.feature}</span>
                <span className="text-muted-foreground">{d.whisper}</span>
                <span className="text-primary">{d.moonshine}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-[90px_1fr_1fr] gap-2 px-2 text-[10px] text-zinc-500">
            <span />
            <span>Whisper</span>
            <span>Moonshine v2</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-primary/80 font-mono text-center max-w-4xl">
        For Jarvis: Moonshine v2 Small could replace faster-whisper with 13x lower latency,
        similar accuracy, and no Python dependency.
      </p>
    </div>
  );
}
