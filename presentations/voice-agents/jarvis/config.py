# Audio
INPUT_SAMPLE_RATE = 16000  # Browser sends 16kHz mono PCM
OUTPUT_SAMPLE_RATE = 24000  # Kokoro outputs 24kHz
CHUNK_MS = 32  # VAD chunk size (Silero v5 requires exactly 512 samples at 16kHz)
CHUNK_SAMPLES = 512  # Silero v5: exactly 512 for 16kHz, 256 for 8kHz

# VAD
VAD_THRESHOLD = 0.5  # Silero confidence threshold
SILENCE_DURATION_MS = 700  # ms of silence before utterance end
SILENCE_CHUNKS = int(SILENCE_DURATION_MS / CHUNK_MS)  # ~21 chunks

# STT
WHISPER_MODEL = "small"
WHISPER_COMPUTE_TYPE = "int8"  # CPU-friendly on macOS
STT_MODELS = ["whisper-small", "moonshine-small", "moonshine-medium"]
DEFAULT_STT_MODEL = "whisper-small"

# LLM
MAX_TOKENS = 300  # Keep responses concise for voice
TEMPERATURE = 0.7

# Each entry: (display_name, provider, model_id)
# provider is "groq" or "openai" — determines which client to use
LLM_MODELS: list[dict] = [
    {"name": "gpt-oss-120b", "provider": "groq", "model": "openai/gpt-oss-120b"},
    {"name": "gpt-4.1-nano", "provider": "openai", "model": "gpt-4.1-nano"},
    {"name": "o4-mini", "provider": "openai", "model": "o4-mini"},
]
DEFAULT_LLM_MODEL = "gpt-oss-120b"

# TTS (kokoro PyTorch — lang_code set at pipeline init, not per-call)
KOKORO_VOICE = "am_adam"  # Male American — Jarvis voice
KOKORO_SPEED = 1.0

# WebRTC
WEBRTC_SAMPLE_RATE = 48000

# Server
WS_PORT = 8770
