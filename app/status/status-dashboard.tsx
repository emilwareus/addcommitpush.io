'use client'

import { motion, LayoutGroup } from 'framer-motion'
import { GitHubCard } from './components/github-card'
import { SpotifyCard } from './components/spotify-card'
import type { GitHubStatusData } from '@/lib/github'

interface StatusDashboardProps {
  githubData: GitHubStatusData
}

export function StatusDashboard({ githubData }: StatusDashboardProps) {
  return (
    <LayoutGroup>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        layout
      >
        {/* GitHub Stats - Large card (2 columns on large screens, full height) */}
        <motion.div
          className="lg:col-span-2"
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GitHubCard data={githubData} />
        </motion.div>

        {/* Spotify Now Playing */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SpotifyCard />
        </motion.div>
      </motion.div>
    </LayoutGroup>
  )
}
