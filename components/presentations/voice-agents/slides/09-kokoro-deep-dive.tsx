export function KokoroDeepDiveSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-5xl md:text-6xl font-bold mb-4 text-primary neon-glow text-center">
        Kokoro: How Inference Works
      </h2>

      <p className="text-xl text-muted-foreground mb-8 text-center max-w-4xl">
        Text -&gt; phonemes -&gt; acoustic path + prosody path -&gt; iSTFTNet vocoder -&gt; waveform
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <div className="px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-base">
          <span className="text-muted-foreground">Phoneme:</span>{' '}
          <span className="font-mono text-primary">cat -&gt; k ae t</span>
        </div>
        <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-base">
          TTS works on <span className="font-semibold">sounds</span>, not spelling
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 w-full mb-8 items-stretch">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-2xl font-bold mb-3 text-primary">Acoustic Path</h3>
          <ul className="space-y-2 text-base text-muted-foreground">
            <li>TextEncoder builds decoder-friendly speech features</li>
            <li>Represents what should be said at the frame level</li>
            <li>Feeds the vocoder with acoustic content</li>
          </ul>
        </div>

        <div className="hidden md:flex items-center justify-center text-4xl text-primary/70">+</div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-2xl font-bold mb-3 text-primary">Prosody Path</h3>
          <p className="text-sm text-primary/80 mb-3">
            Decides how the speech should be delivered over time
          </p>
          <ul className="space-y-2 text-base text-muted-foreground">
            <li>Predicts duration: how long each phoneme lasts</li>
            <li>Predicts F0: pitch contour over time</li>
            <li>Predicts energy: loudness envelope over time</li>
          </ul>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-primary/10 border border-primary/30 rounded-lg p-5 mb-6">
        <h3 className="text-2xl font-bold text-primary text-center mb-3">iSTFTNet Vocoder</h3>
        <p className="text-base text-center text-muted-foreground max-w-3xl mx-auto">
          Takes acoustic features plus predicted duration, pitch, and energy, then generates audio
          by predicting spectral structure and reconstructing the waveform.
        </p>
      </div>

      <p className="text-lg text-primary/80 font-mono text-center max-w-3xl">
        Takeaway: Kokoro does not learn speech as one black box. It breaks the job into what sounds
        to say, how to say them, and how to turn that plan into audio.
      </p>
    </div>
  );
}
