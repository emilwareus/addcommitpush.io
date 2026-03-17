# Voice Agents Presentation with Jarvis AI Co-Presenter — Implementation Plan

## Overview

Build a 19-slide presentation at `/presentations/voice-agents/` about building real-time voice agents, featuring a live AI co-presenter called "Jarvis." Jarvis is a fully local voice assistant (Whisper STT + Kokoro TTS + Groq LLM + Silero VAD) that always listens, shows thinking in a persistent sidebar, and only speaks when it hears "hey Jarvis." The presentation is deployed on Vercel; the Jarvis backend runs on localhost with WSS via mkcert.

## Current State Analysis

### Presentation System (exists)
- Route pattern: `app/presentations/[name]/[slide]/page.tsx` with `generateStaticParams`
- Layout: Client component with keyboard nav (ArrowRight/Left/Space), `SlideStepProvider` context, progress bar, Framer Motion fade transitions
- Registry: `lib/presentations/[name].ts` with `Slide` interface (`slug`, `title`, `steps`), utility functions
- Slides: Client components in `components/presentations/[name]/slides/`
- One existing presentation: `deep-research` with 22 slides

### Shared Components (do NOT exist)
- No `components/presentations/shared/` directory
- Title, About, Resources slides are hardcoded in deep-research

### Jarvis Backend (does NOT exist)
- Podidex has a complete reference implementation at `/Users/emilwareus/Development/podidex/tts/voice_chat/`
- Key patterns to adapt: `ModelManager` singleton, `SpeechPipeline`, binary WebSocket protocol, sentence-chunked TTS

### Key Discoveries
- `app/presentations/deep-research/layout.tsx:19-63` — SlideStepProvider with keyboard nav
- `lib/presentations/deep-research.ts:1-5` — Slide interface definition
- `app/presentations/deep-research/[slide]/page.tsx:36-129` — switch/case dynamic import pattern
- `app/presentations/page.tsx:22-39` — PresentationEntry interface and presentations array
- Podidex `tts/voice_chat/dev_server.py` — 92-line dev server pattern
- Podidex `tts/voice_chat/models.py:126-174` — Model loading with device detection
- Podidex `tts/voice_chat/pipeline.py` — Full pipeline with speculative execution

## Desired End State

1. `/presentations/voice-agents/` renders a 19-slide presentation with keyboard navigation
2. Shared components (`TitleSlide`, `AboutSlide`, `ResourcesSlide`, `PresentationLayout`) are reusable across presentations
3. A persistent Jarvis sidebar is visible on all slides, showing:
   - Live transcription of what the mic hears
   - Jarvis thinking/observations (silent, text only)
   - Jarvis spoken responses (when "hey Jarvis" is detected)
4. Python backend at `wss://localhost:8765` handles the full voice pipeline
5. Example code scripts in `presentations/voice-agents/examples/` are runnable demos
6. `pnpm build` succeeds, `pnpm lint` passes

### Verification
- `pnpm build` succeeds with all 19 slides statically generated
- `pnpm lint` passes
- Navigate to `/presentations/voice-agents/` → redirects to first slide
- Arrow keys navigate between slides with step animations
- Jarvis sidebar visible on all slides
- Python backend starts with `python -m jarvis.server` and accepts WSS connections
- Mic audio flows to backend, transcription appears in sidebar
- Saying "hey Jarvis, what slide are we on?" triggers a spoken response

## What We're NOT Doing

- No WebRTC — WebSocket only
- No Docker — everything runs natively on macOS
- No fallback/graceful degradation for Jarvis — it works or it fails live
- No mobile/touch support for the presentation
- No presenter notes view
- No recording/replay of Jarvis interactions
- Not modifying the deep-research presentation (only extracting shared components from it)
- Not deploying the Python backend — it runs on localhost only

## Implementation Approach

Extract reusable presentation infrastructure first (Phase 1), then scaffold the new presentation (Phase 2), then build the Jarvis backend (Phase 3) and frontend (Phase 4) in parallel-ready phases, then write example code (Phase 5) and integrate everything (Phase 6).

---

## Phase 1: Extract Shared Presentation Components

### Overview
Extract reusable components from the deep-research presentation so both presentations can share them. Refactor deep-research to use the shared components.

### Changes Required

#### 1. Shared Slide Interface

**File**: `lib/presentations/types.ts` (NEW)

```typescript
export interface Slide {
  slug: string;
  title: string;
  steps: number;
}

export function createSlideRegistry(slides: Slide[]) {
  return {
    getAllSlides: () => slides,
    getSlideBySlug: (slug: string) => slides.find(s => s.slug === slug) ?? null,
    getAllSlideSlugs: () => slides.map(s => s.slug),
    getSlideIndex: (slug: string) => slides.findIndex(s => s.slug === slug),
    getAdjacentSlugs: (slug: string) => {
      const idx = slides.findIndex(s => s.slug === slug);
      return {
        prev: idx > 0 ? slides[idx - 1].slug : null,
        next: idx < slides.length - 1 ? slides[idx + 1].slug : null,
      };
    },
    getSlideSteps: (slug: string) => slides.find(s => s.slug === slug)?.steps ?? 0,
  };
}
```

