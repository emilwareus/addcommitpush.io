'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function SpotifyCard() {
  const { data, error, isLoading } = useSWR('/api/spotify', fetcher, {
    refreshInterval: 10000, // Poll every 10 seconds
    revalidateOnFocus: true, // Refresh when tab gains focus
  })

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
    )
  }

  if (!data.isPlaying) {
    return (
      <Card className="h-full flex flex-col items-center justify-center hover:border-secondary/40 transition-all duration-300">
        <CardContent className="text-center pt-6">
          <span className="text-4xl mb-2 block">🎵</span>
          <p className="text-muted-foreground">Not playing anything</p>
        </CardContent>
      </Card>
    )
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
              <span>{Math.floor(data.progressMs / 60000)}:{String(Math.floor((data.progressMs % 60000) / 1000)).padStart(2, '0')}</span>
              <span>{Math.floor(data.durationMs / 60000)}:{String(Math.floor((data.durationMs % 60000) / 1000)).padStart(2, '0')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
