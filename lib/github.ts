import { unstable_cache } from 'next/cache';

// Support multiple GitHub accounts
const PRIVATE_GITHUB_TOKEN = process.env.PRIVATE_GITHUB_TOKEN;
const PRIVATE_GITHUB_USERNAME = process.env.PRIVATE_GITHUB_USERNAME || 'emilwareus';

const OAIZ_GITHUB_TOKEN = process.env.OAIZ_GITHUB_TOKEN;
const OAIZ_GITHUB_USERNAME = process.env.OAIZ_GITHUB_USERNAME;

const YC_GITHUB_TOKEN = process.env.YC_GITHUB_TOKEN;
const YC_GITHUB_USERNAME = process.env.YC_GITHUB_USERNAME;

const DEV5_GITHUB_USERNAME = 'oaizdev5';
const DEV5_GITHUB_ORG = 'Devloupe';

interface GitHubAccountConfig {
  label: string;
  token: string | undefined;
  username: string | undefined;
  includeCommits: boolean;
  includeDev5PullRequestCommits?: boolean;
  includePRs: boolean;
  includeIssues: boolean;
  includeReviews: boolean;
  includeLanguages: boolean;
  searchScope?: string;
}

const githubAccountConfigs: GitHubAccountConfig[] = [
  {
    label: 'private',
    token: PRIVATE_GITHUB_TOKEN,
    username: PRIVATE_GITHUB_USERNAME,
    includeCommits: true,
    includePRs: true,
    includeIssues: true,
    includeReviews: true,
    includeLanguages: true,
  },
  {
    label: 'OAIZ',
    token: OAIZ_GITHUB_TOKEN,
    username: OAIZ_GITHUB_USERNAME,
    includeCommits: false,
    includePRs: true,
    includeIssues: true,
    includeReviews: true,
    includeLanguages: true,
  },
  {
    label: 'dev5',
    token: OAIZ_GITHUB_TOKEN,
    username: DEV5_GITHUB_USERNAME,
    includeCommits: false,
    includeDev5PullRequestCommits: true,
    includePRs: true,
    includeIssues: false,
    includeReviews: false,
    includeLanguages: false,
    searchScope: `org:${DEV5_GITHUB_ORG}`,
  },
  {
    label: 'YC',
    token: YC_GITHUB_TOKEN,
    username: YC_GITHUB_USERNAME,
    includeCommits: true,
    includePRs: true,
    includeIssues: true,
    includeReviews: true,
    includeLanguages: true,
  },
];

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