#### 2. Shared Title Slide

**File**: `components/presentations/shared/title-slide.tsx` (NEW)

```tsx
'use client';

import { motion } from 'framer-motion';

interface TitleSlideProps {
  title: string;
  subtitle: string;
  speaker: string;
}

export function TitleSlide({ title, subtitle, speaker }: TitleSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-6xl md:text-8xl font-bold mb-6 tracking-tight text-primary neon-glow"
      >
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-xl md:text-2xl text-muted-foreground mb-8"
      >
        {subtitle}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-lg text-muted-foreground/80"
      >
        {speaker}
      </motion.p>
    </div>
  );
}
```

#### 3. Shared About Slide

**File**: `components/presentations/shared/about-slide.tsx` (NEW)

Extract the `AboutSlide` from `components/presentations/deep-research/slides/05-about.tsx`. Parameterize with props:

```typescript
interface AboutCard {
  content: React.ReactNode;
  rotate: number;
  x: number;
  y: number;
  bg: string;
  border: string;
  width: string;
  delay: number;
}

interface AboutSlideProps {
  name: string;
  initials: string;
  tagline: string;
  cards: AboutCard[];
}
```

Keep the same framer-motion animations and tape-strip decoration. The `cards` array is passed in by each presentation.

#### 4. Shared Resources Slide

**File**: `components/presentations/shared/resources-slide.tsx` (NEW)

```tsx
'use client';

import { motion } from 'framer-motion';

interface ResourcesSlideProps {
  heading?: string;
  subheading?: string;
  resources: { label: string; url: string }[];
  footer: string;
}

export function ResourcesSlide({
  heading = 'Questions?',
  subheading = 'Go Deeper',
  resources,
  footer,
}: ResourcesSlideProps) {
  // Same layout as deep-research/19-resources.tsx but with props
}
```

#### 5. Shared Presentation Layout

**File**: `components/presentations/shared/presentation-layout.tsx` (NEW)

Extract the layout from `app/presentations/deep-research/layout.tsx`. Parameterize:

```typescript
interface PresentationLayoutProps {
  children: React.ReactNode;
  basePath: string; // e.g., '/presentations/voice-agents'
  slides: Slide[];
  sidebar?: React.ReactNode; // Optional sidebar (for Jarvis)
}
```

Export the `SlideStepContext` and `useSlideStep` hook from this shared file. The layout accepts a `sidebar` prop that renders alongside the slide content.

#### 6. Refactor Deep Research to Use Shared Components

- Update `lib/presentations/deep-research.ts` to use `createSlideRegistry` from `lib/presentations/types.ts`
- Update `components/presentations/deep-research/slides/01-title.tsx` to use shared `TitleSlide`
- Update `components/presentations/deep-research/slides/05-about.tsx` to use shared `AboutSlide`
- Update `components/presentations/deep-research/slides/19-resources.tsx` to use shared `ResourcesSlide`
- Update `app/presentations/deep-research/layout.tsx` to use shared `PresentationLayout`

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `pnpm build`
- [x] Linting passes: `pnpm lint`
- [x] Type checks pass: `pnpm exec tsc --noEmit`

#### Manual Verification:
- [ ] Deep-research presentation still works identically at `/presentations/deep-research/`
- [ ] All 22 slides render correctly with animations
- [ ] Keyboard navigation and sub-steps still work

---

## Phase 2: Voice Agents Slide Scaffolding

### Overview
Create the full presentation scaffolding: slide registry, routes, redirect, index entry, and all 19 slide components with placeholder content.

### Changes Required

#### 1. Slide Registry

**File**: `lib/presentations/voice-agents.ts` (NEW)

```typescript
import { type Slide, createSlideRegistry } from './types';

const slides: Slide[] = [
  { slug: '01-title', title: 'Building Real-Time Voice Agents', steps: 0 },
  { slug: '02-about', title: 'Emil Wåreus', steps: 0 },
  { slug: '03-the-dream', title: '"Hey Jarvis..." — What We\'re Building', steps: 1 },
  { slug: '04-architecture-overview', title: 'The Voice Agent Pipeline', steps: 3 },
  { slug: '05-stt-landscape', title: 'Speech-to-Text: The Ears', steps: 2 },
  { slug: '06-whisper-deep-dive', title: 'Whisper: How It Works', steps: 2 },
  { slug: '07-tts-landscape', title: 'Text-to-Speech: The Voice', steps: 2 },
  { slug: '08-kokoro-deep-dive', title: 'Kokoro-82M: Fast & Open TTS', steps: 2 },
  { slug: '09-vad', title: 'Voice Activity Detection', steps: 2 },
  { slug: '10-realtime-transport', title: 'Making It Feel Real-Time', steps: 3 },
  { slug: '11-latency-budget', title: 'The Latency Budget', steps: 2 },
  { slug: '12-podidex-architecture', title: 'Podidex: Talk to Your Podcast', steps: 2 },
  { slug: '13-podidex-demo', title: 'Live Demo: Podidex Voice Chat', steps: 0 },
  { slug: '14-homegrown-vs-api', title: 'Homegrown vs API: Trade-offs', steps: 2 },
  { slug: '15-code-walkthrough', title: "Let's Build It", steps: 0 },
  { slug: '16-jarvis-reveal', title: '"Jarvis, what have we talked about?"', steps: 0 },
  { slug: '17-how-jarvis-works', title: 'How Jarvis Was Built', steps: 2 },
  { slug: '18-takeaways', title: 'What You Can Build Today', steps: 0 },
  { slug: '19-resources', title: 'Questions & Resources', steps: 0 },
];

const registry = createSlideRegistry(slides);
export const {
  getAllSlides,
  getSlideBySlug,
  getAllSlideSlugs,
  getSlideIndex,
  getAdjacentSlugs,
  getSlideSteps,
} = registry;
```

