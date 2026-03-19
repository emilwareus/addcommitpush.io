export function VadSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-5xl md:text-6xl font-bold mb-2 text-primary neon-glow text-center max-w-4xl">
        VAD controls when the agent listens and when it responds --
        its silence threshold is the biggest latency knob
      </h2>

      <p className="text-xl text-muted-foreground mb-8 text-center max-w-3xl">
        Silero VAD: 2 MB neural net, 32ms chunks, &lt;1ms on CPU, 0.97 ROC-AUC
      </p>

      {/* The pipeline -- the core visual evidence */}
      <div className="w-full mb-8">
        <div className="flex items-stretch justify-center gap-1">
          {/* Pre-buffer */}
          <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 min-w-[120px]">
            <span className="text-base text-muted-foreground">Pre-buffer</span>
            <span className="text-3xl font-mono font-bold text-zinc-300">500ms</span>
            <span className="text-sm text-muted-foreground text-center">Circular buffer captures audio before VAD fires</span>
          </div>

          <div className="flex items-center text-primary/40 text-3xl px-1">-&gt;</div>

          {/* Speech */}
          <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/25 min-w-[120px]">
            <span className="text-base text-green-400/80">Speech</span>
            <span className="text-3xl font-mono font-bold text-green-400">p &gt;= 0.5</span>
            <span className="text-sm text-muted-foreground text-center">Accumulate audio, stream to STT</span>
          </div>

          <div className="flex items-center text-primary/40 text-3xl px-1">-&gt;</div>

          {/* Silence */}
          <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-zinc-900/80 border border-primary/30 min-w-[120px]">
            <span className="text-base text-zinc-400">Silence</span>
            <span className="text-3xl font-mono font-bold text-primary">700ms</span>
            <span className="text-sm text-muted-foreground text-center">Wait for user to finish speaking</span>
          </div>

          <div className="flex items-center text-primary/40 text-3xl px-1">-&gt;</div>

          {/* Process */}
          <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/25 min-w-[120px]">
            <span className="text-base text-blue-400/80">Process</span>
            <span className="text-3xl font-mono font-bold text-blue-400">STT</span>
            <span className="text-sm text-muted-foreground text-center">Transcribe, then LLM + TTS</span>
          </div>
        </div>
      </div>

      {/* The tradeoff -- two sides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <div className="text-lg font-semibold text-zinc-300 mb-2">Silence too short (200ms)</div>
          <p className="text-lg text-muted-foreground">
            Cuts users off mid-sentence. Natural pauses trigger false endpoints. Frustrating.
          </p>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <div className="text-lg font-semibold text-zinc-300 mb-2">Silence too long (1000ms+)</div>
          <p className="text-lg text-muted-foreground">
            Agent feels sluggish. Users start repeating themselves. Conversation loses flow.
          </p>
        </div>
      </div>

      <p className="mt-6 text-lg font-mono text-primary/80 text-center max-w-3xl">
        Jarvis uses 700ms -- nearly half the total turn latency. This one number matters more
        than any model optimization.
      </p>
    </div>
  );
}
