'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

const models = [
  { name: 'tiny', params: '39M', speed: '~32x', vram: '~1 GB' },
  { name: 'base', params: '74M', speed: '~16x', vram: '~1 GB' },
  { name: 'small', params: '244M', speed: '~6x', vram: '~2 GB', highlight: true },
  { name: 'medium', params: '769M', speed: '~2x', vram: '~5 GB' },
  { name: 'large-v3', params: '1550M', speed: '~1x', vram: '~10 GB' },
];

export function WhisperDeepDiveSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center"
      >
        Whisper: How It Works
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground mb-8 text-center max-w-3xl"
      >
        Audio → Mel spectrogram → Transformer encoder → Transformer decoder → Tokens → Text
      </motion.p>

      {step >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-3xl"
        >
          <h3 className="text-xl font-semibold mb-4 text-center">Model Size vs. Speed Trade-off</h3>
          <div className="grid grid-cols-5 gap-1 text-center text-sm font-mono mb-2 text-muted-foreground">
            <span>Model</span>
            <span>Params</span>
            <span>Rel. Speed</span>
            <span>VRAM</span>
            <span />
          </div>
          {models.map((m) => (
            <div
              key={m.name}
              className={`grid grid-cols-5 gap-1 text-center text-sm py-2 rounded ${
                m.highlight ? 'bg-primary/10 border border-primary/30 text-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              <span className="font-mono">{m.name}</span>
              <span>{m.params}</span>
              <span>{m.speed}</span>
              <span>{m.vram}</span>
              <span>{m.highlight ? '← our pick' : ''}</span>
            </div>
          ))}
        </motion.div>
      )}

      {step >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-6 bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 max-w-2xl font-mono text-sm"
        >
          <span className="text-muted-foreground"># faster-whisper with int8 quantization</span>
          <br />
          <span className="text-primary">model = WhisperModel(</span>
          <span className="text-green-400">&quot;small&quot;</span>
          <span className="text-primary">, device=</span>
          <span className="text-green-400">&quot;cpu&quot;</span>
          <span className="text-primary">, compute_type=</span>
          <span className="text-green-400">&quot;int8&quot;</span>
          <span className="text-primary">)</span>
        </motion.div>
      )}
    </div>
  );
}