#### 2. Presentation Routes

**File**: `app/presentations/voice-agents/page.tsx` (NEW)
- Redirect to `/presentations/voice-agents/01-title`
- `export const dynamic = 'error'`

**File**: `app/presentations/voice-agents/layout.tsx` (NEW)
- Use shared `PresentationLayout` with `basePath="/presentations/voice-agents"`
- Pass the voice-agents slide registry
- Include `JarvisSidebar` as the `sidebar` prop (placeholder for now, wired in Phase 6)

**File**: `app/presentations/voice-agents/[slide]/page.tsx` (NEW)
- `generateStaticParams` from voice-agents registry
- `generateMetadata` with title pattern
- Switch/case for all 19 slides with dynamic imports
- `export const dynamic = 'error'`, `export const revalidate = false`

#### 3. All 19 Slide Components

**Directory**: `components/presentations/voice-agents/slides/` (NEW)

Each slide is a Client Component. For Phase 2, most will have placeholder content that we'll flesh out later. Key slides that use shared components:

- `01-title.tsx` → Uses `TitleSlide` with props: title="Building Real-Time Voice Agents", subtitle="Malmö AI Devs", speaker="Emil Wåreus"
- `02-about.tsx` → Uses `AboutSlide` with updated cards (include Podidex prominently)
- `19-resources.tsx` → Uses `ResourcesSlide` with voice-agent-relevant resources

Slides with real content to implement in this phase:

- `04-architecture-overview.tsx` — Pipeline diagram: Mic → VAD → STT → LLM → TTS → Speaker (step-reveal)
- `11-latency-budget.tsx` — Latency table with step-reveal
- `13-podidex-demo.tsx` — "Switch to Podidex" placeholder
- `15-code-walkthrough.tsx` — "Switch to terminal" placeholder

All other slides get basic structure with title + bullet points that we'll enhance.

#### 4. Update Presentations Index

**File**: `app/presentations/page.tsx`

Add the voice-agents presentation to the `presentations` array:

```typescript
{
  title: 'Building Real-Time Voice Agents',
  description: 'Explore STT, TTS, VAD, and WebSockets — and meet Jarvis, the AI co-presenter',
  href: '/presentations/voice-agents',
  venue: 'Malmö AI Devs',
  date: 'TBD 2026',
},
```

#### 5. Static Assets

**Directory**: `public/presentations/voice-agents/` (NEW)

Create directory structure:
```
public/presentations/voice-agents/
├── logos/          # Tech logos (whisper, kokoro, groq, silero, etc.)
└── diagrams/       # Architecture diagrams
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `pnpm build` (all 19 slides statically generated)
- [x] Linting passes: `pnpm lint`
- [x] Type checks pass: `pnpm exec tsc --noEmit`

#### Manual Verification:
- [ ] `/presentations/` shows both presentations
- [ ] `/presentations/voice-agents/` redirects to first slide
- [ ] Arrow keys navigate through all 19 slides
- [ ] Step animations work on slides with `steps > 0`
- [ ] Progress bar and slide counter update correctly

---

## Phase 3: Jarvis Python Backend

### Overview
Build the local Python backend for Jarvis: a WebSocket server that runs the full voice pipeline (Silero VAD → faster-whisper STT → Groq LLM with tools → Kokoro TTS). Adapts patterns from Podidex's `tts/voice_chat/` but simplified for the presentation use case.

### File Structure

```
presentations/voice-agents/jarvis/
├── __init__.py
├── server.py           # FastAPI + WebSocket entry point
├── models.py           # ModelManager (Whisper + Kokoro + VAD loading)
├── pipeline.py         # JarvisPipeline (VAD → STT → LLM → TTS orchestration)
├── agent.py            # Groq LLM agent with tools (respond, update_thinking)
├── audio.py            # Audio resampling utilities
├── config.py           # Constants and configuration
├── requirements.txt    # Python dependencies
└── README.md           # Setup instructions
```

### Changes Required

#### 1. Configuration

**File**: `presentations/voice-agents/jarvis/config.py` (NEW)

```python
# Audio
INPUT_SAMPLE_RATE = 16000       # Browser sends 16kHz mono PCM
OUTPUT_SAMPLE_RATE = 24000      # Kokoro outputs 24kHz
CHUNK_MS = 30                   # VAD chunk size
CHUNK_SAMPLES = int(INPUT_SAMPLE_RATE * CHUNK_MS / 1000)  # 480

