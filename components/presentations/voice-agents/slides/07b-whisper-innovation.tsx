export function WhisperInnovationSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-6xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-3 text-primary neon-glow text-center">
        Why Whisper Changed Everything
      </h2>

      <p className="text-xl text-muted-foreground mb-6 text-center max-w-4xl">
        Scaling weakly supervised pretraining to 680K hours eliminated the need for
        dataset-specific fine-tuning
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-6">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-2xl font-bold text-primary mb-4">The Innovation</h3>

          <div className="space-y-4 text-base text-muted-foreground">
            <div>
              <div className="font-semibold text-zinc-400 mb-1">Before Whisper</div>
              <p>
                Train on ~1K hours of clean data. Fine-tune per domain. Build separate inverse
                text normalization pipelines for punctuation and formatting.
              </p>
            </div>

            <div>
              <div className="font-semibold text-primary mb-1">Whisper&apos;s approach</div>
              <p>
                680K hours of noisy internet audio. Zero-shot across domains, accents, noise.
                Punctuation and formatting learned directly from the data.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary">
                WER within 1pp of human transcribers
              </span>
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary">
                55% error reduction vs supervised on OOD
              </span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-primary/30 rounded-xl p-5">
          <h3 className="text-2xl font-bold text-primary mb-4">
            The Limitation for Voice Agents
          </h3>

          <div className="space-y-3">
            {[
              {
                label: 'Fixed 30s window',
                desc: 'A 2-second command still processes 30 seconds of mel spectrogram',
              },
              {
                label: 'O(T\u00B2) encoder attention',
                desc: 'TTFT grows quadratically with utterance length',
              },
              {
                label: 'No native streaming',
                desc: 'Must wait for the full utterance before decoding begins',
              },
              {
                label: 'Autoregressive decoder',
                desc: 'Sequential token generation adds latency per token',
              },
            ].map((item) => (
              <div key={item.label} className="flex gap-3 items-start">
                <div className="mt-1 w-2 h-2 rounded-full bg-red-400/80 shrink-0" />
                <div>
                  <span className="text-base font-semibold text-zinc-300">{item.label}</span>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800">
            <p className="text-sm text-muted-foreground">
              On an Apple M3, Whisper Small takes <span className="text-primary font-mono">1940ms</span> per
              utterance. Whisper Large-v3 takes <span className="text-primary font-mono">11.3s</span>.
            </p>
          </div>
        </div>
      </div>

      <p className="text-lg text-primary/80 font-mono text-center max-w-4xl">
        These exact limitations are what Moonshine v2 was designed to solve.
      </p>
    </div>
  );
}
