const models = [
  {
    name: 'Kokoro-82M',
    params: '82M',
    note: 'StyleTTS 2 + iSTFTNet. MOS 3.87 surpasses human on LJSpeech (StyleTTS 2 paper). #1 open-weights on TTS Arena (ELO 1072). 5x RT on CPU. Apache 2.0.',
    highlight: true,
    href: 'https://huggingface.co/hexgrad/Kokoro-82M',
  },
  {
    name: 'F5-TTS',
    params: '336M',
    note: 'DiT + flow matching. UTMOS 3.90, WER 2.42%. Best-benchmarked OSS TTS. CC-BY-NC.',
    highlight: false,
    href: 'https://github.com/SWivid/F5-TTS',
  },
  {
    name: 'Spark-TTS',
    params: '0.5B',
    note: 'BiCodec + Qwen2.5. UTMOS 4.35 (exceeds ground truth). WER 1.98%. Apache 2.0.',
    highlight: false,
    href: 'https://github.com/SparkAudio/Spark-TTS',
  },
  {
    name: 'Fish Audio S2',
    params: '~4.4B',
    note: 'Dual-AR with Qwen3-4B. WER 0.99%. RTF 0.195 on H200. TTFA <100ms. CC-BY-NC-SA.',
    highlight: false,
    href: 'https://arxiv.org/abs/2603.08823',
  },
  {
    name: 'Orpheus',
    params: '3B',
    note: 'Llama-3B backbone + SNAC tokens. Emotion tags. ~200ms streaming latency. Apache 2.0.',
    highlight: false,
    href: 'https://github.com/canopyai/Orpheus-TTS',
  },
  {
    name: 'Dia',
    params: '1.6B',
    note: 'Multi-speaker dialogue with non-speech sounds. RTF ~0.47 on A4000. Apache 2.0.',
    highlight: false,
    href: 'https://github.com/nari-labs/dia',
  },
  {
    name: 'Piper',
    params: '~20M',
    note: 'VITS/ONNX. Runs on Raspberry Pi. 5x real-time on CPU. MIT license.',
    highlight: false,
    href: 'https://github.com/rhasspy/piper',
  },
];

export function TtsLandscapeSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center">
        Open-Source TTS Landscape
      </h2>

      <p className="text-lg text-muted-foreground mb-8 text-center max-w-2xl">
        Seven families worth knowing -- all run locally, no API keys needed
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
                <span className={`font-semibold text-base ${m.highlight ? 'text-primary' : ''}`}>
                  {m.name}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-muted-foreground whitespace-nowrap">
                  {m.params}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{m.note}</span>
            </div>
          </a>
        ))}
      </div>

      <p className="mt-6 text-base text-primary/70 font-mono text-center">
        We use Kokoro-82M (ONNX, CPU) for Jarvis -- 82M params, real-time streaming
      </p>
    </div>
  );
}