# VAD
VAD_THRESHOLD = 0.5             # Silero confidence threshold
SILENCE_DURATION_MS = 700       # ms of silence before utterance end
SILENCE_CHUNKS = int(SILENCE_DURATION_MS / CHUNK_MS)  # ~23 chunks

# STT
WHISPER_MODEL = "small"
WHISPER_COMPUTE_TYPE = "int8"   # CPU-friendly on macOS

# LLM
GROQ_MODEL = "openai/gpt-oss-120b"
MAX_TOKENS = 300                # Keep responses concise for voice
TEMPERATURE = 0.7

# TTS
KOKORO_VOICE = "am_adam"        # Male American — Jarvis voice
KOKORO_SPEED = 1.0
KOKORO_LANG = "en-us"

# Server
WS_PORT = 8765
```

#### 2. Model Manager

**File**: `presentations/voice-agents/jarvis/models.py` (NEW)

Adapted from Podidex `tts/voice_chat/models.py`. Simplified for CPU-only macOS:

```python
import threading
import numpy as np

class ModelManager:
    """Loads and manages Whisper, Kokoro, and Silero VAD models."""

    def __init__(self):
        self._stt_lock = threading.Lock()
        self._tts_lock = threading.Lock()
        self._whisper = None
        self._kokoro = None
        self._vad = None

    def load_all(self):
        """Load all models. Call once at startup."""
        # Silero VAD (1.8MB, instant load)
        from silero_vad import load_silero_vad
        self._vad = load_silero_vad()

        # faster-whisper (small model, CPU int8)
        from faster_whisper import WhisperModel
        self._whisper = WhisperModel("small", device="cpu", compute_type="int8")

        # kokoro-onnx (CPU, ~80MB quantized)
        import kokoro_onnx
        self._kokoro = kokoro_onnx.Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")

        # Pre-warm TTS
        self._kokoro.create("warmup", voice="am_adam", speed=1.0, lang="en-us")

    def vad_predict(self, audio_chunk: np.ndarray, sample_rate: int) -> float:
        """Returns speech probability for a 30ms chunk."""
        import torch
        tensor = torch.from_numpy(audio_chunk).float()
        return self._vad(tensor, sample_rate).item()

    def transcribe(self, audio: np.ndarray) -> str:
        """Transcribe audio with Whisper. Thread-safe."""
        with self._stt_lock:
            segments, _ = self._whisper.transcribe(audio, beam_size=5, language="en")
            return " ".join(s.text for s in segments).strip()

    def synthesize(self, text: str) -> tuple[np.ndarray, int]:
        """Synthesize text to audio with Kokoro. Thread-safe. Returns (samples, sample_rate)."""
        with self._tts_lock:
            samples, sr = self._kokoro.create(text, voice="am_adam", speed=1.0, lang="en-us")
            return samples, sr

    async def synthesize_stream(self, text: str):
        """Async generator yielding (samples, sample_rate) chunks."""
        with self._tts_lock:
            stream = self._kokoro.create_stream(text, voice="am_adam", speed=1.0, lang="en-us")
            async for samples, sr in stream:
                yield samples, sr
```

#### 3. Groq Agent with Tools

**File**: `presentations/voice-agents/jarvis/agent.py` (NEW)

```python
import json
from groq import Groq
from .config import GROQ_MODEL, MAX_TOKENS, TEMPERATURE

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "respond",
            "description": "Generate a spoken voice response to the audience. ONLY call this when the user says 'hey Jarvis' or directly addresses Jarvis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "The text to speak aloud. Keep it concise (1-3 sentences)."
                    }
                },
                "required": ["text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_thinking",
            "description": "Update the thinking display in the sidebar. Use this to show observations, insights, or processing status WITHOUT speaking aloud.",
            "parameters": {
                "type": "object",
                "properties": {
                    "thought": {
                        "type": "string",
                        "description": "Internal observation or note to display in the sidebar."
                    }
                },
                "required": ["thought"]
            }
        }
    }
]

def build_system_prompt(slide_context: dict) -> str:
    return f"""You are Jarvis, an AI co-presenter at a technical talk about building real-time voice agents.
You are co-presenting with Emil Wåreus at Malmö AI Devs. You are always listening and aware of what is being said.

Current slide: {slide_context.get('current_title', 'Unknown')}
Current slide content: {slide_context.get('current_notes', '')}
Next slide: {slide_context.get('next_title', 'None')}
Slides remaining: {slide_context.get('remaining', 0)}

You have been built using:
- faster-whisper (small model) for speech-to-text
- Kokoro-82M (kokoro-onnx, am_adam voice) for text-to-speech
- Silero VAD for voice activity detection
- Groq API (GPT-OSS 120B) for reasoning
- WebSocket (WSS via mkcert) for real-time audio streaming
- All running locally on macOS (no Docker)

Rules:
- You are ALWAYS listening and processing what you hear
- Use update_thinking to show your observations in the sidebar (the audience can see this)
- ONLY use the respond tool when you hear "hey Jarvis" or are directly addressed by name
- When responding, keep it concise (1-3 sentences) — you're speaking aloud
- You know the full presentation content and can preview upcoming topics
- Be witty, sharp, and technically knowledgeable
- Reference specific things that were said earlier in the talk
- If asked about yourself, explain how you were built (the tech stack above)

Conversation so far (what you've heard):
"""

