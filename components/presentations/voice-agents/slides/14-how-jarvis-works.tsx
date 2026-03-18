const stack = [
  { layer: 'Browser', tech: 'AudioWorklet → WebSocket (WSS)', color: 'border-blue-500/40 bg-blue-500/10' },
  { layer: 'VAD', tech: 'Silero VAD (1.8MB, 30ms chunks)', color: 'border-yellow-500/40 bg-yellow-500/10' },
  { layer: 'STT', tech: 'faster-whisper (small, CPU int8)', color: 'border-green-500/40 bg-green-500/10' },
  { layer: 'LLM', tech: 'Groq API + tool calling', color: 'border-purple-500/40 bg-purple-500/10' },
  { layer: 'TTS', tech: 'Kokoro-82M (ONNX, CPU)', color: 'border-orange-500/40 bg-orange-500/10' },
  { layer: 'Output', tech: 'PCM → WebSocket → Web Audio API', color: 'border-blue-500/40 bg-blue-500/10' },
];

export function HowJarvisWorksSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center">
        How Jarvis Was Built
      </h2>

      <p className="text-lg text-muted-foreground mb-10 text-center">
        Everything we just talked about — running right here
      </p>

      <div className="w-full max-w-2xl space-y-3">
        {stack.map((item) => (
          <div
            key={item.layer}
            className={`flex items-center gap-4 p-4 rounded-lg border ${item.color}`}
          >
            <span className="text-sm font-bold font-mono w-16 text-right">{item.layer}</span>
            <span className="text-sm text-muted-foreground">{item.tech}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 max-w-2xl">
        <h3 className="text-sm font-semibold mb-2">Agent Behavior</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Always listening → shows thinking in sidebar</li>
          <li>&ldquo;Hey Jarvis&rdquo; → responds with voice via <code className="text-primary">respond</code> tool</li>
          <li>Slide context sent on navigation → agent knows where we are</li>
        </ul>
      </div>

      <p className="mt-4 text-sm text-muted-foreground text-center">
        ~500 lines of Python + ~300 lines of TypeScript. All open source.
      </p>
    </div>
  );
}
