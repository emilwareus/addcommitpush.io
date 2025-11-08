'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

interface SpotifyResponse {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  album?: string;
  albumImageUrl?: string;
  songUrl?: string;
  progressMs?: number;
  durationMs?: number;
  error?: string;
}

const fetcher = async (url: string): Promise<SpotifyResponse> => {
  const response = await fetch(url);

  // Handle rate limiting (429 status code from Vercel WAF or our API)
  if (response.status === 429) {
    // Try to parse JSON, but Vercel WAF might return plain text
    const data = await response.json().catch(() => ({ isPlaying: false, error: 'rate_limit' }));
    throw { status: 429, data };
  }

  if (!response.ok) {
    // For other errors, try to parse JSON or throw generic error
    const errorData = await response.json().catch(() => ({ isPlaying: false }));
    throw { status: response.status, data: errorData };
  }

  return response.json();
};

export function SpotifyCard() {
  const [isRateLimited, setIsRateLimited] = useState(false);

  const { data, error, isLoading } = useSWR<SpotifyResponse>('/api/spotify', fetcher, {
    refreshInterval: isRateLimited ? 0 : 10000, // Disable polling when rate limited
    revalidateOnFocus: !isRateLimited, // Disable revalidation when rate limited
    onError: (err: any) => {
      // Check if error is rate limit (429)
      if (err?.status === 429 || err?.data?.error === 'rate_limit') {
        setIsRateLimited(true);
      }
    },
    onSuccess: () => {
      // Reset rate limit flag on successful response
      if (isRateLimited) {
        setIsRateLimited(false);
      }
    },
  });

  // Auto-reset rate limit after 60 seconds
  useEffect(() => {
    if (isRateLimited) {
      const timer = setTimeout(() => {
        setIsRateLimited(false);
      }, 60000); // Rate limit window is typically 60 seconds

      return () => clearTimeout(timer);
    }
  }, [isRateLimited]);

  // Handle rate limiting
  const rateLimitError = error && (error.status === 429 || error.data?.error === 'rate_limit');

  if (rateLimitError || isRateLimited) {
    return (
      <Card className="h-full flex flex-col items-center justify-center hover:border-secondary/40 transition-all duration-300">
        <CardContent className="text-center pt-6">
          <span className="text-4xl mb-2 block">🎵</span>
          <p className="text-muted-foreground">Rate limited</p>
          <p className="text-xs text-muted-foreground mt-2">Please wait a moment...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full flex flex-col items-center justify-center hover:border-secondary/40 transition-all duration-300">
        <CardContent className="text-center pt-6">
          <span className="text-4xl mb-2 block">🎵</span>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <p className="text-muted-foreground">Unable to load Spotify data</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!data.isPlaying) {
    return (
      <Card className="h-full flex flex-col items-center justify-center hover:border-secondary/40 transition-all duration-300">
        <CardContent className="text-center pt-6">
          <span className="text-4xl mb-2 block">🎵</span>
          <p className="text-muted-foreground">Not playing anything</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col hover:border-secondary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎧</span>
          Now Playing
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3">
        <div className="flex gap-3">
          {data.albumImageUrl && (
            <div className="relative w-16 h-16 rounded overflow-hidden shrink-0">
              <Image
                src={data.albumImageUrl}
                alt={data.album || 'Album art'}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <a
              href={data.songUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-secondary transition-colors truncate block"
            >
              {data.title}
            </a>
            <p className="text-sm text-muted-foreground truncate">{data.artist}</p>
            <p className="text-xs text-muted-foreground truncate">{data.album}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {data.progressMs && data.durationMs && (
          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-secondary h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${(data.progressMs / data.durationMs) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {Math.floor(data.progressMs / 60000)}:
                {String(Math.floor((data.progressMs % 60000) / 1000)).padStart(2, '0')}
              </span>
              <span>
                {Math.floor(data.durationMs / 60000)}:
                {String(Math.floor((data.durationMs % 60000) / 1000)).padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