class JarvisAgent:
    def __init__(self):
        self.client = Groq()
        self.conversation_history: list[dict] = []
        self.slide_context: dict = {}
        self.transcript_buffer: str = ""

    def update_slide_context(self, context: dict):
        self.slide_context = context

    def append_transcript(self, text: str):
        """Append heard speech to the transcript buffer."""
        self.transcript_buffer += " " + text
        # Keep last ~2000 chars to manage context size
        if len(self.transcript_buffer) > 2000:
            self.transcript_buffer = self.transcript_buffer[-2000:]

    def process_utterance(self, transcript: str) -> list[dict]:
        """Process a complete utterance. Returns list of tool calls to execute."""
        self.append_transcript(transcript)

        self.conversation_history.append({"role": "user", "content": transcript})

        # Keep last 20 messages
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]

        messages = [
            {"role": "system", "content": build_system_prompt(self.slide_context)},
            *self.conversation_history,
        ]

        response = self.client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
        )

        message = response.choices[0].message
        tool_calls = []

        if message.tool_calls:
            for tc in message.tool_calls:
                args = json.loads(tc.function.arguments)
                tool_calls.append({
                    "name": tc.function.name,
                    "args": args,
                })
            # Add assistant message with tool calls to history
            self.conversation_history.append({
                "role": "assistant",
                "content": message.content or "",
                "tool_calls_summary": [t["name"] for t in tool_calls],
            })
        elif message.content:
            # No tools called — agent decided not to act
            self.conversation_history.append({
                "role": "assistant",
                "content": message.content,
            })

        return tool_calls
```

#### 4. Voice Pipeline

**File**: `presentations/voice-agents/jarvis/pipeline.py` (NEW)

Orchestrates: Audio In → VAD → STT → Agent → TTS → Audio Out.

```python
import asyncio
import json
import numpy as np
from .models import ModelManager
from .agent import JarvisAgent
from .config import (
    INPUT_SAMPLE_RATE, OUTPUT_SAMPLE_RATE, CHUNK_SAMPLES,
    VAD_THRESHOLD, SILENCE_CHUNKS
)

class JarvisPipeline:
    def __init__(self, models: ModelManager, send_json, send_audio):
        self.models = models
        self.send_json = send_json      # async callable to send JSON to browser
        self.send_audio = send_audio    # async callable to send PCM bytes to browser
        self.agent = JarvisAgent()

        self.audio_buffer: list[np.ndarray] = []
        self.is_speaking = False
        self.silence_count = 0
        self.is_tts_playing = False

    async def feed_audio(self, pcm_bytes: bytes, is_tts_playing: bool):
        """Process incoming audio chunk from the browser."""
        self.is_tts_playing = is_tts_playing

        # Skip processing if TTS is playing (echo suppression)
        if is_tts_playing:
            return

        chunk = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0

        # VAD
        speech_prob = self.models.vad_predict(chunk, INPUT_SAMPLE_RATE)

        if speech_prob >= VAD_THRESHOLD:
            self.is_speaking = True
            self.silence_count = 0
            self.audio_buffer.append(chunk)

            # Send partial transcript indicator
            await self.send_json({"type": "listening", "active": True})

        elif self.is_speaking:
            self.silence_count += 1
            self.audio_buffer.append(chunk)

            if self.silence_count >= SILENCE_CHUNKS:
                # Utterance complete
                await self._process_utterance()
                self.audio_buffer = []
                self.is_speaking = False
                self.silence_count = 0

    async def _process_utterance(self):
        """Process a complete utterance through STT → Agent → TTS."""
        if not self.audio_buffer:
            return

        full_audio = np.concatenate(self.audio_buffer)

        # STT
        transcript = self.models.transcribe(full_audio)
        if not transcript.strip():
            return

        # Send transcript to browser
        await self.send_json({
            "type": "transcript",
            "text": transcript,
            "role": "user",
        })

        # Agent processing
        await self.send_json({"type": "status", "status": "thinking"})

        tool_calls = self.agent.process_utterance(transcript)

        for tc in tool_calls:
            if tc["name"] == "update_thinking":
                await self.send_json({
                    "type": "thinking",
                    "text": tc["args"]["thought"],
                })
            elif tc["name"] == "respond":
                response_text = tc["args"]["text"]

                # Send response text to sidebar
                await self.send_json({
                    "type": "transcript",
                    "text": response_text,
                    "role": "assistant",
                })

                # Synthesize and stream audio
                await self.send_json({"type": "status", "status": "speaking"})
                await self._synthesize_and_send(response_text)
                await self.send_json({"type": "status", "status": "idle"})

        if not tool_calls:
            await self.send_json({"type": "status", "status": "idle"})

    async def _synthesize_and_send(self, text: str):
        """Synthesize text with Kokoro and stream audio to the browser."""
        # Use streaming TTS for lower latency
        async for samples, sr in self.models.synthesize_stream(text):
            # Convert float32 to int16 PCM
            int16_samples = (samples * 32768).astype(np.int16)
            await self.send_audio(int16_samples.tobytes())

    def update_slide_context(self, context: dict):
        """Update the agent's knowledge of the current slide."""
        self.agent.update_slide_context(context)
