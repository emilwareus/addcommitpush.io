export function VadSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center">
        Voice Activity Detection
      </h2>

      <p className="text-lg text-muted-foreground mb-10 text-center max-w-3xl">
        Knowing <em>when</em> someone is speaking
        <br />
        is just as important as understanding <em>what</em> they say
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-8">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-2">Energy-Based</h3>
          <p className="text-sm text-muted-foreground">Simple RMS threshold. Fast but noisy in real environments.</p>
        </div>
        <div className="bg-primary/10 border border-primary/40 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-primary mb-2">Silero VAD</h3>
          <p className="text-sm text-muted-foreground">ML-based, 1.8MB model. 30ms chunks. Our pick.</p>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-2">webrtcvad</h3>
          <p className="text-sm text-muted-foreground">C library from Google. Good but less accurate than ML.</p>
        </div>
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5 max-w-3xl w-full">
        <h3 className="text-lg font-semibold mb-3">The Turn-Taking Problem</h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="px-2 py-1 bg-green-500/20 rounded text-green-400 font-mono">SPEECH</span>
          <span>→</span>
          <span className="px-2 py-1 bg-zinc-800 rounded font-mono">silence (700ms)</span>
          <span>→</span>
          <span className="px-2 py-1 bg-primary/20 rounded text-primary font-mono">UTTERANCE END</span>
          <span>→</span>
          <span className="px-2 py-1 bg-blue-500/20 rounded text-blue-400 font-mono">Transcribe</span>
        </div>
      </div>

      <p className="mt-6 text-base text-muted-foreground text-center max-w-2xl">
        Silence threshold is a key UX knob: too short → cuts people off, too long → feels sluggish
      </p>
    </div>
  );
}
