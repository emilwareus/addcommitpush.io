'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

export function RealtimeTransportSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center"
      >
        Making It Feel Real-Time
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground mb-10 text-center"
      >
        Getting audio from browser to Python and back — fast
      </motion.p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-primary/10 border border-primary/40 rounded-lg p-5"
        >
          <h3 className="text-xl font-bold text-primary mb-3">WebSocket</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>+ Simple to implement</li>
            <li>+ Binary frames for audio</li>
            <li>+ JSON for control messages</li>
            <li>+ Works through mkcert WSS</li>
            <li>- No built-in echo cancellation</li>
          </ul>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5"
        >
          <h3 className="text-xl font-bold mb-3">WebRTC</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>+ Built-in echo cancellation</li>
            <li>+ Adaptive bitrate</li>
            <li>+ Lower latency (UDP)</li>
            <li>- Complex signaling setup</li>
            <li>- Overkill for localhost</li>
          </ul>
        </motion.div>
      </div>

      {step >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5 max-w-3xl w-full"
        >
          <h3 className="text-lg font-semibold mb-3">Binary Frame Protocol</h3>
          <div className="font-mono text-sm flex items-center gap-2">
            <span className="px-3 py-1.5 bg-blue-500/20 rounded text-blue-400">4B flags</span>
            <span className="text-muted-foreground">+</span>
            <span className="px-3 py-1.5 bg-green-500/20 rounded text-green-400">PCM int16 data</span>
            <span className="text-muted-foreground ml-3">16kHz mono, 30ms frames</span>
          </div>
        </motion.div>
      )}

      {step >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-4 bg-zinc-900/80 border border-zinc-800 rounded-lg p-5 max-w-3xl w-full"
        >
          <h3 className="text-lg font-semibold mb-3">AudioWorklet (not ScriptProcessorNode)</h3>
          <p className="text-sm text-muted-foreground">
            Runs on a dedicated audio thread. No main-thread jank. Captures mic at device sample rate,
            resamples to 16kHz, buffers into 30ms frames, posts Int16 PCM to main thread.
          </p>
        </motion.div>
      )}

      {step >= 3 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-6 text-base text-primary/70 font-mono text-center"
        >
          Echo suppression: skip mic frames while TTS is playing
        </motion.p>
      )}
    </div>
  );
}