```

#### 5. WebSocket Server

**File**: `presentations/voice-agents/jarvis/server.py` (NEW)

```python
import asyncio
import json
import os
import ssl
import struct
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .models import ModelManager
from .pipeline import JarvisPipeline
from .config import WS_PORT

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared model manager
models = ModelManager()

@app.on_event("startup")
async def startup():
    print("Loading models...")
    models.load_all()
    print("Models loaded. Jarvis is ready.")

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("Client connected")

    async def send_json(data: dict):
        await ws.send_text(json.dumps(data))

    async def send_audio(pcm_bytes: bytes):
        await ws.send_bytes(pcm_bytes)

    pipeline = JarvisPipeline(models, send_json, send_audio)

    try:
        while True:
            message = await ws.receive()

            if "bytes" in message:
                # Binary: audio frame with 4-byte flags header
                data = message["bytes"]
                if len(data) > 4:
                    flags = struct.unpack('<I', data[:4])[0]
                    is_tts_playing = bool(flags & 1)
                    pcm_data = data[4:]
                    await pipeline.feed_audio(pcm_data, is_tts_playing)

            elif "text" in message:
                msg = json.loads(message["text"])
                msg_type = msg.get("type")

                if msg_type == "slide_context":
                    pipeline.update_slide_context(msg.get("context", {}))
                elif msg_type == "shutdown":
                    break

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")

def main():
    ssl_keyfile = os.environ.get("SSL_KEYFILE", "localhost+1-key.pem")
    ssl_certfile = os.environ.get("SSL_CERTFILE", "localhost+1.pem")

    use_ssl = os.path.exists(ssl_certfile) and os.path.exists(ssl_keyfile)

    print(f"Starting Jarvis on {'wss' if use_ssl else 'ws'}://localhost:{WS_PORT}")

    uvicorn.run(
        "jarvis.server:app",
        host="0.0.0.0",
        port=WS_PORT,
        ssl_keyfile=ssl_keyfile if use_ssl else None,
        ssl_certfile=ssl_certfile if use_ssl else None,
    )

if __name__ == "__main__":
    main()
```

#### 6. Dependencies

**File**: `presentations/voice-agents/jarvis/requirements.txt` (NEW)

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
faster-whisper>=1.0.0
kokoro-onnx>=0.4.0
silero-vad>=5.1
groq>=0.11.0
numpy>=1.24.0
soundfile>=0.12.0
torch>=2.0.0
```

#### 7. Setup Instructions

**File**: `presentations/voice-agents/jarvis/README.md` (NEW)

Quick setup guide:
1. Install system deps (`brew install espeak-ng mkcert`)
2. Setup mkcert SSL
3. Create venv, install requirements
4. Download Kokoro models to `models/`
5. Set `GROQ_API_KEY`
6. Run with `python -m jarvis.server`

### Success Criteria

#### Automated Verification:
- [x] `cd presentations/voice-agents/jarvis && python -c "from jarvis.config import *; print('Config OK')"` succeeds
- [x] `python -c "from jarvis.models import ModelManager; print('Imports OK')"` succeeds

#### Manual Verification:
- [ ] `python -m jarvis.server` starts without errors, prints "Jarvis is ready"
- [ ] WebSocket connection via `websocat wss://localhost:8765/ws` succeeds
- [ ] Sending audio data results in transcription JSON messages back
- [ ] Sending audio with "hey Jarvis" triggers a TTS audio response
- [ ] Agent shows thinking observations for non-Jarvis speech

---

## Phase 4: Jarvis Frontend

### Overview
Build the browser-side components: WebSocket client for audio I/O, the Jarvis sidebar UI, and the React context that manages state across slides.

### Changes Required

#### 1. Jarvis Context Provider

**File**: `components/presentations/voice-agents/jarvis/jarvis-context.tsx` (NEW)

React context that manages:
- WebSocket connection lifecycle
- Audio capture (mic → WebSocket)
- Audio playback (WebSocket → speakers)
- Message history (transcripts, thinking, responses)
- Connection status
- Current TTS playing state (sent with each audio frame)

```typescript
'use client';

import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';

interface JarvisMessage {
  id: string;
  type: 'transcript' | 'thinking' | 'status';
  role?: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface JarvisContextType {
  messages: JarvisMessage[];
  status: 'disconnected' | 'connecting' | 'idle' | 'listening' | 'thinking' | 'speaking';
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendSlideContext: (context: SlideContext) => void;
}

interface SlideContext {
  current_title: string;
  current_notes: string;
  next_title: string;
  remaining: number;
}
```

