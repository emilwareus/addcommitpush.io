#!/usr/bin/env tsx

/**
 * One-time script to get your Spotify refresh token
 *
 * Prerequisites:
 * 1. Create a Spotify app at https://developer.spotify.com/dashboard
 * 2. Add http://localhost:3000/callback as a redirect URI in app settings
 * 3. Copy your CLIENT_ID and CLIENT_SECRET
 *
 * Usage:
 *   pnpm tsx scripts/get-spotify-refresh-token.ts <CLIENT_ID> <CLIENT_SECRET>
 *
 * This will:
 * 1. Generate an authorization URL
 * 2. Open it in your browser
 * 3. After you authorize, you'll be redirected to localhost with a code
 * 4. Paste that full URL back into this script
 * 5. Get your permanent REFRESH_TOKEN
 */

const CLIENT_ID = process.argv[2]
const CLIENT_SECRET = process.argv[3]
const REDIRECT_URI = 'https://addcommitpush.io/callback/spotify'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Usage: pnpm tsx scripts/get-spotify-refresh-token.ts <CLIENT_ID> <CLIENT_SECRET>')
  process.exit(1)
}

const scopes = [
  'user-read-currently-playing',
  'user-read-playback-state',
].join(' ')

const authUrl = new URL('https://accounts.spotify.com/authorize')
authUrl.searchParams.set('client_id', CLIENT_ID)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
authUrl.searchParams.set('scope', scopes)

console.log('\n🎵 Spotify Refresh Token Generator\n')
console.log('Step 1: Open this URL in your browser:\n')
console.log(authUrl.toString())
console.log('\nStep 2: After authorizing, you\'ll be redirected to a localhost URL')
console.log('        (it will show "Cannot GET /callback" - that\'s expected!)')
console.log('\nStep 3: Copy the ENTIRE URL from your browser and paste it here:\n')

// Read URL from stdin
process.stdin.resume()
process.stdin.setEncoding('utf8')

process.stdin.on('data', async (data) => {
  const url = data.toString().trim()

  try {
    const params = new URL(url).searchParams
    const code = params.get('code')

    if (!code) {
      console.error('❌ No authorization code found in URL')
      process.exit(1)
    }

    console.log('\n✅ Authorization code received, exchanging for refresh token...\n')

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('❌ Token exchange failed:', error)
      process.exit(1)
    }

    const tokenData = await tokenResponse.json()

    console.log('✅ Success! Add these to your .env.local file:\n')
    console.log(`SPOTIFY_CLIENT_ID=${CLIENT_ID}`)
    console.log(`SPOTIFY_CLIENT_SECRET=${CLIENT_SECRET}`)
    console.log(`SPOTIFY_REFRESH_TOKEN=${tokenData.refresh_token}`)
    console.log('\n🎉 Your refresh token will never expire - you\'re all set!\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
})
