import Image from 'next/image';

export function KokoroCoreIdeasSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-3xl md:text-4xl font-bold mb-3 text-primary neon-glow text-center">
        Why 82M Still Sounds Good
      </h2>

      <p className="text-lg text-muted-foreground mb-3 text-center max-w-4xl">
        The model is compact because it decomposes the job and spends most parameters in the
        vocoder, where waveform quality is hardest.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
        <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm">
          <span className="font-semibold text-primary">256d style vector</span>{' '}
          conditions both timbre and prosody
        </div>
        <div className="px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-sm text-muted-foreground">
          Voice packs replace runtime diffusion at inference
        </div>
      </div>

      <div className="w-full max-w-5xl mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[0.9fr_auto_1.15fr_auto_1.25fr] gap-4 items-stretch">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
            <div className="text-sm font-mono text-primary/70 mb-2">Stage 1</div>
            <h3 className="text-xl font-bold text-primary mb-2">Raw Text → G2P → Phonemes</h3>
            <div className="inline-flex px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-700 text-xs font-mono text-muted-foreground mb-2">
              external G2P
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kokoro starts with raw text, then a grapheme-to-phoneme step converts spelling
              into units of sound.
            </p>
            <p className="mt-3 text-sm font-mono text-primary/80">&quot;cat&quot; → G2P → k ae t</p>
          </div>

          <div className="hidden md:flex items-center justify-center text-4xl text-primary/50">→</div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
            <div className="text-sm font-mono text-primary/70 mb-2">Stage 2</div>
            <h3 className="text-xl font-bold text-primary mb-3">Context + Prosody</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="relative rounded-lg border border-zinc-700 bg-zinc-950/40 p-2 pr-28">
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-[10px] font-mono text-blue-300 whitespace-nowrap">
                  pre-trained / fine-tuned
                </div>
                <div className="text-sm font-mono text-primary/80 mb-1">6.3M + 0.39M</div>
                <div className="text-base font-semibold mb-1">PLBERT + Projection</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Transformer context over phonemes
                </p>
              </div>
              <div className="relative rounded-lg border border-zinc-700 bg-zinc-950/40 p-2 pr-28">
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-[10px] font-mono text-emerald-300 whitespace-nowrap">
                  trained end-to-end
                </div>
                <div className="text-sm font-mono text-primary/80 mb-1">5.6M</div>
                <div className="text-base font-semibold mb-1">TextEncoder</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Embedding + Conv1d + BiLSTM acoustic path
                </p>
              </div>
              <div className="relative rounded-lg border border-primary/30 bg-primary/5 p-2 pr-28">
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-[10px] font-mono text-emerald-300 whitespace-nowrap">
                  trained end-to-end
                </div>
                <div className="text-sm font-mono text-primary/80 mb-1">16.2M</div>
                <div className="text-base font-semibold mb-1">Prosody Predictor</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Explicitly predicts duration, pitch contour, and energy.
                </p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center text-4xl text-primary/50">→</div>

          <div className="relative bg-primary/10 border border-primary/30 rounded-xl p-3 pr-24">
            <div className="text-sm font-mono text-primary/70 mb-2">Stage 3</div>
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-[10px] font-mono text-emerald-300 whitespace-nowrap">
              trained end-to-end
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Decoder / iSTFTNet</h3>
            <div className="text-sm font-mono text-primary/90 mb-3">53.3M (~65% of model)</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Most capacity lives here. It predicts spectral structure, then inverse STFT
              reconstructs audio.
            </p>
            <div className="flex justify-center mb-2 overflow-visible w-[calc(100%+6.75rem)] -ml-3">
              <Image
                src="/presentations/voice-agents/artifacts/STFT.png"
                alt="STFT spectrogram showing audio energy over time and frequency"
                width={520}
                height={293}
                className="rounded-md border border-zinc-700 object-contain scale-90 origin-center"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              STFT = Short-Time Fourier Transform, an image-like time-frequency view of audio.
            </p>
          </div>
        </div>
      </div>

      <p className="text-base text-primary/80 font-mono text-center max-w-4xl">
        Bottom line: Kokoro stays small by keeping context modules modest and putting most of
        the parameter budget where waveform quality is hardest.
      </p>
    </div>
  );
}
