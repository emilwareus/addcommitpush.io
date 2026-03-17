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


def float32_to_int16(audio: np.ndarray) -> np.ndarray:
    """Convert float32 [-1, 1] audio to int16 PCM."""
    return (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)


def int16_to_float32(audio: np.ndarray) -> np.ndarray:
    """Convert int16 PCM to float32 [-1, 1]."""
    return audio.astype(np.float32) / 32768.0
