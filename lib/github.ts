import { unstable_cache } from 'next/cache';

// Support multiple GitHub accounts
const PRIVATE_GITHUB_TOKEN = process.env.PRIVATE_GITHUB_TOKEN;
const PRIVATE_GITHUB_USERNAME = process.env.PRIVATE_GITHUB_USERNAME || 'emilwareus';

const OAIZ_GITHUB_TOKEN = process.env.OAIZ_GITHUB_TOKEN;
const OAIZ_GITHUB_USERNAME = process.env.OAIZ_GITHUB_USERNAME;

const YC_GITHUB_TOKEN = process.env.YC_GITHUB_TOKEN;
const YC_GITHUB_USERNAME = process.env.YC_GITHUB_USERNAME;

// TypeScript types
export interface DayActivity {
  date: string;
  count: number;
}

export interface Language {
  name: string;
  percentage: number;
  color: string;
}

export interface GitHubStatusData {
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalReviews: number;
  commitsByDay: DayActivity[];
  openedPRsByDay: DayActivity[];
  mergedPRsByDay: DayActivity[];
  prsByDay: DayActivity[]; // Combined for visualization
  issuesByDay: DayActivity[];
  reviewsByDay: DayActivity[];
  topLanguages: Language[];
  recentActivity: unknown[];
}

// GraphQL queries
const commitsQuery = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;

const prsSearchQuery = `
  query($searchQuery: String!, $cursor: String) {
    search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          createdAt
          mergedAt
        }
      }
    }
  }
`;

const issuesSearchQuery = `
  query($searchQuery: String!, $cursor: String) {
    search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on Issue {
          createdAt
        }
      }
    }
  }
`;

const reviewsSearchQuery = `
  query($searchQuery: String!, $cursor: String) {
    search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          reviews(first: 100) {
            nodes {
              author {
                login
              }
              createdAt
            }
          }
        }
      }
    }
  }
`;

const languagesQuery = `
  query($username: String!) {
    user(login: $username) {
      repositories(first: 10, orderBy: {field: UPDATED_AT, direction: DESC}, privacy: PUBLIC) {
        nodes {
          primaryLanguage {
            name
            color
          }
        }
      }
    }
  }
`;

interface GraphQLResponse {
  data?: unknown;
  errors?: { message: string }[];
}

async function fetchGraphQL(
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<GraphQLResponse> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    console.error('GitHub GraphQL errors:', data.errors);
    throw new Error('GitHub GraphQL query failed');
  }

  return data;
}

interface PRNode {
  createdAt: string;
  mergedAt: string | null;
}

interface SearchResponse {
  data: {
    search: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: PRNode[];
    };
  };
}

async function fetchAllPRs(
  token: string,
  username: string,
  fromDate: Date,
  toDate: Date
): Promise<{ createdAt: string; mergedAt: string | null }[]> {
  const fromStr = fromDate.toISOString().split('T')[0];
  const toStr = toDate.toISOString().split('T')[0];
  const searchString = `author:${username} is:pr created:${fromStr}..${toStr}`;

  let hasNextPage = true;
  let cursor: string | null = null;
  const allPRs: { createdAt: string; mergedAt: string | null }[] = [];

  while (hasNextPage && allPRs.length < 5000) {
    const variables: Record<string, unknown> = { searchQuery: searchString };
    if (cursor) variables.cursor = cursor;

    const data = (await fetchGraphQL(token, prsSearchQuery, variables)) as SearchResponse;
    const searchResults = data.data.search;

    allPRs.push(...searchResults.nodes);
    hasNextPage = searchResults.pageInfo.hasNextPage;
    cursor = searchResults.pageInfo.endCursor;
  }

  return allPRs;
}

interface IssueNode {
  createdAt: string;
}

interface IssueSearchResponse {
  data: {
    search: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: IssueNode[];
    };
  };
}

async function fetchAllIssues(
  token: string,
  username: string,
  fromDate: Date,
  toDate: Date
): Promise<{ createdAt: string }[]> {
  const fromStr = fromDate.toISOString().split('T')[0];
  const toStr = toDate.toISOString().split('T')[0];
  const searchString = `author:${username} is:issue created:${fromStr}..${toStr}`;

  let hasNextPage = true;
  let cursor: string | null = null;
  const allIssues: { createdAt: string }[] = [];

  while (hasNextPage && allIssues.length < 5000) {
    const variables: Record<string, unknown> = { searchQuery: searchString };
    if (cursor) variables.cursor = cursor;

    const data = (await fetchGraphQL(token, issuesSearchQuery, variables)) as IssueSearchResponse;
    const searchResults = data.data.search;

    allIssues.push(...searchResults.nodes);
    hasNextPage = searchResults.pageInfo.hasNextPage;
    cursor = searchResults.pageInfo.endCursor;
  }

  return allIssues;
}