Key implementation details:
- Uses `AudioWorklet` for mic capture (not deprecated `ScriptProcessorNode`)
- Sends binary frames: 4-byte flags header (bit 0 = isTtsPlaying) + PCM int16 data
- Receives JSON messages (transcript, thinking, status) and binary audio (TTS response)
- Plays received audio via Web Audio API `AudioBufferSourceNode`
- Sends `slide_context` JSON when the presentation navigates

#### 2. Audio Capture Worklet

**File**: `public/presentations/voice-agents/audio-capture-worklet.js` (NEW)

AudioWorklet processor that:
- Captures mic audio at device sample rate
- Resamples to 16kHz mono if needed
- Buffers into 30ms frames (480 samples at 16kHz)
- Posts Int16 PCM to main thread

Based on the Podidex pattern at `apps/web/public/audio-capture-worklet.js`.

#### 3. Audio Playback

Reuse the Web Audio API pattern from Podidex. Receive Int16 PCM at 24kHz from Kokoro, convert to Float32, create AudioBuffer, and play through AudioContext.

Simple queue-based approach:
```typescript
class AudioQueue {
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private ctx: AudioContext;
  private onPlayingChange: (playing: boolean) => void;

  enqueue(pcmInt16: ArrayBuffer) { /* ... */ }
  private playNext() { /* chain AudioBufferSourceNode.onended */ }
}
```

#### 4. Jarvis Sidebar Component

**File**: `components/presentations/voice-agents/jarvis/jarvis-sidebar.tsx` (NEW)

```tsx
'use client';

import { useJarvis } from './jarvis-context';
import { motion, AnimatePresence } from 'framer-motion';

export function JarvisSidebar() {
  const { messages, status, isConnected, connect } = useJarvis();

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-background/95 backdrop-blur border-l border-primary/20 z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor(status)}`} />
          <h3 className="text-primary font-mono text-sm font-bold tracking-wider">JARVIS</h3>
        </div>
        <span className="text-xs text-muted-foreground">{statusLabel(status)}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={messageClass(msg)}
            >
              {msg.type === 'thinking' && (
                <span className="text-xs text-muted-foreground italic">💭 </span>
              )}
              <span className="text-sm">{msg.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Connect button (shown when disconnected) */}
      {!isConnected && (
        <div className="p-4 border-t border-primary/20">
          <button onClick={connect} className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded text-sm font-mono">
            Activate Jarvis
          </button>
        </div>
      )}
    </div>
  );
}
```

#### 5. Slide Context Sync

In the shared `PresentationLayout`, when the slide changes, send the current slide context to Jarvis:

```typescript
// In the layout, on route change:
useEffect(() => {
  const slide = getSlideBySlug(currentSlug);
  const adjacent = getAdjacentSlugs(currentSlug);
  const nextSlide = adjacent.next ? getSlideBySlug(adjacent.next) : null;

  jarvis.sendSlideContext({
    current_title: slide?.title ?? '',
    current_notes: '', // Could include slide content summary
    next_title: nextSlide?.title ?? 'End of presentation',
    remaining: getAllSlides().length - getSlideIndex(currentSlug) - 1,
  });
}, [currentSlug]);
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `pnpm build`
- [x] Linting passes: `pnpm lint`
- [x] Type checks pass: `pnpm exec tsc --noEmit`

#### Manual Verification:
- [ ] Jarvis sidebar renders on all slides (right side, 320px wide)
- [ ] "Activate Jarvis" button connects to `wss://localhost:8765/ws`
- [ ] Status indicator shows correct state (idle/listening/thinking/speaking)
- [ ] User speech appears as transcript messages in sidebar
- [ ] Thinking observations appear with 💭 prefix
- [ ] "hey Jarvis" triggers audio response through speakers
- [ ] Slide navigation sends context update to backend
- [ ] Sidebar auto-scrolls to latest message

---

## Phase 5: Example Code Scripts

### Overview
Write 5 standalone Python scripts for the code walkthrough slide. These are runnable demos the audience can try.

### Changes Required

**Directory**: `presentations/voice-agents/examples/` (NEW)

#### 1. `01-whisper-basic.py`
Record 5 seconds from mic, transcribe with faster-whisper. Print result.

#### 2. `02-vad-streaming.py`
Stream mic audio through Silero VAD, print "Speaking..." / "Silence..." in real-time.

#### 3. `03-kokoro-tts.py`
Synthesize a sentence with Kokoro, play through speakers.

#### 4. `04-groq-streaming.py`
Stream a Groq chat completion, print tokens as they arrive.

#### 5. `05-full-pipeline.py`
Minimal end-to-end: VAD → Whisper → Groq → Kokoro → speaker. ~100 lines.

#### 6. `requirements.txt`
Shared requirements for all examples.

### Success Criteria

#### Automated Verification:
- [x] All scripts parse without syntax errors: `python -m py_compile presentations/voice-agents/examples/01-whisper-basic.py` (for each)

#### Manual Verification:
- [ ] Each script runs successfully on macOS with the venv activated
- [ ] `01-whisper-basic.py` transcribes spoken audio correctly
- [ ] `03-kokoro-tts.py` produces audible speech
- [ ] `05-full-pipeline.py` demonstrates the full voice loop

