const pipelineStages = [
  { icon: '🎤', label: 'Mic', fullName: '', desc: 'Capture audio' },
  { icon: '📊', label: 'VAD', fullName: 'Voice Activity Detection', desc: 'Detect speech' },
  { icon: '👂', label: 'STT', fullName: 'Speech-to-Text', desc: 'Transcribe' },
  { icon: '🧠', label: 'LLM', fullName: 'Large Language Model', desc: 'Reason & decide' },
  { icon: '🔊', label: 'TTS', fullName: 'Text-to-Speech', desc: 'Synthesize voice' },
  { icon: '🔈', label: 'Speaker', fullName: '', desc: 'Play audio' },
];

export function ArchitectureOverviewSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-7xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-16 text-primary neon-glow text-center">
        The Voice Agent Pipeline
      </h2>

      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-8 md:gap-x-16 gap-y-10 md:gap-y-14 w-full max-w-5xl items-start">
        {/* Row 1: Mic → VAD → STT */}
        {pipelineStages.slice(0, 3).flatMap((stage, i) => [
          <div
            key={`${stage.label}-cell`}
            className="flex flex-col items-center justify-start gap-2 min-w-0"
          >
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl bg-zinc-900 border border-primary/30 flex items-center justify-center text-5xl md:text-6xl shrink-0">
              {stage.icon}
            </div>
            <span className="text-lg md:text-xl font-mono text-primary font-bold text-center">
              {stage.label}
            </span>
            <span className="text-base text-muted-foreground/80 text-center min-h-[1.25rem]">
              {stage.fullName || '\u00A0'}
            </span>
            <span className="text-base text-muted-foreground text-center">{stage.desc}</span>
          </div>,
          ...(i < 2
            ? [
                <div
                  key={`${stage.label}-arrow`}
                  className="flex items-center justify-center self-start mt-14 md:mt-16"
                >
                  <span className="text-4xl text-primary/50">→</span>
                </div>,
              ]
            : []),
        ])}
        {/* Row 2: LLM → TTS → Speaker */}
        {pipelineStages.slice(3, 6).flatMap((stage, i) => [
          <div
            key={`${stage.label}-cell`}
            className="flex flex-col items-center justify-start gap-2 min-w-0"
          >
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl bg-zinc-900 border border-primary/30 flex items-center justify-center text-5xl md:text-6xl shrink-0">
              {stage.icon}
            </div>
            <span className="text-lg md:text-xl font-mono text-primary font-bold text-center">
              {stage.label}
            </span>
            <span className="text-base text-muted-foreground/80 text-center min-h-[1.25rem]">
              {stage.fullName || '\u00A0'}
            </span>
            <span className="text-base text-muted-foreground text-center">{stage.desc}</span>
          </div>,
          ...(i < 2
            ? [
                <div
                  key={`${stage.label}-arrow`}
                  className="flex items-center justify-center self-start mt-14 md:mt-16"
                >
                  <span className="text-4xl text-primary/50">→</span>
                </div>,
              ]
            : []),
        ])}
      </div>

      <p className="mt-12 text-2xl text-muted-foreground text-center max-w-2xl">
        Each stage adds latency. The art is in making the total feel instant.
      </p>
    </div>
  );
}