interface ReviewNode {
  author: { login: string };
  createdAt: string;
}

interface PRWithReviews {
  reviews?: {
    nodes: ReviewNode[];
  };
}

interface ReviewSearchResponse {
  data: {
    search: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: PRWithReviews[];
    };
  };
}

async function fetchAllReviews(
  token: string,
  username: string,
  fromDate: Date,
  toDate: Date
): Promise<{ createdAt: string }[]> {
  const fromStr = fromDate.toISOString().split('T')[0];
  const toStr = toDate.toISOString().split('T')[0];
  const searchString = `reviewed-by:${username} is:pr created:${fromStr}..${toStr}`;

  let hasNextPage = true;
  let cursor: string | null = null;
  const allReviews: { createdAt: string }[] = [];

  while (hasNextPage && allReviews.length < 5000) {
    const variables: Record<string, unknown> = { searchQuery: searchString };
    if (cursor) variables.cursor = cursor;

    const data = (await fetchGraphQL(token, reviewsSearchQuery, variables)) as ReviewSearchResponse;
    const searchResults = data.data.search;

    searchResults.nodes.forEach((pr) => {
      pr.reviews?.nodes.forEach((review) => {
        if (review.author?.login === username) {
          allReviews.push({ createdAt: review.createdAt });
        }
      });
    });

    hasNextPage = searchResults.pageInfo.hasNextPage;
    cursor = searchResults.pageInfo.endCursor;
  }

  return allReviews;
}

interface LanguageResponse {
  data: {
    user: {
      repositories: {
        nodes: {
          primaryLanguage: {
            name: string;
            color: string;
          } | null;
        }[];
      };
    };
  };
}

interface CommitResponse {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: {
            contributionDays: {
              date: string;
              contributionCount: number;
            }[];
          }[];
        };
      };
    };
  };
}

interface AccountData {
  prs: { createdAt: string; mergedAt: string | null }[];
  issues: { createdAt: string }[];
  reviews: { createdAt: string }[];
  languages: LanguageResponse;
  commits: CommitResponse | null;
}

async function fetchAccountData(
  token: string,
  username: string,
  fromDate: Date,
  toDate: Date,
  includeCommits: boolean = true
): Promise<AccountData> {
  const promises: Promise<unknown>[] = [];

  promises.push(
    fetchAllPRs(token, username, fromDate, toDate),
    fetchAllIssues(token, username, fromDate, toDate),
    fetchAllReviews(token, username, fromDate, toDate),
    fetchGraphQL(token, languagesQuery, { username })
  );

  if (includeCommits) {
    promises.push(
      fetchGraphQL(token, commitsQuery, {
        username,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      })
    );
  }

  const results = await Promise.all(promises);

  return {
    prs: results[0] as { createdAt: string; mergedAt: string | null }[],
    issues: results[1] as { createdAt: string }[],
    reviews: results[2] as { createdAt: string }[],
    languages: results[3] as LanguageResponse,
    commits: includeCommits ? (results[4] as CommitResponse) : null,
  };
}

