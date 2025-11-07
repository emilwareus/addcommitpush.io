import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { DayActivity } from './github'

const LINEAR_API_KEY = process.env.LINEAR_API_KEY
const LINEAR_API_URL = 'https://api.linear.app/graphql'

export interface LinearStatusData {
  totalIssues: number
  issuesByDay: DayActivity[]
}

interface GraphQLResponse {
  data?: unknown
  errors?: { message: string }[]
}

async function fetchGraphQL(
  query: string,
  variables: Record<string, unknown>
): Promise<GraphQLResponse> {
  if (!LINEAR_API_KEY) {
    throw new Error('Linear API key not configured')
  }

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': LINEAR_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.errors) {
    console.error('Linear GraphQL errors:', data.errors)
    throw new Error('Linear GraphQL query failed')
  }

  return data
}

// GraphQL query to get viewer (current user) ID
const viewerQuery = `
  query {
    viewer {
      id
    }
  }
`

// GraphQL query to get all issues created by the user
const issuesQuery = `
  query($after: String, $userId: ID!) {
    issues(first: 100, after: $after, filter: { creator: { id: { eq: $userId } } }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        createdAt
        creator {
          id
        }
      }
    }
  }
`

interface IssueNode {
  id: string
  title: string
  createdAt: string
  creator: {
    id: string
  } | null
}

interface IssuesResponse {
  data: {
    issues: {
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
      nodes: IssueNode[]
    }
  }
}

interface ViewerResponse {
  data: {
    viewer: {
      id: string
    }
  }
}

async function fetchAllIssues(userId: string): Promise<IssueNode[]> {
  let hasNextPage = true
  let cursor: string | null = null
  const allIssues: IssueNode[] = []

  while (hasNextPage && allIssues.length < 5000) {
    const variables: Record<string, unknown> = { userId }
    if (cursor) variables.after = cursor

    const data = (await fetchGraphQL(issuesQuery, variables)) as IssuesResponse
    const issuesData = data.data.issues

    // Issues are already filtered by creator in the GraphQL query
    allIssues.push(...issuesData.nodes)

    hasNextPage = issuesData.pageInfo.hasNextPage
    cursor = issuesData.pageInfo.endCursor
  }

  return allIssues
}

// Export internal function for testing
export async function fetchLinearDataInternal(): Promise<LinearStatusData> {
  if (!LINEAR_API_KEY) {
    // Return empty data if API key is not configured
    const now = new Date()
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    const allDates: string[] = []
    const currentDate = new Date(now)
    for (let i = 0; i < 365; i++) {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - i)
      allDates.unshift(date.toISOString().split('T')[0])
    }

    return {
      totalIssues: 0,
      issuesByDay: allDates.map((date) => ({ date, count: 0 })),
    }
  }

  // Get viewer (current user) ID
  const viewerData = (await fetchGraphQL(viewerQuery, {})) as ViewerResponse
  const userId = viewerData.data.viewer.id

  // Fetch issues
  const issues = await fetchAllIssues(userId)

  console.log(`Linear API: Fetched ${issues.length} issues`)

  // Aggregate issues by day
  const issuesByDayMap = new Map<string, number>()
  issues.forEach((issue) => {
    const date = issue.createdAt.split('T')[0]
    issuesByDayMap.set(date, (issuesByDayMap.get(date) || 0) + 1)
  })

  // Get all unique dates from the last year
  const now = new Date()
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  const allDates: string[] = []
  const currentDate = new Date(now)
  for (let i = 0; i < 365; i++) {
    const date = new Date(currentDate)
    date.setDate(date.getDate() - i)
    allDates.unshift(date.toISOString().split('T')[0])
  }

  // Calculate totals
  const totalIssues = issues.length

  return {
    totalIssues,
    issuesByDay: allDates.map((date) => ({
      date,
      count: issuesByDayMap.get(date) || 0,
    })),
  }
}

// Add persistent caching with 12-hour TTL
const getCachedLinearData = unstable_cache(
  fetchLinearDataInternal,
  ['linear-status-data'],
  {
    tags: ['linear-api'],
    revalidate: 3600 * 12, // 12 hours in seconds
  }
)

// Add request-level deduplication
export const getLinearStatusData = cache(getCachedLinearData)

