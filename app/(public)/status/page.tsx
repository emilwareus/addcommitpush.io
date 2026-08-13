import { Suspense } from 'react';
import { getGitHubStatusData } from '@/lib/github';
import { getLinearStatusData } from '@/lib/linear';
import type { DayActivity } from '@/lib/github';
import { StatusGrid } from './components/status-grid';
import { GitHubCard } from './components/github-card';
import { SpotifyCard } from './components/spotify-card';

// ISR: statically generate at build, revalidate every 4 hours (shared by all users)
export const revalidate = 14400; // 4 hours in seconds

export const metadata = {
  title: 'Status - Emil Wåreus',
  description: "What I'm working on, listening to, and doing right now.",
  openGraph: {
    title: 'Status - Emil Wåreus',
    description: 'Real-time view into my current activities.',
    url: 'https://addcommitpush.io/status',
    images: [
      {
        url: 'https://addcommitpush.io/og-status.png',
        width: 1200,
        height: 630,
        alt: 'Status Page',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Status - Emil Wåreus',
    description: 'Real-time view into my current activities.',
    images: ['https://addcommitpush.io/og-status.png'],
  },
};

export default async function StatusPage() {
  const fetchTime = new Date();
  console.log('[Status Page] Fetching data at:', fetchTime.toISOString());

  const [githubData, linearData] = await Promise.all([
    getGitHubStatusData(),
    getLinearStatusData(),
  ]);

  console.log('[Status Page] Data fetched successfully');

  // Combine Linear issues with GitHub issues
  const combinedIssuesByDay: DayActivity[] = githubData.issuesByDay.map((githubDay, index) => {
    const linearDay = linearData.issuesByDay[index];
    return {
      date: githubDay.date,
      count: githubDay.count + (linearDay?.count || 0),
    };
  });

  const combinedTotalIssues = githubData.totalIssues + linearData.totalIssues;

  // Create combined data
  const combinedData = {
    ...githubData,
    issuesByDay: combinedIssuesByDay,
    totalIssues: combinedTotalIssues,
  };

  return (
    <main className="site-container py-16">
      <section className="mb-12">
        <div className="section-kicker mb-6">Live-ish systems</div>
        <h1 className="display-heading text-[clamp(3.25rem,9vw,6.5rem)]">Status</h1>
        <p className="mt-8 max-w-3xl text-[15px] leading-[1.75] text-muted-foreground">
          What I&apos;m working on, listening to, and doing right now.
        </p>
      </section>

      <Suspense fallback={<div>Loading activity...</div>}>
        <StatusGrid data={combinedData} />
      </Suspense>

      <section className="mt-12">
        <h2 className="display-heading mb-6 text-3xl">Current Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* GitHub Stats - Server Rendered, Cached */}
          <div className="lg:col-span-2">
            <GitHubCard data={combinedData} />
          </div>

          {/* Spotify Now Playing - Client Component */}
          <div>
            <SpotifyCard />
          </div>
        </div>
      </section>
    </main>
  );
}
