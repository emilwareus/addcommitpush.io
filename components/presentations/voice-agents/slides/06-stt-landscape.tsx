const models = [
  {
    name: 'OpenAI Whisper',
    params: '39M - 1.55B',
    note: 'The foundation. Encoder-decoder transformer, 680K hours, 99 languages. MIT license.',
    highlight: false,
    href: 'https://github.com/openai/whisper',
  },
  {
    name: 'faster-whisper',
    params: 'same weights',
    note: 'CTranslate2 backend. Up to 8.9x faster, 38% less VRAM. Same accuracy. GPU-focused.',
    highlight: true,
    href: 'https://github.com/SYSTRAN/faster-whisper',
  },
  {
    name: 'whisper.cpp',
    params: 'same weights',
    note: 'C/C++ port with ggml. Runs on Raspberry Pi, Apple Silicon, RISC-V. 4-bit quantization.',
    highlight: false,
    href: 'https://github.com/ggerganov/whisper.cpp',
  },
  {
    name: 'NVIDIA Parakeet-TDT-1.1B',
    params: '1.1B',
    note: 'FastConformer + RNN-T. 1.39% WER clean -- current SOTA. Streaming. 2000x+ real-time.',
    highlight: false,
    href: 'https://huggingface.co/nvidia/parakeet-tdt-1.1b',
  },
  {
    name: 'Moonshine v2',
    params: '34M - 245M',
    note: 'Raw waveform, no 30s padding. 245M model beats Whisper large-v3. Built for edge.',
    highlight: false,
    href: 'https://github.com/moonshine-ai/moonshine',
  },
  {
    name: 'Voxtral Realtime',
    params: '4B',
    note: 'Causal encoder + LLM decoder. Only open-weights streaming STT with near-offline accuracy.',
    highlight: false,
    href: 'https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602',
  },
];

export function SttLandscapeSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-5xl md:text-6xl font-bold mb-4 text-primary neon-glow text-center">
        Open-Source STT Landscape
      </h2>

      <p className="text-xl text-muted-foreground mb-8 text-center max-w-2xl">
        Six families worth knowing -- all run locally, no API keys needed
      </p>

      <div className="grid gap-3 w-full max-w-3xl">
        {models.map((m) => (
          <a
            key={m.name}
            href={m.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
              m.highlight
                ? 'bg-primary/10 border-primary/40'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className={`font-semibold text-lg ${m.highlight ? 'text-primary' : ''}`}>
                  {m.name}
                </span>
                <span className="text-sm font-mono px-2 py-0.5 rounded bg-zinc-800 text-muted-foreground whitespace-nowrap">
                  {m.params}
                </span>
              </div>
              <span className="text-base text-muted-foreground">{m.note}</span>
            </div>
          </a>
        ))}
      </div>

      <p className="mt-6 text-lg text-primary/70 font-mono text-center">
        We use faster-whisper (small, int8, CPU) + VAD chunking for Jarvis
      </p>
    </div>
  );
}
