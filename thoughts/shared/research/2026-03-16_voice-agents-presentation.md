---
date: 2026-03-16T12:00:00Z
researcher: Claude
git_commit: 7551a68cc1c0e060223bc46eff0c0412a83a96a1
branch: main
repository: addcommitpush.io
topic: "Voice Agents Presentation with Jarvis AI Co-Presenter"
tags: [research, presentation, voice-agents, whisper, kokoro, groq, vad, webrtc, websockets, jarvis, stt, tts]
status: complete
last_updated: 2026-03-16
last_updated_by: Claude
---

# Research: Voice Agents Presentation with Jarvis AI Co-Presenter

**Date**: 2026-03-16T12:00:00Z
**Researcher**: Claude
**Git Commit**: 7551a68cc1c0e060223bc46eff0c0412a83a96a1
**Branch**: main
**Repository**: addcommitpush.io

## Research Question

How to build a 30-minute technical presentation on building real-time voice agents (STT, TTS, VAD, WebSockets) with a live AI co-presenter called "Jarvis" — fully local using Whisper, Kokoro, and Groq — integrated into the addcommitpush.io presentation system.

## Summary

The presentation system already exists as a robust custom slide deck in Next.js App Router with keyboard navigation, sub-step animations, and Framer Motion transitions. The deep-research presentation provides a proven template. Key reusable components (title, about/bio, resources slides, navigation layout) need parameterization. The Jarvis AI co-presenter is feasible using a local Python backend (faster-whisper + Groq API + kokoro-onnx + silero-vad) connected to the presentation frontend via WebSocket. The main challenge is mixed-content (HTTPS site -> ws://localhost), solvable with mkcert for local WSS or running everything on localhost.

---

## Phase 1: Presentation Outline & Design

### Proposed Slide Order (~30 minutes)

| # | Slug | Title | Steps | Time | Type |
|---|---|---|---|---|---|
| 01 | `01-title` | Building Real-Time Voice Agents | 0 | 0:30 | Title (reusable) |
| 02 | `02-about` | Emil Wåreus | 0 | 1:00 | About (reusable) |
| 03 | `03-the-dream` | "Hey Jarvis..." — What We're Building | 1 | 1:30 | Hook: Show the Jarvis sidebar, explain the vision |
| 04 | `04-architecture-overview` | The Voice Agent Pipeline | 3 | 2:00 | Pipeline diagram: Mic → VAD → STT → LLM → TTS → Speaker |
| 05 | `05-stt-landscape` | Speech-to-Text: The Ears | 2 | 2:30 | Whisper, faster-whisper, Moonshine, cloud APIs |
| 06 | `06-whisper-deep-dive` | Whisper: How It Works | 2 | 2:30 | Architecture, models, latency tradeoffs |
| 07 | `07-tts-landscape` | Text-to-Speech: The Voice | 2 | 2:00 | Kokoro, Bark, XTTS, Piper, cloud APIs |
| 08 | `08-kokoro-deep-dive` | Kokoro-82M: Fast & Open TTS | 2 | 2:30 | 82M params, streaming, voices, latency |
| 09 | `09-vad` | Voice Activity Detection | 2 | 2:00 | Silero VAD, webrtcvad, energy-based, when to listen |
| 10 | `10-realtime-transport` | Making It Feel Real-Time | 3 | 3:00 | WebSockets vs WebRTC, binary frames, AudioWorklet, echo cancellation |
| 11 | `11-latency-budget` | The Latency Budget | 2 | 2:00 | End-to-end breakdown, speculative execution, sentence chunking |
| 12 | `12-podidex-architecture` | Podidex: Talk to Your Podcast | 2 | 2:00 | Architecture overview, provider system |
| 13 | `13-podidex-demo` | Live Demo: Podidex Voice Chat | 0 | 3:00 | Switch to Podidex app |
| 14 | `14-homegrown-vs-api` | Homegrown vs API: Trade-offs | 2 | 2:00 | Whisper+Kokoro vs Gemini Native Audio |
| 15 | `15-code-walkthrough` | Let's Build It | 0 | 3:00 | Live code walkthrough of the voice pipeline |
| 16 | `16-jarvis-reveal` | "Jarvis, what have we talked about?" | 0 | 2:00 | The twist: Jarvis responds live |
| 17 | `17-how-jarvis-works` | How Jarvis Was Built | 2 | 2:00 | Self-referential: the tech behind the co-presenter |
| 18 | `18-takeaways` | What You Can Build Today | 0 | 1:30 | Key takeaways |
| 19 | `19-resources` | Questions & Resources | 0 | 1:00 | Resources (reusable) |

**Total: ~33 minutes** (buffer for Jarvis interactions throughout)

### Narrative Arc

1. **Hook** (slides 1-3): Open with the dream — talking to AI naturally. Introduce Jarvis sidebar (already visible and transcribing).
2. **The Building Blocks** (slides 4-9): Deep dive into each technology. Show code snippets from this repo.
3. **Gluing It Together** (slides 10-11): Real-time transport and latency optimization.
4. **Real-World Application** (slides 12-14): Podidex as a production example. Live demo.
5. **Hands-On** (slide 15): Code walkthrough of the pipeline.
6. **The Twist** (slides 16-17): Reveal Jarvis has been listening all along. Ask it a question. Show how it was built.
7. **Close** (slides 18-19): Takeaways and resources.

---

## Phase 2: Slide Implementation

### Existing Presentation System

The presentation system is at:
- **Routes**: `app/presentations/[presentation-name]/[slide]/page.tsx`
- **Layouts**: `app/presentations/[presentation-name]/layout.tsx` (client, keyboard nav, progress bar)
- **Slide registry**: `lib/presentations/[presentation-name].ts`
- **Slide components**: `components/presentations/[presentation-name]/slides/*.tsx`
- **Assets**: `public/presentations/[presentation-name]/`

### Reusable Components to Extract

From the deep-research presentation, these need parameterization:

#### 1. Shared Title Slide → `components/presentations/shared/title-slide.tsx`

Props: `title`, `subtitle`, `speaker`, `date`, `event`

Current: Hardcoded in `components/presentations/deep-research/slides/01-title.tsx` with staggered framer-motion fade-in (3 tiers: h1, subtitle, speaker+date).

#### 2. Shared About/Bio Slide → `components/presentations/shared/about-slide.tsx`

Props: `name`, `initials`, `tagline`, `cards: Card[]`

Current: `05-about.tsx` — center identity card with scattered project cards using absolute positioning and tape-strip decoration. The `Card` interface (`content`, `rotate`, `x`, `y`, `bg`, `border`, `width`, `delay`) is already cleanly defined.

#### 3. Shared Resources Slide → `components/presentations/shared/resources-slide.tsx`

Props: `heading`, `resources: {label, url}[]`, `footer`

Current: `19-resources.tsx` — "Questions?" heading, resource links, speaker attribution.

#### 4. Shared Presentation Layout → `components/presentations/shared/presentation-layout.tsx`

Props: `basePath`, `slides` (or registry functions)

Current: `app/presentations/deep-research/layout.tsx` — hardcoded import from `@/lib/presentations/deep-research` and base path `/presentations/deep-research/`.

### New Presentation File Structure

```
app/presentations/voice-agents/
├── layout.tsx                              # Imports shared layout + Jarvis sidebar
├── page.tsx                                # Redirects to 01-title
└── [slide]/
    └── page.tsx                            # generateStaticParams + switch/case

components/presentations/voice-agents/
└── slides/
    ├── 01-title.tsx                        # Uses shared TitleSlide
    ├── 02-about.tsx                        # Uses shared AboutSlide
    ├── 03-the-dream.tsx
    ├── 04-architecture-overview.tsx
    ├── 05-stt-landscape.tsx
    ├── 06-whisper-deep-dive.tsx
    ├── 07-tts-landscape.tsx
    ├── 08-kokoro-deep-dive.tsx
    ├── 09-vad.tsx
    ├── 10-realtime-transport.tsx
    ├── 11-latency-budget.tsx
    ├── 12-podidex-architecture.tsx
    ├── 13-podidex-demo.tsx
    ├── 14-homegrown-vs-api.tsx
    ├── 15-code-walkthrough.tsx
    ├── 16-jarvis-reveal.tsx
    ├── 17-how-jarvis-works.tsx
    ├── 18-takeaways.tsx
    └── 19-resources.tsx                    # Uses shared ResourcesSlide

components/presentations/voice-agents/
└── jarvis/
    ├── jarvis-sidebar.tsx                  # Always-visible chat sidebar
    ├── jarvis-transcript.tsx               # Live transcription display
    └── jarvis-status.tsx                   # Thinking/listening/speaking indicator

lib/presentations/
└── voice-agents.ts                         # Slide registry

public/presentations/voice-agents/
├── logos/                                  # Logos for tech (whisper, kokoro, etc.)
└── diagrams/                              # Architecture diagrams
```

### Jarvis Sidebar Component

The Jarvis sidebar is a persistent UI element rendered in the **layout** (not individual slides). It shows:
- Current transcription (what the mic is hearing) — streaming tokens
- Jarvis thinking/processing state
- Jarvis responses (text + audio playback indicator)
- No text input — voice only

```tsx
// Conceptual structure
<div className="fixed right-0 top-0 bottom-0 w-80 bg-background/95 border-l border-primary/20 z-40">
  <div className="p-4 border-b border-primary/20">
    <h3 className="text-primary font-mono">JARVIS</h3>
    <StatusIndicator status={status} /> {/* listening | thinking | speaking | idle */}
  </div>
  <div className="flex-1 overflow-y-auto p-4 space-y-3">
    {messages.map(msg => (
      <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
    ))}
    {currentTranscript && (
      <ChatBubble role="user" content={currentTranscript} partial />
    )}
  </div>
</div>
```

---

## Phase 3: Technical Implementation — Jarvis AI Co-Presenter

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BROWSER (Next.js presentation on Vercel or localhost)                   │
│                                                                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐    │
│  │ Presentation    │  │ Jarvis Sidebar   │  │ Audio I/O            │    │
│  │ Slides          │──│ (always visible) │  │ getUserMedia() →     │    │
│  │ (current slide  │  │ - transcription  │  │ AudioWorklet →       │    │
│  │  context sent   │  │ - thinking log   │  │ WebSocket            │    │
│  │  to Jarvis)     │  │ - responses      │  │ ← PCM playback      │    │
│  └─────────────────┘  └──────────────────┘  └──────────┬───────────┘    │
│                                                         │                │
└─────────────────────────────────────────────────────────┼────────────────┘
                                                          │ wss://localhost:8765
┌─────────────────────────────────────────────────────────▼────────────────┐
│  PYTHON BACKEND (localhost, no Docker)                                    │
│                                                                          │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Silero   │→ │ faster-whisper│→ │ Groq LLM     │→ │ kokoro-onnx  │   │
│  │ VAD      │  │ (small, CPU)  │  │ (cloud API,  │  │ (local, CPU) │   │
│  │ (1.8MB)  │  │               │  │  tools/agent) │  │              │   │
│  └──────────┘  └───────────────┘  └──────────────┘  └──────────────┘   │
│                                                                          │
│  Protocol: Binary PCM audio frames + JSON control messages               │
│  Slide context: JSON messages with current/next slide info               │
│  Agent tools: web_search, respond (TTS), get_slide_context               │
└──────────────────────────────────────────────────────────────────────────┘
```

### Backend: Jarvis Voice Server

**Stack:**
- Python 3.12 + FastAPI + uvicorn
- `faster-whisper` (small model, CPU int8) — STT
- `kokoro-onnx` (~80MB quantized model) — TTS
- `silero-vad` (1.8MB) — VAD
- `groq` SDK — LLM with tool use
- `websockets` — real-time audio transport
- `mkcert` — trusted localhost SSL for WSS

**Processing Pipeline:**

1. **Audio In** (browser → backend): Raw PCM 16kHz mono via WebSocket binary frames
2. **VAD**: Silero VAD classifies each 30ms chunk. Accumulate speech, detect utterance end after ~900ms silence
3. **STT**: faster-whisper transcribes complete utterance. Send transcript to browser for display
4. **Agent Decision**: Groq LLM with tools. System prompt includes:
   - "You are Jarvis, an AI co-presenter at a tech talk about voice agents"
   - Current slide info, next slide info, presentation outline
   - Conversation history
   - Tool definitions: `respond` (generate voice response), `web_search`, `get_slide_context`
5. **Tool: `respond`**: Only called when explicitly asked ("Jarvis, tell us about..."). The LLM generates text, which is:
   - Streamed to browser as text (for sidebar display)
   - Sentence-chunked → Kokoro TTS → PCM audio → WebSocket → browser playback
6. **Passive Mode**: When not asked to respond, Jarvis still processes speech, updates its context, and shows "thinking" in the sidebar. This creates the illusion of an always-aware AI.

### Groq LLM Agent Configuration

```python
JARVIS_SYSTEM_PROMPT = """You are Jarvis, an AI co-presenter at a technical talk about building real-time voice agents.
You are co-presenting with Emil Wåreus. You are always listening and aware of what is being said.

Current slide: {current_slide_title}
Current slide content: {current_slide_notes}
Next slide: {next_slide_title}
Slides remaining: {slides_remaining}

You have been built using:
- Whisper (faster-whisper) for speech-to-text
- Kokoro-82M (kokoro-onnx) for text-to-speech
- Silero VAD for voice activity detection
- Groq API (Llama 3.3 70B) for reasoning
- WebSocket for real-time audio streaming
- All running locally on macOS

Rules:
- Only speak when explicitly asked (e.g., "Jarvis, ...")
- When asked to respond, use the `respond` tool
- Keep responses concise (2-3 sentences for voice)
- You can share insights about what has been discussed
- You know the full presentation content and can preview upcoming topics
- Be witty but professional
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "respond",
            "description": "Generate a spoken voice response. Only call this when explicitly asked to speak.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "The text to speak aloud"}
                },
                "required": ["text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_thinking",
            "description": "Update the thinking/observation display in the sidebar without speaking",
            "parameters": {
                "type": "object",
                "properties": {
                    "thought": {"type": "string", "description": "Internal observation or note"}
                },
                "required": ["thought"]
            }
        }
    }
]
```

### Frontend: WebSocket Client + Jarvis Sidebar

The presentation layout wraps slides with the Jarvis sidebar:

```tsx
// app/presentations/voice-agents/layout.tsx
'use client';

import { SharedPresentationLayout } from '@/components/presentations/shared/presentation-layout';
import { JarvisSidebar } from '@/components/presentations/voice-agents/jarvis/jarvis-sidebar';
import { JarvisProvider } from '@/components/presentations/voice-agents/jarvis/jarvis-context';

export default function VoiceAgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <JarvisProvider>
      <div className="flex h-screen">
        <div className="flex-1">
          <SharedPresentationLayout basePath="/presentations/voice-agents" registry="voice-agents">
            {children}
          </SharedPresentationLayout>
        </div>
        <JarvisSidebar />
      </div>
    </JarvisProvider>
  );
}
```

### HTTPS → localhost WebSocket: The Mixed Content Problem

**Problem**: If the presentation is deployed on Vercel (HTTPS), connecting to `ws://localhost:8765` is blocked as mixed content.

**Solutions (ranked):**

1. **mkcert + WSS (recommended for demo):**
   ```bash
   brew install mkcert
   mkcert -install
   mkcert localhost 127.0.0.1
   # Run backend with SSL
   uvicorn main:app --port 8765 --ssl-keyfile localhost+1-key.pem --ssl-certfile localhost+1.pem
   ```
   Then connect to `wss://localhost:8765`. Works from any HTTPS origin.

2. **Run everything on localhost:** Both Next.js and Python backend on localhost. No mixed content. Simplest but can't use Vercel.

3. **Tunnel (ngrok/cloudflare):** Expose local backend via tunnel with HTTPS. Adds latency.

**Recommendation for the talk:** Use option 1 (mkcert). Deploy the presentation on Vercel, run the Python backend locally with WSS. During the talk, just start the Python server and the presentation connects automatically. If mkcert causes issues, fall back to option 2 (everything localhost).

### Latency Budget

| Stage | Latency | Cumulative |
|---|---|---|
| VAD silence detection | ~900ms | 900ms |
| Whisper STT (small, CPU, 3s utterance) | ~300ms | 1200ms |
| Groq TTFT (streaming) | ~150ms | 1350ms |
| First sentence buffer | ~100ms | 1450ms |
| Kokoro TTS (first sentence) | ~200ms | 1650ms |
| WebSocket round-trip | ~1ms | ~1650ms |
| **Total to first audio** | **~1.7s** | from end of speech |

Optimizations:
- Reduce VAD silence threshold to 500ms for faster turn detection
- Use speculative execution (start LLM before final STT, like Podidex does)
- Use filler words ("So," "Well,") to get first TTS chunk out faster
- Pre-warm Kokoro with a short utterance at connection time

### Python Dependencies

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
websockets>=12.0
faster-whisper>=1.0.0
kokoro-onnx>=0.4.0
silero-vad>=5.1
groq>=0.11.0
numpy>=1.24.0
soundfile>=0.12.0
torch>=2.0.0
```

### Setup Commands (macOS)

```bash
# Install system deps
brew install espeak-ng mkcert

# Setup SSL for localhost
mkcert -install
mkcert localhost 127.0.0.1

# Create Python environment
cd presentations/voice-agents/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Download models
mkdir -p models
cd models
wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ..

# Run
GROQ_API_KEY=your-key uvicorn server:app --port 8765 \
    --ssl-keyfile localhost+1-key.pem --ssl-certfile localhost+1.pem
```

---

## Podidex Implementation Reference

The podidex codebase at `/Users/emilwareus/Development/podidex` has a complete production implementation that directly informs this work:

### Key Files to Reference

| File | What It Shows |
|---|---|
| `tts/voice_chat/pipeline.py` | Full STT→LLM→TTS pipeline with speculative execution, echo suppression, barge-in |
| `tts/voice_chat/models.py` | Model loading (faster-whisper + Kokoro) with GPU/CPU detection |
| `tts/voice_chat/server.py` | WebSocket server with binary audio protocol |
| `tts/voice_chat/audio_processing.py` | Audio resampling (48k→16k, 24k→48k) |
| `apps/web/src/features/voice-conversation/services/ws-voice-service.ts` | Frontend VAD + WebSocket audio streaming |
| `apps/web/src/features/voice-conversation/services/pcm-audio-player.ts` | PCM playback with AudioWorklet |
| `apps/web/public/pcm-playback-worklet.js` | Ring buffer playback worklet |

### Patterns to Reuse from Podidex

1. **Binary audio protocol**: 8-byte header (timestamp + flags) + PCM data
2. **Frontend VAD**: RMS energy threshold + silence chunk counting
3. **Sentence-chunked TTS**: Stream LLM tokens, flush to TTS at sentence boundaries
4. **Echo suppression**: Discard mic audio while TTS is playing
5. **Speculative execution**: Start LLM before final STT confirmation (85% similarity threshold)

### Differences from Podidex for Jarvis

| Aspect | Podidex | Jarvis |
|---|---|---|
| Backend hosting | RunPod GPU | Local macOS CPU |
| STT model | faster-whisper base.en | faster-whisper small |
| TTS library | kokoro (PyTorch) | kokoro-onnx (ONNX, no PyTorch needed) |
| LLM | Groq (openai SDK) | Groq (groq SDK with tools) |
| VAD | Frontend RMS + backend barge-in | Silero VAD on backend |
| Conversation mode | Always responds | Only responds when asked |
| Context | Episode scripts | Presentation slides |

---

## Code to Write in This Repo (for the talk)

For the code walkthrough slide (slide 15), we should have working example code in the repo:

### `presentations/voice-agents/examples/`

```
presentations/voice-agents/examples/
├── 01-whisper-basic.py          # Simple Whisper transcription
├── 02-vad-streaming.py          # Silero VAD streaming demo
├── 03-kokoro-tts.py             # Kokoro TTS synthesis
├── 04-groq-streaming.py         # Groq streaming chat
├── 05-full-pipeline.py          # Complete VAD → STT → LLM → TTS pipeline
└── requirements.txt
```

These are self-contained scripts the audience can run. During the talk, walk through them progressively.

---

## Architecture Insights

### Presentation System Patterns

1. **Slide registry pattern**: Centralized `lib/presentations/voice-agents.ts` with `Slide[]`, utility functions
2. **Layout-level keyboard nav**: `SlideStepProvider` context for sub-step animations
3. **Client/Server boundary**: Layout = Client Component, page.tsx = Server Component, slides = Client Components
4. **Static generation**: `dynamic = 'error'`, `revalidate = false`, `generateStaticParams()`
5. **Manual switch dispatch**: Each slide needs a case in `[slide]/page.tsx`

### Jarvis Unique Patterns

1. **Persistent sidebar across slides**: Rendered in layout, not individual slides
2. **Slide context awareness**: Layout sends current slide info to backend on navigation
3. **Passive listening + active responding**: Two modes controlled by tool calling
4. **Audio I/O in layout**: Mic capture and audio playback managed at layout level, not per-slide

---

## Open Questions

1. **Kokoro voice selection**: Which voice for Jarvis? `am_adam` (male American) would match the Iron Man Jarvis feel. Test latency with different voices.
2. **Groq model choice**: `llama-3.3-70b-versatile` for quality or `llama-3.1-8b-instant` for speed? Test both during rehearsal.
3. **VAD sensitivity during talk**: Background noise in venue may trigger false positives. May need higher threshold or keyword detection ("Jarvis").
4. **Presentation deployment**: Vercel + local backend (mkcert WSS) or everything localhost? Test both.
5. **Fallback plan**: If Jarvis fails during the talk, have a graceful degradation (sidebar shows "Jarvis is resting" and continue without it).
6. **Audio routing**: During the talk, need to route system audio to the room speakers. Ensure Kokoro output goes through the correct audio device.
7. **Web search tool**: Should Jarvis actually be able to search the web during the presentation? Adds wow factor but also latency and unpredictability.
