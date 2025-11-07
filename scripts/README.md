# Setup Scripts

## Spotify Refresh Token Setup

The status page uses a **refresh token approach** for Spotify - no full OAuth flow on each request.

### Why do I need all three values?

- `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`: Authenticate your app with Spotify
- `SPOTIFY_REFRESH_TOKEN`: A permanent token that never expires

Spotify requires all three to exchange the refresh token for short-lived access tokens automatically.

### How to get your refresh token (one-time setup):

```bash
# 1. Create a Spotify app at https://developer.spotify.com/dashboard
# 2. Add https://addcommitpush.io/callback/spotify as a redirect URI
# 3. Run this script with your credentials:

pnpm tsx scripts/get-spotify-refresh-token.ts <YOUR_CLIENT_ID> <YOUR_CLIENT_SECRET>

# 4. Follow the prompts to authorize and get your refresh token
# 5. Copy the output to your .env.local file
```

Once set up, the refresh token works indefinitely - you never need to do OAuth again!
