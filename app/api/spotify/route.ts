import { NextResponse } from 'next/server'

/**
 * Spotify "Now Playing" API Route
 *
 * This uses a REFRESH TOKEN approach - you do OAuth once to get the refresh token,
 * then store it permanently. No OAuth flow happens on each request.
 *
 * Required env vars (all three are needed):
 * - SPOTIFY_CLIENT_ID: Your app's client ID
 * - SPOTIFY_CLIENT_SECRET: Your app's client secret
 * - SPOTIFY_REFRESH_TOKEN: Long-lived token from one-time OAuth (never expires)
 *
 * The refresh token is exchanged for a short-lived access token automatically.
 * This is NOT a full OAuth flow - just token exchange using credentials.
 *
 * Setup guide: See .env.example for instructions on getting your refresh token
 */

const client_id = process.env.SPOTIFY_CLIENT_ID
const client_secret = process.env.SPOTIFY_CLIENT_SECRET
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN

const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64')
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing'

/**
 * Exchange refresh token for a short-lived access token
 * This happens automatically - no user interaction needed
 */
const getAccessToken = async () => {
  if (!client_id || !client_secret || !refresh_token) {
    throw new Error('Spotify credentials not configured')
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  return response.json()
}

export async function GET() {
  try {
    const { access_token } = await getAccessToken()

    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    // 204 = no content (nothing playing)
    if (response.status === 204 || response.status > 400) {
      return NextResponse.json({ isPlaying: false })
    }

    const song = await response.json()

    // Sometimes item is null even with 200 status
    if (song.item === null) {
      return NextResponse.json({ isPlaying: false })
    }

    return NextResponse.json({
      isPlaying: song.is_playing,
      title: song.item.name,
      artist: song.item.artists.map((artist: { name: string }) => artist.name).join(', '),
      album: song.item.album.name,
      albumImageUrl: song.item.album.images[0]?.url,
      songUrl: song.item.external_urls.spotify,
      progressMs: song.progress_ms,
      durationMs: song.item.duration_ms,
    })
  } catch (error) {
    console.error('Spotify API error:', error)
    return NextResponse.json({ isPlaying: false })
  }
}
