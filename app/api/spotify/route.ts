import { NextResponse } from 'next/server';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

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
 *
 * Rate Limiting:
 * Configure Vercel WAF in dashboard: Project Settings → Firewall → Custom Rules
 * - Path: /api/spotify
 * - Rate limit: 6 requests per minute per IP
 * - Action: Return 429 status code
 *
 * Security:
 * - Access tokens are cached in memory to reduce API calls
 * - Responses are cached for 15 seconds to reduce load
 * - Error messages are sanitized to prevent information leakage
 * - This endpoint is intentionally public (for status page display)
 */

// Ensure this runs on Node.js runtime (not Edge) for Buffer support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';

// Access token caching (module-level)
// Spotify access tokens expire in ~1 hour (3600 seconds)
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Exchange refresh token for a short-lived access token
 * Caches the token in memory until expiration to reduce API calls
 */
const getCachedAccessToken = async (): Promise<string> => {
  if (!client_id || !client_secret || !refresh_token) {
    throw new Error('Spotify credentials not configured');
  }

  // Check if cached token is still valid (with 60s buffer before expiration)
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  // Refresh token
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
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('Token refresh failed:', response.status, errorText);
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  const expiresIn = (data.expires_in || 3600) * 1000; // Convert to milliseconds

  // Cache the token with expiration
  cachedToken = {
    token: data.access_token,
    expiresAt: now + expiresIn,
  };

  return cachedToken.token;
};

/**
 * Internal function to fetch Spotify data
 * This is wrapped with caching to reduce API calls
 */
async function fetchSpotifyDataInternal() {
  const access_token = await getCachedAccessToken();

  const response = await fetch(NOW_PLAYING_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  // 204 = no content (nothing playing)
  if (response.status === 204) {
    return { isPlaying: false };
  }

  // Handle API errors (429 = rate limit, 401 = auth error, etc.)
  if (response.status > 400) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('Spotify API error:', response.status, errorText);
    return { isPlaying: false };
  }

  const song = await response.json();

  // Sometimes item is null even with 200 status
  if (song.item === null) {
    return { isPlaying: false };
  }

  return {
    isPlaying: song.is_playing,
    title: song.item.name,
    artist: song.item.artists.map((artist: { name: string }) => artist.name).join(', '),
    album: song.item.album.name,
    albumImageUrl: song.item.album.images[0]?.url,
    songUrl: song.item.external_urls.spotify,
    progressMs: song.progress_ms,
    durationMs: song.item.duration_ms,
  };
}

// Add persistent caching with 15-second TTL (matches polling interval)
const getCachedSpotifyData = unstable_cache(fetchSpotifyDataInternal, ['spotify-now-playing'], {
  tags: ['spotify-api'],
  revalidate: 15, // 15 seconds
});

// Add request-level deduplication
const getSpotifyData = cache(getCachedSpotifyData);

export async function GET() {
  try {
    const data = await getSpotifyData();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Spotify API error:', errorMessage, error);

    // Check if this is a rate limit error (429 from Vercel WAF)
    // Vercel WAF rate limits return 429 before reaching this handler,
    // but we handle it here for completeness
    return NextResponse.json({ isPlaying: false, error: 'rate_limit' }, { status: 429 });
  }
}
