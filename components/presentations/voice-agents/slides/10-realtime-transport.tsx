export function RealtimeTransportSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-6xl mx-auto px-8">
      <h2 className="text-5xl md:text-6xl font-bold mb-10 text-primary neon-glow text-center">
        WebSocket vs WebRTC
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full">
        {/* WebSocket column */}
        <div className="bg-primary/15 border border-primary/50 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-primary">WebSocket</h3>
            <span className="text-sm font-mono bg-primary/30 text-primary px-2.5 py-0.5 rounded">TCP</span>
          </div>

          <ul className="space-y-2 text-lg text-foreground/80">
            <li>Raw PCM over binary frames</li>
            <li>AudioWorklet on browser audio thread</li>
            <li>256 kbps uncompressed</li>
          </ul>

          <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-4">
            <div className="text-lg font-bold text-red-400 mb-1">Echo suppression</div>
            <p className="text-base text-red-300">
              Barge-in possible but tricky — needs client-side VAD to distinguish user speech from echo.
            </p>
          </div>
        </div>

        {/* WebRTC column */}
        <div className="bg-blue-500/15 border border-blue-500/50 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-blue-400">WebRTC</h3>
            <span className="text-sm font-mono bg-blue-500/30 text-blue-400 px-2.5 py-0.5 rounded">UDP</span>
          </div>

          <ul className="space-y-2 text-lg text-foreground/80">
            <li>Opus codec, ~32 kbps (10x smaller)</li>
            <li>No AudioWorklet needed</li>
            <li>Built-in jitter buffer</li>
          </ul>

          <div className="bg-green-500/15 border border-green-500/40 rounded-lg p-4">
            <div className="text-lg font-bold text-green-400 mb-1">Native AEC</div>
            <p className="text-base text-green-300">
              Browser cancels echo at driver level. Barge-in works.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
