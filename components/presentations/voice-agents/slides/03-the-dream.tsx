import Image from 'next/image';

export function TheDreamSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8 text-center">
      <h2 className="text-5xl md:text-7xl font-bold mb-8 text-primary neon-glow text-center">
        &ldquo;Hey Jarvis...&rdquo;
      </h2>

      <div className="mb-6 rounded-lg overflow-hidden border border-primary/20 shadow-lg shadow-primary/10">
        <Image
          src="/presentations/voice-agents/artifacts/tony.gif"
          alt="Tony Stark interacting with JARVIS holographic interface in his workshop"
          width={640}
          height={360}
          className="object-cover"
          unoptimized
        />
      </div>

      <div className="bg-zinc-900/80 border border-primary/20 rounded-lg p-6 max-w-2xl">
        <p className="text-lg text-muted-foreground mb-4">
          Today we&apos;ll &ldquo;build&rdquo; one from scratch:
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {['Whisper STT', 'Kokoro TTS', 'Silero VAD', 'Groq LLM', 'WebSocket'].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full text-sm text-primary font-mono"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
