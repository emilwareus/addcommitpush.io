export function WhisperDeepDiveSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-6xl mx-auto px-8">
      <h2 className="text-5xl md:text-6xl font-bold mb-3 text-primary neon-glow text-center">
        Whisper: How It Works
      </h2>

      <p className="text-xl text-muted-foreground mb-6 text-center max-w-4xl">
        Audio (16kHz) -&gt; Mel Spectrogram (80 bands) -&gt; Conv Stem + Encoder -&gt;
        Cross-Attention Decoder -&gt; Text
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 w-full mb-6 items-stretch">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <div className="text-base font-mono text-primary/70 mb-2">Stage 1</div>
          <h3 className="text-2xl font-bold text-primary mb-2">Audio -&gt; Mel</h3>
          <div className="inline-flex px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-700 text-sm font-mono text-muted-foreground mb-3">
            hard-coded constants
          </div>
          <ul className="space-y-2 text-base text-muted-foreground">
            <li>25ms Hann window, 10ms hop, STFT</li>
            <li>80-band mel filterbank -&gt; log scale</li>
            <li>Fixed 30s chunks (480K samples)</li>
            <li>Output: 3000 mel frames</li>
          </ul>
        </div>

        <div className="hidden md:flex items-center justify-center text-5xl text-primary/50">
          -&gt;
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <div className="text-base font-mono text-primary/70 mb-2">Stage 2</div>
          <h3 className="text-2xl font-bold text-primary mb-2">Encoder</h3>
          <div className="inline-flex px-2 py-1 rounded-full bg-primary/10 border border-primary/30 text-sm font-mono text-primary mb-3">
            680K hours of training
          </div>
          <ul className="space-y-2 text-base text-muted-foreground">
            <li>Conv1d stem (stride 2): 3000 -&gt; 1500 tokens</li>
            <li>Fixed sinusoidal positional embeddings</li>
            <li>N x self-attention blocks (full O(T^2))</li>
            <li>Each token = 20ms of audio</li>
          </ul>
        </div>

        <div className="hidden md:flex items-center justify-center text-5xl text-primary/50">
          -&gt;
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <div className="text-base font-mono text-primary/70 mb-2">Stage 3</div>
          <h3 className="text-2xl font-bold text-primary mb-2">Decoder</h3>
          <div className="inline-flex px-2 py-1 rounded-full bg-primary/10 border border-primary/30 text-sm font-mono text-primary mb-3">
            weight-tying
          </div>
          <ul className="space-y-2 text-base text-muted-foreground">
            <li>Learned positional embeddings (448 ctx)</li>
            <li>N x (self-attn + cross-attn to encoder)</li>
            <li>Causal mask, autoregressive</li>
            <li>Logits = hidden @ embed.weight.T</li>
          </ul>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-primary mb-2 text-center">
          Multitask via Token Prefix
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-base">
          <span className="px-2 py-1 rounded bg-zinc-800 text-primary">
            &lt;|startoftranscript|&gt;
          </span>
          <span className="px-2 py-1 rounded bg-zinc-800 text-blue-400">&lt;|en|&gt;</span>
          <span className="px-2 py-1 rounded bg-zinc-800 text-green-400">&lt;|transcribe|&gt;</span>
          <span className="px-2 py-1 rounded bg-zinc-800 text-yellow-400">&lt;|0.00|&gt;</span>
          <span className="text-muted-foreground">... text tokens ...</span>
          <span className="px-2 py-1 rounded bg-zinc-800 text-yellow-400">&lt;|2.50|&gt;</span>
          <span className="px-2 py-1 rounded bg-zinc-800 text-muted-foreground">
            &lt;|endoftext|&gt;
          </span>
        </div>
      </div>

      <p className="text-lg text-primary/80 font-mono text-center max-w-4xl">
        One model does transcription, translation, language ID, and timestamps -- all through the
        decoder&apos;s token format, not separate heads.
      </p>
    </div>
  );
}
