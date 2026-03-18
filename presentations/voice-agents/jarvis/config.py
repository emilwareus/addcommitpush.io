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

# LLM
GROQ_MODEL = "openai/gpt-oss-120b"
MAX_TOKENS = 300  # Keep responses concise for voice
TEMPERATURE = 0.7

# TTS (kokoro PyTorch — lang_code set at pipeline init, not per-call)
KOKORO_VOICE = "am_adam"  # Male American — Jarvis voice
KOKORO_SPEED = 1.0

# Server
WS_PORT = 8765
