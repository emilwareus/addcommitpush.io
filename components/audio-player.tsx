'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
}

const playbackRates = [1, 1.25, 1.5, 2] as const;

export function AudioPlayer({ audioUrl, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRateIndex, setPlaybackRateIndex] = useState(0);
  const playbackRate = playbackRates[playbackRateIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    await audio.play();
    setIsPlaying(true);
  }

  function seekTo(event: MouseEvent<HTMLButtonElement>) {
    const audio = audioRef.current;
    if (!audio || duration === 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const nextTime = ratio * duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function cycleRate() {
    const audio = audioRef.current;
    const nextIndex = (playbackRateIndex + 1) % playbackRates.length;
    const nextRate = playbackRates[nextIndex];

    if (audio) {
      audio.playbackRate = nextRate;
    }

    setPlaybackRateIndex(nextIndex);
  }

  const progress = duration > 0 ? `${(currentTime / duration) * 100}%` : '0%';

  return (
    <div className="not-prose my-8 flex items-center gap-3 border border-dashed border-border px-4 py-3 sm:gap-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        type="button"
        onClick={() => void togglePlay()}
        className="flex h-9 w-9 shrink-0 items-center justify-center border border-dashed border-border text-primary transition-colors hover:border-primary hover:bg-[var(--hover)]"
        aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-2 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Audio narration · {formatTime(duration)}
        </div>
        <button
          type="button"
          onClick={seekTo}
          className="block h-[3px] w-full overflow-hidden bg-[var(--hair)]"
          aria-label="Seek audio"
        >
          <span className="block h-full bg-primary" style={{ width: progress }} />
        </button>
      </div>

      <button
        type="button"
        onClick={cycleRate}
        className="shrink-0 text-[11.5px] text-muted-foreground transition-colors hover:text-primary"
        aria-label="Change playback speed"
      >
        {playbackRate.toFixed(playbackRate === 1 ? 1 : 2).replace(/0$/, '')}x
      </button>
    </div>
  );
}

function formatTime(time: number) {
  if (!Number.isFinite(time) || time <= 0) {
    return '0:00';
  }

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
