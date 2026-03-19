export function MoonshineDeepDiveSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-6xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-3 text-primary neon-glow text-center">
        Moonshine v2: How It Works
      </h2>

      <p className="text-lg text-muted-foreground mb-5 text-center max-w-4xl">
        Raw Audio (16kHz) -&gt; Learned Frontend -&gt; Sliding-Window Encoder -&gt; Adapter -&gt;
        Cross-Attention Decoder -&gt; Text
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1.1fr_auto_0.7fr_auto_1fr] gap-3 w-full mb-5 items-stretch">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
          <div className="text-sm font-mono text-primary/70 mb-1">Stage 1</div>
          <h3 className="text-xl font-bold text-primary mb-2">Frontend</h3>
          <div className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-mono text-primary mb-2">
            no mel spectrogram
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>Raw waveform input</li>
            <li>80-sample frames (5ms)</li>
            <li>CMVN + asinh + Linear</li>
            <li>2x causal stride-2 conv</li>
            <li>Output: ~50 fps features</li>
          </ul>
        </div>

        <div className="hidden md:flex items-center justify-center text-3xl text-primary/50">
          -&gt;
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
          <div className="text-sm font-mono text-primary/70 mb-1">Stage 2</div>
          <h3 className="text-xl font-bold text-primary mb-2">Encoder</h3>
          <div className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-mono text-primary mb-2">
            ergodic / no position embeddings
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>Sliding-window attention: (16L, 4R)</li>
            <li>O(T*w) not O(T^2)</li>
            <li>No absolute positional encoding</li>
            <li>Translation-invariant in time</li>
            <li>Bounded, constant TTFT</li>
          </ul>
        </div>

        <div className="hidden md:flex items-center justify-center text-3xl text-primary/50">
          -&gt;
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
          <div className="text-sm font-mono text-primary/70 mb-1">Stage 3</div>
          <h3 className="text-xl font-bold text-primary mb-2">Adapter</h3>
          <div className="inline-flex px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-700 text-xs font-mono text-muted-foreground mb-2">
            bridge
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>Adds learned pos embed</li>
            <li>Encoder is position-free</li>
            <li>Projects enc -&gt; dec dim</li>
          </ul>
        </div>

        <div className="hidden md:flex items-center justify-center text-3xl text-primary/50">
          -&gt;
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
          <div className="text-sm font-mono text-primary/70 mb-1">Stage 4</div>
          <h3 className="text-xl font-bold text-primary mb-2">Decoder</h3>
          <div className="inline-flex px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-700 text-xs font-mono text-primary/80 mb-2">
            RoPE + SwiGLU
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>Causal Transformer</li>
            <li>Cross-attn to adapter</li>
            <li>SwiGLU feed-forward</li>
            <li>Autoregressive tokens</li>
          </ul>
        </div>
      </div>

      <div className="w-full max-w-4xl mb-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { size: 'Tiny', total: '34M', split: '2M + 7M + 1M + 23M' },
            { size: 'Small', total: '123M', split: '8M + 43M + 3M + 69M' },
            { size: 'Medium', total: '245M', split: '12M + 94M + 4M + 136M' },
          ].map((m) => (
            <div
              key={m.size}
              className="px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800"
            >
              <div className="text-base font-semibold text-primary">{m.size}</div>
              <div className="text-xl font-mono text-zinc-300">{m.total}</div>
              <div className="text-xs font-mono text-muted-foreground">{m.split}</div>
              <div className="text-[10px] text-muted-foreground/60">front + enc + adapt + dec</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-base text-primary/80 font-mono text-center max-w-4xl">
        The encoder is &quot;ergodic&quot; -- identical local windows produce identical outputs
        regardless of where they occur in the utterance. No position, pure content.
      </p>
    </div>
  );
}