const pullRequestsWithRepositoryQuery = `
  query($searchQuery: String!, $cursor: String) {
    search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          number
          createdAt
          mergedAt
          repository {
            nameWithOwner
          }
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

const dev5AuthorNames = new Set(['dev5', 'oaiz dev5']);
const dev5AuthorEmails = new Set(['dev5@oaiz.io', 'dev5@devloupe.local']);
const dev5CommitFetchConcurrency = 12;

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchGraphQL(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  retries = 3
): Promise<GraphQLResponse> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          console.warn(`GitHub API ${response.status}, attempt ${attempt + 1}/${retries}`);
          if (attempt < retries - 1) {
            await delay(1000 * Math.pow(2, attempt)); // Exponential backoff
            continue;
          }
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        console.error('GitHub GraphQL errors:', data.errors);
        throw new Error('GitHub GraphQL query failed');
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`GitHub API timeout, attempt ${attempt + 1}/${retries}`);
        if (attempt < retries - 1) {
          await delay(1000 * Math.pow(2, attempt));
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error('GitHub API failed after all retries');
}

function buildPRSearchString(
  username: string,
  fromDate: Date,
  toDate: Date,
  searchScope?: string
): string {
  const fromStr = fromDate.toISOString().split('T')[0];
  const toStr = toDate.toISOString().split('T')[0];
  return [searchScope, `author:${username}`, 'is:pr', `created:${fromStr}..${toStr}`]
    .filter(Boolean)
    .join(' ');
}

async function fetchGitHubRest<T>(token: string, url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub REST API error: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
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

interface PullRequestWithRepository {
  number: number;
  createdAt: string;
  mergedAt: string | null;
  repository: {
    nameWithOwner: string;
  };
}

interface PullRequestWithRepositorySearchResponse {
  data: {
    search: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: PullRequestWithRepository[];
    };
  };
}

interface RestPullRequestCommit {
  sha: string;
  author: {
    login: string;
  } | null;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    } | null;
  };
}

interface PullRequestCommitDay {
  date: string;
  sha: string;
}

async function fetchAllPRs(
  token: string,
  username: string,
  fromDate: Date,
  toDate: Date,
  searchScope?: string
): Promise<{ createdAt: string; mergedAt: string | null }[]> {
  const searchString = buildPRSearchString(username, fromDate, toDate, searchScope);

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

    // Small delay between paginated requests
    if (hasNextPage) await delay(100);
  }

  return allPRs;
}

async function fetchAllPRsWithRepository(
  token: string,
  username: string,
  fromDate: Date,
  toDate: Date,
  searchScope?: string
): Promise<PullRequestWithRepository[]> {
  const searchString = buildPRSearchString(username, fromDate, toDate, searchScope);

  let hasNextPage = true;
  let cursor: string | null = null;
  const allPRs: PullRequestWithRepository[] = [];

  while (hasNextPage && allPRs.length < 5000) {
    const variables: Record<string, unknown> = { searchQuery: searchString };
    if (cursor) variables.cursor = cursor;

    const data = (await fetchGraphQL(
      token,
      pullRequestsWithRepositoryQuery,
      variables
    )) as PullRequestWithRepositorySearchResponse;
    const searchResults = data.data.search;

    allPRs.push(...searchResults.nodes);
    hasNextPage = searchResults.pageInfo.hasNextPage;
    cursor = searchResults.pageInfo.endCursor;

    if (hasNextPage) await delay(100);
  }

  return allPRs;
}

function isDev5AuthoredCommit(commit: RestPullRequestCommit): boolean {
  const authorLogin = commit.author?.login.toLowerCase();
  const authorName = commit.commit.author?.name.toLowerCase();
  const authorEmail = commit.commit.author?.email.toLowerCase();

  return (
    authorLogin === DEV5_GITHUB_USERNAME ||
    (authorName !== undefined && dev5AuthorNames.has(authorName)) ||
    (authorEmail !== undefined && dev5AuthorEmails.has(authorEmail))
  );
}

async function fetchPullRequestCommits(
  token: string,
  pullRequest: PullRequestWithRepository
): Promise<RestPullRequestCommit[]> {
  const [owner, repo] = pullRequest.repository.nameWithOwner.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository name: ${pullRequest.repository.nameWithOwner}`);
  }

  const commits: RestPullRequestCommit[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/pulls/${pullRequest.number}/commits?per_page=100&page=${page}`;
    const pageCommits = await fetchGitHubRest<RestPullRequestCommit[]>(token, url);

    commits.push(...pageCommits);
    hasNextPage = pageCommits.length === 100;
    page++;
  }

  return commits;
}

async function fetchDev5PullRequestCommitDays(
  token: string,
  pullRequests: PullRequestWithRepository[]
): Promise<PullRequestCommitDay[]> {
  const seenShas = new Set<string>();
  const commitDays: PullRequestCommitDay[] = [];
  const pullRequestCommits = await mapWithConcurrency(
    pullRequests,
    dev5CommitFetchConcurrency,
    (pullRequest) => fetchPullRequestCommits(token, pullRequest)
  );

  pullRequestCommits.forEach((commits) => {
    commits.forEach((commit) => {
      if (!isDev5AuthoredCommit(commit) || seenShas.has(commit.sha)) return;

      const date = commit.commit.author?.date;
      if (!date) {
        throw new Error(`Missing author date for commit ${commit.sha}`);
      }

      seenShas.add(commit.sha);
      commitDays.push({
        date: date.split('T')[0],
        sha: commit.sha,
      });
    });
  });

  return commitDays;
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

    // Small delay between paginated requests
    if (hasNextPage) await delay(100);
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

    // Small delay between paginated requests
    if (hasNextPage) await delay(100);
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
  languages: LanguageResponse | null;
  commits: CommitResponse | null;
  commitDays: PullRequestCommitDay[];
}

async function fetchAccountData(
  token: string,
  username: string,
  fromDate: Date,
  toDate: Date,
  config: GitHubAccountConfig
): Promise<AccountData> {
  if (config.includeDev5PullRequestCommits) {
    const pullRequests = await fetchAllPRsWithRepository(
      token,
      username,
      fromDate,
      toDate,
      config.searchScope
    );
    const [issues, reviews, languages, commitDays] = await Promise.all([
      config.includeIssues
        ? fetchAllIssues(token, username, fromDate, toDate)
        : Promise.resolve([]),
      config.includeReviews
        ? fetchAllReviews(token, username, fromDate, toDate)
        : Promise.resolve([]),
      config.includeLanguages
        ? (fetchGraphQL(token, languagesQuery, { username }) as Promise<LanguageResponse>)
        : Promise.resolve(null),
      fetchDev5PullRequestCommitDays(token, pullRequests),
    ]);

    return {
      prs: pullRequests.map((pullRequest) => ({
        createdAt: pullRequest.createdAt,
        mergedAt: pullRequest.mergedAt,
      })),
      issues,
      reviews,
      languages,
      commits: null,
      commitDays,
    };
  }

  const prsPromise: Promise<{ createdAt: string; mergedAt: string | null }[]> = config.includePRs
    ? fetchAllPRs(token, username, fromDate, toDate, config.searchScope)
    : Promise.resolve([]);
  const issuesPromise: Promise<{ createdAt: string }[]> = config.includeIssues
    ? fetchAllIssues(token, username, fromDate, toDate)
    : Promise.resolve([]);
  const reviewsPromise: Promise<{ createdAt: string }[]> = config.includeReviews
    ? fetchAllReviews(token, username, fromDate, toDate)
    : Promise.resolve([]);
  const languagesPromise: Promise<LanguageResponse | null> = config.includeLanguages
    ? (fetchGraphQL(token, languagesQuery, { username }) as Promise<LanguageResponse>)
    : Promise.resolve(null);
  const commitsPromise: Promise<CommitResponse | null> = config.includeCommits
    ? (fetchGraphQL(token, commitsQuery, {
        username,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      }) as Promise<CommitResponse>)
    : Promise.resolve(null);

  const [prs, issues, reviews, languages, commits] = await Promise.all([
    prsPromise,
    issuesPromise,
    reviewsPromise,
    languagesPromise,
    commitsPromise,
  ]);

  return {
    prs,
    issues,
    reviews,
    languages,
    commits,
    commitDays: [],
  };
}

async function fetchGitHubDataInternal(): Promise<GitHubStatusData> {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Fetch accounts sequentially to avoid overwhelming GitHub API
  const accountsData: AccountData[] = [];

  for (const accountConfig of githubAccountConfigs) {
    if (accountConfig.token && accountConfig.username) {
      console.log(`[GitHub] Fetching data for ${accountConfig.label} account...`);
      accountsData.push(
        await fetchAccountData(
          accountConfig.token,
          accountConfig.username,
          oneYearAgo,
          now,
          accountConfig
        )
      );
    }
  }

  if (accountsData.length === 0) {
    throw new Error('No GitHub tokens configured');
  }

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

    account.commitDays.forEach((day) => {
      commitsByDayMap.set(day.date, (commitsByDayMap.get(day.date) || 0) + 1);
    });
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
    account.languages?.data.user.repositories.nodes
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
    (sum, account) => sum + (account.languages?.data.user.repositories.nodes.length || 0),
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

// Short cache to smooth out bursts; ISR handles freshness
const getCachedGitHubData = unstable_cache(fetchGitHubDataInternal, ['github-status-data'], {
  tags: ['github-api'],
  revalidate: 600, // 10 minutes in seconds
});

export const getGitHubStatusData = getCachedGitHubData;
