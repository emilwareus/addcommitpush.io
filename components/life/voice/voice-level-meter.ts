'use client';

export type LevelSource = 'microphone' | 'assistant';

/** Bars drawn around the orb. Also the number of frequency buckets sampled. */
export const BAND_COUNT = 48;

/** Shared empty reading for a source that is not producing audio. */
export const SILENT_BANDS = new Float32Array(BAND_COUNT);

const FFT_SIZE = 1024;
/** Speech occupies roughly this range; ignoring the rest keeps the bars lively. */
const MIN_HZ = 80;
const MAX_HZ = 8_000;
/** Per-frame decay, so bars fall smoothly instead of flickering. */
const BAND_DECAY = 0.82;
const LEVEL_DECAY = 0.85;

interface Probe {
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  frequencies: Uint8Array<ArrayBuffer>;
  waveform: Uint8Array<ArrayBuffer>;
  bandEdges: number[];
  smoothedBands: Float32Array;
  smoothedLevel: number;
}

/**
 * Reads live loudness and spectrum from the microphone and from the assistant's
 * WebRTC track. Nothing is connected to the audio destination: the `<audio>`
 * element owns playback, these analysers only observe.
 *
 * Chrome only routes a remote WebRTC track into Web Audio while that same stream
 * is attached to a media element, which is why `attach('assistant', …)` must run
 * after the stream reaches the `<audio>` element.
 */
export class VoiceLevelMeter {
  private readonly context: AudioContext;
  private readonly probes = new Map<LevelSource, Probe>();

  constructor() {
    this.context = new AudioContext();
  }

  async attach(source: LevelSource, stream: MediaStream): Promise<void> {
    this.detach(source);
    await this.context.resume();

    const analyser = this.context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.6;
    const node = this.context.createMediaStreamSource(stream);
    node.connect(analyser);

    this.probes.set(source, {
      analyser,
      source: node,
      frequencies: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)),
      waveform: new Uint8Array(new ArrayBuffer(analyser.fftSize)),
      bandEdges: logarithmicBandEdges(analyser.frequencyBinCount, this.context.sampleRate),
      smoothedBands: new Float32Array(BAND_COUNT),
      smoothedLevel: 0,
    });
  }

  detach(source: LevelSource): void {
    const probe = this.probes.get(source);
    if (!probe) return;
    this.probes.delete(source);
    probe.source.disconnect();
    probe.analyser.disconnect();
  }

  /**
   * Samples one frame. Returns overall loudness in 0..1 and fills the shared
   * band buffer, which the caller reads immediately and never retains.
   */
  sample(source: LevelSource): { level: number; bands: Float32Array } {
    const probe = this.probes.get(source);
    if (!probe) return { level: 0, bands: SILENT_BANDS };

    probe.analyser.getByteTimeDomainData(probe.waveform);
    let sumOfSquares = 0;
    for (const sample of probe.waveform) {
      const centered = (sample - 128) / 128;
      sumOfSquares += centered * centered;
    }
    const rms = Math.sqrt(sumOfSquares / probe.waveform.length);
    // Speech RMS rarely exceeds ~0.3, so scale before clamping to use the range.
    const level = Math.min(1, rms * 3.2);
    probe.smoothedLevel = Math.max(level, probe.smoothedLevel * LEVEL_DECAY);

    probe.analyser.getByteFrequencyData(probe.frequencies);
    for (let band = 0; band < BAND_COUNT; band += 1) {
      const start = probe.bandEdges[band];
      const end = Math.max(start + 1, probe.bandEdges[band + 1]);
      let peak = 0;
      for (let bin = start; bin < end; bin += 1) peak = Math.max(peak, probe.frequencies[bin]);
      const magnitude = peak / 255;
      probe.smoothedBands[band] = Math.max(magnitude, probe.smoothedBands[band] * BAND_DECAY);
    }

    return { level: probe.smoothedLevel, bands: probe.smoothedBands };
  }

  close(): void {
    for (const source of [...this.probes.keys()]) this.detach(source);
    void this.context.close();
  }
}

function logarithmicBandEdges(binCount: number, sampleRate: number): number[] {
  const hzPerBin = sampleRate / 2 / binCount;
  const edges: number[] = [];
  for (let band = 0; band <= BAND_COUNT; band += 1) {
    const hz = MIN_HZ * (MAX_HZ / MIN_HZ) ** (band / BAND_COUNT);
    edges.push(Math.min(binCount - 1, Math.round(hz / hzPerBin)));
  }
  return edges;
}
