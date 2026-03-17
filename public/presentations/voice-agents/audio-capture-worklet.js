/**
 * AudioWorklet processor for mic capture.
 *
 * - Accumulates device-rate samples into 30ms frames
 * - Downsamples to 16kHz mono via linear interpolation
 * - Posts Int16 PCM frames to main thread
 *
 * Register with: audioContext.audioWorklet.addModule('/presentations/voice-agents/audio-capture-worklet.js')
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._enabled = false;
    this._buffer = new Float32Array(0);
    // 30ms at device sample rate
    this._frameSize = Math.ceil(sampleRate * 0.03);
    // Target: 16kHz, 30ms = 480 samples
    this._targetRate = 16000;
    this._targetFrameSize = Math.ceil(this._targetRate * 0.03); // 480

    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'set_enabled') {
        this._enabled = !!e.data.enabled;
      }
    };
  }

  process(inputs) {
    if (!this._enabled) return true;

    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;

    const channelData = input[0]; // mono channel

    // Append to buffer
    const newBuffer = new Float32Array(this._buffer.length + channelData.length);
    newBuffer.set(this._buffer);
    newBuffer.set(channelData, this._buffer.length);
    this._buffer = newBuffer;

    // Process complete frames
    while (this._buffer.length >= this._frameSize) {
      const frame = this._buffer.slice(0, this._frameSize);
      this._buffer = this._buffer.slice(this._frameSize);

      // Downsample to 16kHz via linear interpolation
      const ratio = sampleRate / this._targetRate;
      const output = new Int16Array(this._targetFrameSize);

      for (let i = 0; i < this._targetFrameSize; i++) {
        const srcIndex = i * ratio;
        const srcFloor = Math.floor(srcIndex);
        const srcCeil = Math.min(srcFloor + 1, frame.length - 1);
        const frac = srcIndex - srcFloor;

        const sample = frame[srcFloor] * (1 - frac) + frame[srcCeil] * frac;
        // Clamp and convert to Int16
        output[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      }

      this.port.postMessage(
        { type: 'audio', samples: output },
        [output.buffer]
      );
    }

    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
