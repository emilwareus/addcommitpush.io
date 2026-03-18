"""Audio resampling utilities.

Adapted from Podidex's audio_processing.py. Lightweight filters
for real-time use on CPU.
"""

import numpy as np


def resample_to_16k(audio: np.ndarray, source_rate: int) -> np.ndarray:
    """Resample audio to 16kHz mono using simple decimation with low-pass filter.

    Args:
        audio: float32 or int16 audio samples.
        source_rate: Original sample rate (e.g. 48000).

    Returns:
        float32 audio at 16kHz.
    """
    if source_rate == 16000:
        if audio.dtype == np.int16:
            return audio.astype(np.float32) / 32768.0
        return audio

    # Convert to float32 if needed
    if audio.dtype == np.int16:
        audio = audio.astype(np.float32) / 32768.0

    factor = source_rate // 16000
    if factor <= 1:
        return audio

    # Simple low-pass filter before decimation to reduce aliasing
    kernel = np.array([1, 2, 3, 2, 1], dtype=np.float32) / 9.0
    filtered = np.convolve(audio, kernel, mode="same")
    return filtered[::factor]


def upsample_to_48k(audio: np.ndarray) -> np.ndarray:
    """Upsample audio from 24kHz to 48kHz using linear interpolation.

    Args:
        audio: Audio samples at 24kHz (any dtype).

    Returns:
        Audio at 48kHz (same dtype).
    """
    n = len(audio)
    out = np.empty(n * 2, dtype=audio.dtype)
    out[0::2] = audio
    # Interpolate midpoints
    out[1:-1:2] = (audio[:-1].astype(np.float32) + audio[1:].astype(np.float32)) / 2
    if audio.dtype != np.float32:
        out[1:-1:2] = out[1:-1:2].astype(audio.dtype)
    # Last sample: duplicate
    out[-1] = audio[-1]
    return out


def float32_to_int16(audio: np.ndarray) -> np.ndarray:
    """Convert float32 [-1, 1] audio to int16 PCM."""
    return (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)


def int16_to_float32(audio: np.ndarray) -> np.ndarray:
    """Convert int16 PCM to float32 [-1, 1]."""
    return audio.astype(np.float32) / 32768.0
