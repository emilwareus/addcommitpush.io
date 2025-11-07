'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

    if (!key) {
      console.warn('PostHog key not found. Analytics disabled.')
      return
    }

    posthog.init(key, {
      api_host: host || '/ingest',
      ui_host: 'https://eu.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // Handled manually in PostHogPageView component
      capture_pageleave: true,
      cookieless_mode: 'always', // No cookies stored - privacy-focused
    })
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
