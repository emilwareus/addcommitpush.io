#!/usr/bin/env tsx
/**
 * Integration test for Linear API
 * 
 * Tests the Linear API integration by:
 * 1. Fetching viewer ID
 * 2. Fetching projects created by the user
 * 3. Fetching issues created by the user
 * 4. Validating the data structure
 * 
 * Usage: pnpm tsx scripts/test-linear-integration.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const LINEAR_API_KEY = process.env.LINEAR_API_KEY
const LINEAR_API_URL = 'https://api.linear.app/graphql'

interface GraphQLResponse {
  data?: unknown
  errors?: { message: string }[]
}

async function fetchGraphQL(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<GraphQLResponse> {
  if (!LINEAR_API_KEY) {
    throw new Error('LINEAR_API_KEY not configured. Set it in .env.local')
  }

  console.log(`\n📡 Executing GraphQL query...`)
  console.log(`Query: ${query.substring(0, 100)}...`)
  console.log(`Variables:`, variables)

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': LINEAR_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  console.log(`Response status: ${response.status} ${response.statusText}`)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Linear API error: ${response.status}\n${text}`)
  }

  const data = await response.json()

  if (data.errors) {
    console.error('❌ GraphQL errors:', JSON.stringify(data.errors, null, 2))
    throw new Error('Linear GraphQL query failed')
  }

  return data
}

async function testViewerQuery() {
  console.log('\n🧪 Test 1: Fetching viewer (current user) ID')
  
  const viewerQuery = `
    query {
      viewer {
        id
        name
        email
      }
    }
  `

  const data = await fetchGraphQL(viewerQuery)
  const viewer = (data.data as { viewer: { id: string; name: string; email: string } }).viewer
  
  console.log(`✅ Viewer ID: ${viewer.id}`)
  console.log(`✅ Viewer Name: ${viewer.name}`)
  console.log(`✅ Viewer Email: ${viewer.email}`)
  
  return viewer.id
}

async function testProjectsQuery(userId: string) {
  console.log('\n🧪 Test 2: Fetching projects created by user')
  
  const projectsQuery = `
    query($after: String, $userId: ID!) {
      projects(first: 10, after: $after, filter: { creator: { id: { eq: $userId } } }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          name
          createdAt
          creator {
            id
            name
          }
        }
      }
    }
  `

  const data = await fetchGraphQL(projectsQuery, { userId })
  const projects = (data.data as {
    projects: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: Array<{
        id: string
        name: string
        createdAt: string
        creator: { id: string; name: string } | null
      }>
    }
  }).projects

  console.log(`✅ Found ${projects.nodes.length} projects`)
  console.log(`✅ Has next page: ${projects.pageInfo.hasNextPage}`)
  
  if (projects.nodes.length > 0) {
    console.log(`\n📋 Sample projects:`)
    projects.nodes.slice(0, 3).forEach((project) => {
      console.log(`  - ${project.name} (created: ${project.createdAt})`)
    })
  }
  
  return projects.nodes
}

async function testIssuesQuery(userId: string) {
  console.log('\n🧪 Test 3: Fetching issues created by user')
  
  const issuesQuery = `
    query($after: String, $userId: ID!) {
      issues(first: 10, after: $after, filter: { creator: { id: { eq: $userId } } }) {
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
            name
          }
        }
      }
    }
  `

  const data = await fetchGraphQL(issuesQuery, { userId })
  const issues = (data.data as {
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: Array<{
        id: string
        title: string
        createdAt: string
        creator: { id: string; name: string } | null
      }>
    }
  }).issues

  console.log(`✅ Found ${issues.nodes.length} issues`)
  console.log(`✅ Has next page: ${issues.pageInfo.hasNextPage}`)
  
  if (issues.nodes.length > 0) {
    console.log(`\n📋 Sample issues:`)
    issues.nodes.slice(0, 3).forEach((issue) => {
      console.log(`  - ${issue.title.substring(0, 50)}... (created: ${issue.createdAt})`)
    })
  }
  
  return issues.nodes
}

async function testFullIntegration() {
  console.log('\n🧪 Test 4: Testing full integration function')
  
  // Import the actual function (internal version for testing)
  const { fetchLinearDataInternal } = await import('../lib/linear')
  
  const result = await fetchLinearDataInternal()
  
  console.log(`✅ Total Projects: ${result.totalProjects}`)
  console.log(`✅ Total Issues: ${result.totalIssues}`)
  console.log(`✅ Projects by day entries: ${result.projectsByDay.length}`)
  console.log(`✅ Issues by day entries: ${result.issuesByDay.length}`)
  
  // Validate structure
  if (result.projectsByDay.length !== 365) {
    throw new Error(`Expected 365 days for projectsByDay, got ${result.projectsByDay.length}`)
  }
  if (result.issuesByDay.length !== 365) {
    throw new Error(`Expected 365 days for issuesByDay, got ${result.issuesByDay.length}`)
  }
  
  // Check if there are any days with activity
  const daysWithProjects = result.projectsByDay.filter(d => d.count > 0).length
  const daysWithIssues = result.issuesByDay.filter(d => d.count > 0).length
  
  console.log(`✅ Days with projects: ${daysWithProjects}`)
  console.log(`✅ Days with issues: ${daysWithIssues}`)
  
  if (daysWithProjects > 0) {
    const sampleProjectDay = result.projectsByDay.find(d => d.count > 0)
    console.log(`✅ Sample project day: ${sampleProjectDay?.date} - ${sampleProjectDay?.count} projects`)
  }
  
  if (daysWithIssues > 0) {
    const sampleIssueDay = result.issuesByDay.find(d => d.count > 0)
    console.log(`✅ Sample issue day: ${sampleIssueDay?.date} - ${sampleIssueDay?.count} issues`)
  }
  
  // Validate date format
  const firstDate = result.projectsByDay[0]?.date
  if (firstDate && !/^\d{4}-\d{2}-\d{2}$/.test(firstDate)) {
    throw new Error(`Invalid date format: ${firstDate}`)
  }
  
  console.log(`✅ Date format validated: ${firstDate}`)
  
  return result
}

async function main() {
  console.log('🚀 Starting Linear API Integration Test\n')
  console.log(`API Key configured: ${LINEAR_API_KEY ? '✅ Yes' : '❌ No'}`)
  
  if (!LINEAR_API_KEY) {
    console.error('\n❌ ERROR: LINEAR_API_KEY not found in environment variables')
    console.error('Please set LINEAR_API_KEY in your .env.local file')
    process.exit(1)
  }

  try {
    // Test 1: Viewer query
    const userId = await testViewerQuery()
    
    // Test 2: Projects query
    const projects = await testProjectsQuery(userId)
    
    // Test 3: Issues query
    const issues = await testIssuesQuery(userId)
    
    // Test 4: Full integration
    await testFullIntegration()
    
    console.log('\n✅ All tests passed!')
    console.log(`\n📊 Summary:`)
    console.log(`  - User ID: ${userId}`)
    console.log(`  - Projects found: ${projects.length}`)
    console.log(`  - Issues found: ${issues.length}`)
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

main()

