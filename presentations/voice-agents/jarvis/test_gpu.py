"""Test GPU/MPS device detection and model placement.

Run from the jarvis directory:
    uv run python test_gpu.py
"""

import os
import platform
import sys
import time

# Ensure the jarvis package is importable when running from within the jarvis dir.
# The pyproject.toml lives inside the jarvis/ package dir, so we need the parent on sys.path.
_here = os.path.dirname(os.path.abspath(__file__))
_parent = os.path.dirname(_here)
if _parent not in sys.path:
    sys.path.insert(0, _parent)


def test_mps_available():
    """Check if MPS backend is available."""
    import torch

    mps_available = (
        hasattr(torch.backends, "mps")
        and torch.backends.mps.is_available()
    )
    print(f"Platform:       {platform.system()} {platform.machine()}")
    print(f"Python:         {sys.version.split()[0]}")
    print(f"PyTorch:        {torch.__version__}")
    print(f"MPS available:  {mps_available}")
    print(f"MPS built:      {torch.backends.mps.is_built()}")

    assert mps_available, "MPS is not available — GPU acceleration won't work"
    print("PASS: MPS is available\n")


def test_mps_basic_ops():
    """Verify basic tensor operations work on MPS."""
    import torch

    device = torch.device("mps")
    x = torch.randn(100, 100, device=device)
    y = torch.randn(100, 100, device=device)
    z = x @ y
    assert z.device.type == "mps"
    print("PASS: Basic MPS tensor operations work\n")


def test_device_detection():
    """Test that our device detection picks MPS on Apple Silicon."""
    from jarvis.models import _detect_tts_device

    device = _detect_tts_device()
    print(f"Detected TTS device: {device}")
    assert device == "mps", f"Expected 'mps' but got '{device}'"
    print("PASS: TTS device detection returns 'mps'\n")


def test_kokoro_loads_on_mps():
    """Test that Kokoro TTS loads and runs on MPS."""
    from kokoro import KPipeline

    t0 = time.time()
    pipeline = KPipeline(lang_code="a", device="mps")
    load_time = time.time() - t0
    print(f"Kokoro loaded on MPS in {load_time:.1f}s")

    # Synthesize a short test phrase
    t1 = time.time()
    audio_chunks = []
    for _, _, audio in pipeline("Hello from Jarvis on GPU.", voice="am_adam", speed=1.0):
        if audio is not None:
            audio_chunks.append(audio.numpy() if hasattr(audio, "numpy") else audio)
    synth_time = time.time() - t1

    import numpy as np
    total_audio = np.concatenate(audio_chunks)
    duration_s = len(total_audio) / 24000

    print(f"Synthesized {duration_s:.1f}s of audio in {synth_time * 1000:.0f}ms")
    print(f"Real-time factor: {synth_time / duration_s:.2f}x (< 1.0 = faster than real-time)")

    assert len(total_audio) > 0, "No audio generated"
    assert synth_time < duration_s * 2, "TTS is too slow (>2x real-time)"
    print("PASS: Kokoro TTS works on MPS\n")


def test_kokoro_vs_cpu():
    """Benchmark Kokoro on MPS vs CPU."""
    from kokoro import KPipeline
    import numpy as np

    test_text = (
        "Voice agents are built from four main components. "
        "Speech to text converts audio into words. "
        "A language model generates a response."
    )

    results = {}
    for device in ["cpu", "mps"]:
        pipeline = KPipeline(lang_code="a", device=device)
        # Warm up
        for _, _, _ in pipeline("warmup", voice="am_adam"):
            pass

        t0 = time.time()
        audio_chunks = []
        for _, _, audio in pipeline(test_text, voice="am_adam", speed=1.0):
            if audio is not None:
                audio_chunks.append(audio.numpy() if hasattr(audio, "numpy") else audio)
        elapsed = time.time() - t0
        total_audio = np.concatenate(audio_chunks)
        duration_s = len(total_audio) / 24000
        results[device] = {"time": elapsed, "duration": duration_s}

    cpu_time = results["cpu"]["time"]
    mps_time = results["mps"]["time"]
    speedup = cpu_time / mps_time

    print(f"CPU: {cpu_time * 1000:.0f}ms for {results['cpu']['duration']:.1f}s audio "
          f"(RTF {cpu_time / results['cpu']['duration']:.2f}x)")
    print(f"MPS: {mps_time * 1000:.0f}ms for {results['mps']['duration']:.1f}s audio "
          f"(RTF {mps_time / results['mps']['duration']:.2f}x)")
    print(f"Speedup: {speedup:.1f}x")

    # For small models like Kokoro-82M, CPU can be faster than MPS due to
    # data transfer overhead. Both should be well under real-time (RTF < 1.0).
    cpu_rtf = cpu_time / results["cpu"]["duration"]
    mps_rtf = mps_time / results["mps"]["duration"]
    assert cpu_rtf < 1.0, f"CPU is slower than real-time (RTF {cpu_rtf:.2f}x)"
    assert mps_rtf < 1.0, f"MPS is slower than real-time (RTF {mps_rtf:.2f}x)"
    print("PASS: Both CPU and MPS run faster than real-time\n")


def test_full_model_manager():
    """Test the full ModelManager loads with correct devices."""
    from jarvis.models import ModelManager

    manager = ModelManager()
    t0 = time.time()
    manager.load_all()
    load_time = time.time() - t0

    print(f"\nModelManager loaded in {load_time:.1f}s")
    print(f"TTS device: {manager.tts_device}")

    assert manager.tts_device == "mps", f"Expected TTS on 'mps' but got '{manager.tts_device}'"

    # Quick transcription test
    import numpy as np
    silence = np.zeros(16000, dtype=np.float32)  # 1s silence
    transcript = manager.transcribe(silence)
    print(f"Transcribe test (silence): '{transcript}' (expected empty)")

    # Quick synthesis test
    t1 = time.time()
    samples, sr = manager.synthesize("Test complete.")
    synth_time = time.time() - t1
    print(f"Synthesize test: {len(samples)} samples at {sr}Hz in {synth_time * 1000:.0f}ms")

    assert sr == 24000, f"Expected 24kHz but got {sr}"
    assert len(samples) > 0, "No audio generated"
    print("PASS: Full ModelManager works with MPS\n")


if __name__ == "__main__":
    tests = [
        test_mps_available,
        test_mps_basic_ops,
        test_device_detection,
        test_kokoro_loads_on_mps,
        test_kokoro_vs_cpu,
        test_full_model_manager,
    ]

    passed = 0
    failed = 0
    for test in tests:
        print(f"--- {test.__name__} ---")
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"FAIL: {e}\n")
            failed += 1

    print("=" * 40)
    print(f"Results: {passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
