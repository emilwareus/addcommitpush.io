'use client';

import { motion } from 'framer-motion';

export function CodeWalkthroughSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto px-8 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-6xl font-bold mb-8 text-primary neon-glow"
      >
        Let&apos;s Build It
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-2xl text-muted-foreground mb-12"
      >
        5 scripts, from basics to full pipeline
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-zinc-900/80 border border-primary/20 rounded-xl p-8 text-left font-mono text-sm space-y-2"
      >
        <div className="text-muted-foreground">presentations/voice-agents/examples/</div>
        <div><span className="text-primary">01</span> whisper-basic.py <span className="text-muted-foreground ml-4"># Record &amp; transcribe</span></div>
        <div><span className="text-primary">02</span> vad-streaming.py <span className="text-muted-foreground ml-4"># Real-time speech detection</span></div>
        <div><span className="text-primary">03</span> kokoro-tts.py <span className="text-muted-foreground ml-6"># Text to speech</span></div>
        <div><span className="text-primary">04</span> groq-streaming.py <span className="text-muted-foreground ml-2"># Streaming LLM</span></div>
        <div><span className="text-primary">05</span> full-pipeline.py <span className="text-muted-foreground ml-3"># VAD → STT → LLM → TTS</span></div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="mt-8 text-lg text-muted-foreground font-mono"
      >
        → Switch to terminal
      </motion.p>
    </div>
  );
}
