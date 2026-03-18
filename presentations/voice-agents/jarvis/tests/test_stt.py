import types

from jarvis.stt import MoonshineBackend


def test_moonshine_backend_unpacks_model_tuple(monkeypatch) -> None:
    expected_arch = object()
    captured: dict[str, object] = {}

    class FakeTranscriber:
        def __init__(self, model_path, model_arch, options=None) -> None:
            captured["model_path"] = model_path
            captured["model_arch"] = model_arch
            captured["options"] = options

    fake_module = types.SimpleNamespace(
        ModelArch=types.SimpleNamespace(SMALL_STREAMING=expected_arch),
        Transcriber=FakeTranscriber,
        get_model_for_language=lambda language, arch: ("/tmp/moonshine-model", arch),
    )
    monkeypatch.setitem(__import__("sys").modules, "moonshine_voice", fake_module)

    backend = MoonshineBackend("moonshine-small", "SMALL_STREAMING")

    assert backend.name == "moonshine-small"
    assert captured == {
        "model_path": "/tmp/moonshine-model",
        "model_arch": expected_arch,
        "options": {"vad_threshold": 0.0},
    }
