# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "groq>=0.11.0",
# ]
# ///
"""
04 — Streaming Chat Completion with Groq

Sends a prompt to Groq and prints tokens as they arrive,
demonstrating the low-latency streaming API.

Prerequisites:
    export GROQ_API_KEY=your-key

Usage:
    uv run 04-groq-streaming.py
    uv run 04-groq-streaming.py "Explain WebSockets in 3 sentences"
"""

import sys
import time

from groq import Groq

MODEL = "llama-3.3-70b-versatile"

prompt = sys.argv[1] if len(sys.argv) > 1 else (
    "Explain how voice activity detection works in 3 sentences."
)

client = Groq()

print(f"Model: {MODEL}")
print(f"Prompt: \"{prompt}\"\n")

start = time.perf_counter()
first_token_time = None

stream = client.chat.completions.create(
    model=MODEL,
    messages=[{"role": "user", "content": prompt}],
    max_tokens=300,
    temperature=0.7,
    stream=True,
)

for chunk in stream:
    token = chunk.choices[0].delta.content or ""
    if token and first_token_time is None:
        first_token_time = time.perf_counter()
    print(token, end="", flush=True)

elapsed = time.perf_counter() - start
ttft = (first_token_time - start) if first_token_time else 0

print(f"\n\nTime to first token: {ttft * 1000:.0f} ms")
print(f"Total time: {elapsed * 1000:.0f} ms")