async function fetchGitHubDataInternal(): Promise<GitHubStatusData> {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const accountPromises = [];

  if (PRIVATE_GITHUB_TOKEN && PRIVATE_GITHUB_USERNAME) {
    accountPromises.push(
      fetchAccountData(PRIVATE_GITHUB_TOKEN, PRIVATE_GITHUB_USERNAME, oneYearAgo, now, true)
    );
  }

  if (OAIZ_GITHUB_TOKEN && OAIZ_GITHUB_USERNAME) {
    accountPromises.push(
      fetchAccountData(OAIZ_GITHUB_TOKEN, OAIZ_GITHUB_USERNAME, oneYearAgo, now, false)
    );
  }

  if (YC_GITHUB_TOKEN && YC_GITHUB_USERNAME) {
    accountPromises.push(
      fetchAccountData(YC_GITHUB_TOKEN, YC_GITHUB_USERNAME, oneYearAgo, now, true)
    );
  }

  if (accountPromises.length === 0) {
    throw new Error('No GitHub tokens configured');
  }

  const accountsData = await Promise.all(accountPromises);

  console.log(`GitHub API: Fetched data from ${accountsData.length} account(s)`);

  // Aggregate commits by day
  const commitsByDayMap = new Map<string, number>();
  accountsData.forEach((account) => {
    if (account.commits) {
      account.commits.data.user.contributionsCollection.contributionCalendar.weeks
        .flatMap((week) => week.contributionDays)
        .forEach((day) => {
          commitsByDayMap.set(
            day.date,
            (commitsByDayMap.get(day.date) || 0) + day.contributionCount
          );
        });
    }
  });

  // Aggregate opened PRs by day
  const openedPRsByDayMap = new Map<string, number>();
  // Aggregate merged PRs by day
  const mergedPRsByDayMap = new Map<string, number>();

  accountsData.forEach((account) => {
    account.prs.forEach((pr) => {
      // Count opened PR (+1)
      const openedDate = pr.createdAt.split('T')[0];
      openedPRsByDayMap.set(openedDate, (openedPRsByDayMap.get(openedDate) || 0) + 1);

      // Count merged PR (+1) if it was merged
      if (pr.mergedAt) {
        const mergedDate = pr.mergedAt.split('T')[0];
        mergedPRsByDayMap.set(mergedDate, (mergedPRsByDayMap.get(mergedDate) || 0) + 1);
      }
    });
  });

  // Aggregate issues by day
  const issuesByDayMap = new Map<string, number>();
  accountsData.forEach((account) => {
    account.issues.forEach((issue) => {
      const date = issue.createdAt.split('T')[0];
      issuesByDayMap.set(date, (issuesByDayMap.get(date) || 0) + 1);
    });
  });

  // Aggregate reviews by day
  const reviewsByDayMap = new Map<string, number>();
  accountsData.forEach((account) => {
    account.reviews.forEach((review) => {
      const date = review.createdAt.split('T')[0];
      reviewsByDayMap.set(date, (reviewsByDayMap.get(date) || 0) + 1);
    });
  });

  // Aggregate languages
  const languageCount = new Map<string, { count: number; color: string }>();
  accountsData.forEach((account) => {
    account.languages.data.user.repositories.nodes
      .filter((repo) => repo.primaryLanguage)
      .forEach((repo) => {
        const lang = repo.primaryLanguage!.name;
        const existing = languageCount.get(lang);
        if (existing) {
          existing.count++;
        } else {
          languageCount.set(lang, { count: 1, color: repo.primaryLanguage!.color });
        }
      });
  });

  // Get all unique dates
  const referenceAccount = accountsData.find((a) => a.commits);
  let allDates: string[] = [];

  if (referenceAccount) {
    allDates = referenceAccount
      .commits!.data.user.contributionsCollection.contributionCalendar.weeks.flatMap(
        (week) => week.contributionDays
      )
      .map((day) => day.date);
  } else {
    const dates: string[] = [];
    const currentDate = new Date(now);
    for (let i = 0; i < 365; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      dates.unshift(date.toISOString().split('T')[0]);
    }
    allDates = dates;
  }

  // Combine opened and merged PRs for visualization
  const prsByDayMap = new Map<string, number>();
  allDates.forEach((date) => {
    const opened = openedPRsByDayMap.get(date) || 0;
    const merged = mergedPRsByDayMap.get(date) || 0;
    prsByDayMap.set(date, opened + merged);
  });

  // Calculate totals
  const totalCommits = Array.from(commitsByDayMap.values()).reduce((sum, count) => sum + count, 0);
  // Total PRs should only count unique opened PRs, not merged
  const totalPRs = Array.from(openedPRsByDayMap.values()).reduce((sum, count) => sum + count, 0);
  const totalIssues = Array.from(issuesByDayMap.values()).reduce((sum, count) => sum + count, 0);
  const totalReviews = Array.from(reviewsByDayMap.values()).reduce((sum, count) => sum + count, 0);

  // Calculate top languages
  const totalRepos = accountsData.reduce(
    (sum, account) => sum + account.languages.data.user.repositories.nodes.length,
    0
  );
  const topLanguages = Array.from(languageCount.entries())
    .map(([name, { count, color }]) => ({
      name,
      percentage: Math.round((count / totalRepos) * 100),
      color: color || '#000000',
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 4);

  return {
    totalCommits,
    totalPRs,
    totalIssues,
    totalReviews,
    commitsByDay: allDates.map((date) => ({
      date,
      count: commitsByDayMap.get(date) || 0,
    })),
    openedPRsByDay: allDates.map((date) => ({
      date,
      count: openedPRsByDayMap.get(date) || 0,
    })),
    mergedPRsByDay: allDates.map((date) => ({
      date,
      count: mergedPRsByDayMap.get(date) || 0,
    })),
    prsByDay: allDates.map((date) => ({
      date,
      count: prsByDayMap.get(date) || 0,
    })),
    issuesByDay: allDates.map((date) => ({
      date,
      count: issuesByDayMap.get(date) || 0,
    })),
    reviewsByDay: allDates.map((date) => ({
      date,
      count: reviewsByDayMap.get(date) || 0,
    })),
    topLanguages,
    recentActivity: [],
  };
}

// Add persistent caching with 1-hour TTL
const getCachedGitHubData = unstable_cache(fetchGitHubDataInternal, ['github-status-data'], {
  tags: ['github-api'],
  revalidate: 3600 * 12, // 12 hours in seconds
});

export const getGitHubStatusData = getCachedGitHubData;