---

## Phase 6: Integration & Polish

### Overview
Wire Jarvis into the presentation layout, flesh out slide content, and do final testing.

### Changes Required

#### 1. Wire Jarvis Sidebar into Layout

Update `app/presentations/voice-agents/layout.tsx` to:
- Wrap children with `JarvisProvider`
- Pass `JarvisSidebar` as the sidebar prop
- Adjust main content width to account for 320px sidebar

#### 2. Flesh Out Key Slides

Priority slides to give full visual treatment:

- **`04-architecture-overview.tsx`** — Animated pipeline diagram (Mic → VAD → STT → LLM → TTS → Speaker) with step reveals for each component
- **`06-whisper-deep-dive.tsx`** — Whisper architecture diagram, model size comparison table
- **`08-kokoro-deep-dive.tsx`** — Kokoro stats, voice demo (could trigger a Jarvis demo)
- **`10-realtime-transport.tsx`** — WebSocket vs WebRTC comparison, binary frame diagram, AudioWorklet explanation
- **`11-latency-budget.tsx`** — Animated latency waterfall chart
- **`14-homegrown-vs-api.tsx`** — Side-by-side comparison table (Whisper+Kokoro vs Gemini Native Audio)
- **`16-jarvis-reveal.tsx`** — The big moment: prompt the audience, say "Hey Jarvis, what have we talked about so far?"
- **`17-how-jarvis-works.tsx`** — Self-referential architecture diagram showing the Jarvis stack

#### 3. Presentation Content for Agent Context

Create a slide content summary that gets loaded into the Jarvis agent's system prompt, so it knows what each slide contains:

**File**: `presentations/voice-agents/jarvis/slide-content.json` (NEW)

```json
{
  "slides": [
    { "slug": "01-title", "title": "Building Real-Time Voice Agents", "notes": "Opening slide. Emil introduces the talk." },
    { "slug": "02-about", "title": "Emil Wåreus", "notes": "About the presenter. Works on Podidex, oaiz, etc." },
    ...
  ]
}
```

#### 4. Final Testing Checklist

- Full run-through of all 19 slides
- Jarvis active throughout, showing thinking
- "Hey Jarvis" triggers at slides 3, 16, and improvised
- Podidex demo works (slide 13)
- Example code scripts work (slide 15)

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `pnpm build`
- [x] Linting passes: `pnpm lint`
- [x] Type checks pass: `pnpm exec tsc --noEmit`

#### Manual Verification:
- [ ] Complete presentation run-through with Jarvis active
- [ ] Jarvis responds to "hey Jarvis" with audible speech
- [ ] Jarvis shows thinking observations throughout the talk
- [ ] Slide context updates correctly when navigating
- [ ] No audio echo or feedback loops
- [ ] Latency is acceptable (<2s to first audio)
- [ ] Podidex live demo works
- [ ] Example code walkthrough works

---

## Testing Strategy

### Unit Tests
Not applicable — this is a presentation, not a library.

### Integration Tests
- Python backend: Start server, connect WebSocket, send audio, verify transcription response
- Frontend: Verify sidebar renders, WebSocket connects, messages display

### Manual Testing Steps
1. Start Python backend: `cd presentations/voice-agents/jarvis && python -m jarvis.server`
2. Start Next.js: `pnpm dev` (human-operated)
3. Navigate to `/presentations/voice-agents/`
4. Click "Activate Jarvis" in sidebar
5. Speak into mic — verify transcription appears
6. Say "hey Jarvis, introduce yourself" — verify audio response
7. Navigate through all 19 slides with arrow keys
8. Verify Jarvis shows thinking updates on each slide
9. On slide 16, say "Jarvis, what have we talked about so far?" — verify contextual response

## Performance Considerations

- **Model loading**: ~10-15 seconds at startup (Whisper small + Kokoro + Silero). Pre-start before the talk.
- **Memory**: ~2GB RAM for all models on CPU
- **CPU load**: Whisper transcription is the bottleneck (~300ms for 3s audio on M1). Single-threaded during inference.
- **Audio latency**: Target <2s from end of speech to first audio. Optimize with shorter VAD silence threshold (700ms vs Podidex's 900ms).
- **Kokoro streaming**: Use `create_stream()` to yield audio sentence-by-sentence, reducing perceived latency.

## References

- Research document: `thoughts/shared/research/2026-03-16_voice-agents-presentation.md`
- Existing presentation architecture: `thoughts/shared/research/2026-02-02_15-31-59_presentation-architecture.md`
- Podidex voice chat pipeline: `/Users/emilwareus/Development/podidex/tts/voice_chat/pipeline.py`
- Podidex dev server: `/Users/emilwareus/Development/podidex/tts/voice_chat/dev_server.py`
- Podidex model manager: `/Users/emilwareus/Development/podidex/tts/voice_chat/models.py`
- faster-whisper: https://github.com/SYSTRAN/faster-whisper
- kokoro-onnx: https://github.com/thewh1teagle/kokoro-onnx
- Silero VAD: https://github.com/snakers4/silero-vad
- Groq docs: https://console.groq.com/docs
