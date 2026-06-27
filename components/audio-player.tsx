'use client';

import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
}

const playbackRates = [1, 1.25, 1.5, 2] as const;

export function AudioPlayer({ audioUrl, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastAudibleVolumeRef = useRef(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRateIndex, setPlaybackRateIndex] = useState(0);
  const playbackRate = playbackRates[playbackRateIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(getFiniteTime(audio.duration));
    setVolume(audio.volume);
    setIsMuted(audio.muted);

    const updateTime = () => setCurrentTime(getFiniteTime(audio.currentTime));
    const updateDuration = () => setDuration(getFiniteTime(audio.duration));
    const updateVolume = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('volumechange', updateVolume);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('volumechange', updateVolume);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    void audio.play();
  }

  function seekTo(value: number[]) {
    const audio = audioRef.current;
    const nextTime = value[0];

    if (!audio || nextTime === undefined || duration <= 0) {
      return;
    }

    const clampedTime = clamp(nextTime, 0, duration);
    audio.currentTime = clampedTime;
    setCurrentTime(clampedTime);
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

  function changeVolume(value: number[]) {
    const audio = audioRef.current;
    const nextVolume = value[0];

    if (!audio || nextVolume === undefined) {
      return;
    }

    const clampedVolume = clamp(nextVolume, 0, 1);
    audio.volume = clampedVolume;
    audio.muted = clampedVolume === 0;

    if (clampedVolume > 0) {
      lastAudibleVolumeRef.current = clampedVolume;
    }

    setVolume(clampedVolume);
    setIsMuted(audio.muted);
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.muted) {
      audio.muted = false;
      audio.volume = lastAudibleVolumeRef.current;
      setVolume(audio.volume);
      setIsMuted(false);
      return;
    }

    audio.muted = true;
    setIsMuted(true);
  }

  const seekValue = duration > 0 ? Math.min(currentTime, duration) : 0;
  const volumeValue = isMuted ? 0 : volume;

  return (
    <div className="not-prose my-8 border border-dashed border-border px-4 py-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={togglePlay}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
          className="shrink-0 text-primary"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="truncate">Audio narration</span>
            <span className="shrink-0 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <Slider
            value={[seekValue]}
            max={duration > 0 ? duration : 1}
            step={0.1}
            disabled={duration <= 0}
            onValueChange={seekTo}
            aria-label={`Seek ${title}`}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          />
        </div>

        <button
          type="button"
          onClick={cycleRate}
          className="shrink-0 border border-dashed border-border px-2.5 py-2 text-[11.5px] tabular-nums text-muted-foreground transition-colors hover:border-primary hover:bg-[var(--hover)] hover:text-primary"
          aria-label="Change playback speed"
        >
          {formatPlaybackRate(playbackRate)}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-dashed border-[var(--hair)] pt-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleMute}
          aria-label={isMuted ? `Unmute ${title}` : `Mute ${title}`}
          className="text-muted-foreground"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Slider
          value={[volumeValue]}
          max={1}
          step={0.01}
          onValueChange={changeVolume}
          className="max-w-40"
          aria-label={`Volume for ${title}`}
          aria-valuetext={`${Math.round(volumeValue * 100)} percent`}
        />
        <span className="w-10 text-right text-[11.5px] tabular-nums text-muted-foreground">
          {Math.round(volumeValue * 100)}%
        </span>
      </div>
    </div>
  );
}

function getFiniteTime(time: number) {
  return Number.isFinite(time) && time > 0 ? time : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(time: number) {
  if (!Number.isFinite(time) || time <= 0) {
    return '0:00';
  }

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatPlaybackRate(rate: (typeof playbackRates)[number]) {
  return `${rate.toString()}x`;
}
