const rows = [
  { aspect: 'Latency (first audio)', homegrown: '~1.5s', api: '~0.5-1s' },
  { aspect: 'Cost', homegrown: 'Free (local compute)', api: '$0.06-0.24/min' },
  { aspect: 'Quality', homegrown: 'Good (Kokoro + Whisper)', api: 'Excellent (native multimodal)' },
  { aspect: 'Privacy', homegrown: 'All local', api: 'Audio sent to cloud' },
  { aspect: 'Setup complexity', homegrown: 'High (models, deps)', api: 'Low (API key + SDK)' },
  { aspect: 'Customization', homegrown: 'Full control', api: 'Limited to API params' },
  { aspect: 'Offline capable', homegrown: 'Yes (except LLM)', api: 'No' },
];

export function HomegrownVsApiSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center">
        Homegrown vs API
      </h2>

      <p className="text-lg text-muted-foreground mb-8 text-center">
        Whisper + Kokoro + Groq vs. Gemini Native Audio / OpenAI Realtime
      </p>

      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-3 gap-1 text-center text-sm font-semibold mb-3">
          <span />
          <span className="text-primary">Homegrown</span>
          <span className="text-muted-foreground">Cloud API</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.aspect}
            className="grid grid-cols-3 gap-1 text-sm py-2 border-b border-zinc-800/50"
          >
            <span className="text-muted-foreground">{row.aspect}</span>
            <span className="text-center">{row.homegrown}</span>
            <span className="text-center text-muted-foreground">{row.api}</span>
          </div>
        ))}
      </div>

      <p className="mt-8 text-base text-muted-foreground text-center max-w-2xl">
        Build homegrown to <span className="text-primary">understand</span> the pipeline.
        Use APIs when you need <span className="text-primary">production quality</span>.
      </p>
    </div>
  );
}
