#!/usr/bin/env tsx
/**
 * Link Checker for About Page
 * Validates all external links to ensure they're not dead/broken
 */

import { readFileSync } from "fs"
import { join } from "path"

interface LinkResult {
  url: string
  status: number
  ok: boolean
  error?: string
}

// Extract all URLs from the about page
function extractLinksFromAboutPage(): string[] {
  const aboutPagePath = join(process.cwd(), "app/(pages)/about/page.tsx")
  const content = readFileSync(aboutPagePath, "utf-8")

  // Match href="..." patterns
  const hrefMatches = content.match(/href="(https?:\/\/[^"]+)"/g) || []
  const urls = hrefMatches.map((match) => {
    const urlMatch = match.match(/href="([^"]+)"/)
    return urlMatch ? urlMatch[1] : ""
  })

  // Return unique URLs only
  return [...new Set(urls.filter(Boolean))]
}

// Check if a URL is accessible
async function checkLink(url: string): Promise<LinkResult> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)",
      },
    })

    clearTimeout(timeoutId)

    return {
      url,
      status: response.status,
      ok: response.ok,
    }
  } catch (error) {
    // If HEAD fails, try GET (some servers don't support HEAD)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)",
        },
      })

      clearTimeout(timeoutId)

      return {
        url,
        status: response.status,
        ok: response.ok,
      }
    } catch (getError) {
      return {
        url,
        status: 0,
        ok: false,
        error: getError instanceof Error ? getError.message : String(getError),
      }
    }
  }
}

// Main function
async function main() {
  console.log("🔍 Checking links in about page...\n")

  const links = extractLinksFromAboutPage()
  console.log(`Found ${links.length} unique external links\n`)

  const results: LinkResult[] = []

  // Check links with concurrency limit
  const CONCURRENCY = 5
  for (let i = 0; i < links.length; i += CONCURRENCY) {
    const batch = links.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(checkLink))
    results.push(...batchResults)

    // Progress indicator
    console.log(`Progress: ${Math.min(i + CONCURRENCY, links.length)}/${links.length}`)
  }

  console.log("\n" + "=".repeat(80) + "\n")

  // Separate working and broken links
  const workingLinks = results.filter((r) => r.ok)
  const brokenLinks = results.filter((r) => !r.ok)

  console.log(`✅ Working Links: ${workingLinks.length}\n`)
  workingLinks.forEach((link) => {
    console.log(`  [${link.status}] ${link.url}`)
  })

  if (brokenLinks.length > 0) {
    console.log(`\n❌ Broken Links: ${brokenLinks.length}\n`)
    brokenLinks.forEach((link) => {
      console.log(`  [${link.status}] ${link.url}`)
      if (link.error) {
        console.log(`      Error: ${link.error}`)
      }
    })

    console.log("\n" + "=".repeat(80))
    console.log("⚠️  Some links are broken. Please review and fix them.")
    process.exit(1)
  } else {
    console.log("\n" + "=".repeat(80))
    console.log("✨ All links are working!")
    process.exit(0)
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
