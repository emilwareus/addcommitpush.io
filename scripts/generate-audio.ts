#!/usr/bin/env tsx

/**
 * Generate Audio Script
 *
 * Converts text files to audio using ElevenLabs API v3.
 * Handles long texts by splitting into chunks and stitching audio files together.
 *
 * Usage:
 *   pnpm generate-audio <slug> [voice-id] [model-id]
 *
 * Examples:
 *   pnpm generate-audio recruiting-engineers-as-a-startup
 *   pnpm generate-audio recruiting-engineers-as-a-startup 21m00Tcm4TlvDq8ikWAM
 *   pnpm generate-audio my-post 21m00Tcm4TlvDq8ikWAM eleven_multilingual_v2
 *
 * Environment:
 *   ELEVENLABS_API_KEY  Required API key for ElevenLabs
 *
 * Output:
 *   - Audio file: public/posts/<slug>/audio.mp3
 *   - Format: MP3 at 192kbps, 44.1kHz (optimized for web)
 */

import { config } from 'dotenv'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'

// Load environment variables from .env.local
config({ path: '.env.local' })

const SCRIPTS_DIR = 'podcasts/scripts'
const OUTPUT_BASE_DIR = 'public/posts'
const TEMP_DIR = '.tmp-audio'

// ElevenLabs API configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const DEFAULT_VOICE_ID = 'yEgFhS0YPTUisv6dA301' // Protagonist Synthwave (custom voice)
const DEFAULT_MODEL = 'eleven_v3' // Most expressive model for blog narration
const MAX_CHARS_PER_REQUEST = 3000 // eleven_v3 character limit

interface ChunkInfo {
  index: number
  text: string
  charCount: number
}

interface GenerationResult {
  audioPath: string
  duration: number
  chunks: number
}

/**
 * Split text into chunks that fit within API character limits.
 * Splits on paragraph boundaries to maintain natural flow.
 */
function splitTextIntoChunks(text: string, maxChars: number): ChunkInfo[] {
  const chunks: ChunkInfo[] = []

  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())

  let currentChunk = ''
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim()

    // If adding this paragraph would exceed limit, start new chunk
    if (currentChunk && (currentChunk.length + trimmedParagraph.length + 2) > maxChars) {
      chunks.push({
        index: chunkIndex++,
        text: currentChunk.trim(),
        charCount: currentChunk.length,
      })
      currentChunk = ''
    }

    // If single paragraph exceeds limit, split by sentences
    if (trimmedParagraph.length > maxChars) {
      const sentences = trimmedParagraph.match(/[^.!?]+[.!?]+/g) || [trimmedParagraph]

      for (const sentence of sentences) {
        if (currentChunk && (currentChunk.length + sentence.length + 1) > maxChars) {
          chunks.push({
            index: chunkIndex++,
            text: currentChunk.trim(),
            charCount: currentChunk.length,
          })
          currentChunk = ''
        }
        currentChunk += (currentChunk ? ' ' : '') + sentence
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph
    }
  }

  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push({
      index: chunkIndex,
      text: currentChunk.trim(),
      charCount: currentChunk.length,
    })
  }

  return chunks
}

/**
 * Generate audio for a single text chunk using ElevenLabs API v3
 */
async function generateAudioChunk(
  text: string,
  voiceId: string,
  apiKey: string,
  outputPath: string,
  modelId: string = DEFAULT_MODEL
): Promise<void> {
  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      output_format: 'mp3_44100_192', // High-quality MP3 for blog narration
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  writeFileSync(outputPath, buffer)
}

/**
 * Concatenate multiple audio files using ffmpeg
 */
async function concatenateAudioFiles(inputPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create a temporary file list for ffmpeg
    const fileListPath = join(TEMP_DIR, 'filelist.txt')
    const fileListContent = inputPaths.map(path => `file '${join('..', path)}'`).join('\n')
    writeFileSync(fileListPath, fileListContent)

    // Use ffmpeg to concatenate with re-encoding to ensure consistent format
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', fileListPath,
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-ar', '44100',
      '-y', // Overwrite output file
      outputPath,
    ])

    let stderr = ''

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ffmpeg.on('close', (code) => {
      // Clean up file list
      try {
        unlinkSync(fileListPath)
      } catch {
        // Ignore cleanup errors
      }

      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg failed with code ${code}\n${stderr}`))
      }
    })

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`))
    })
  })
}

/**
 * Get audio duration using ffprobe
 */
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ])

    let stdout = ''
    let stderr = ''

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(stdout.trim())
        resolve(isNaN(duration) ? 0 : duration)
      } else {
        reject(new Error(`ffprobe failed: ${stderr}`))
      }
    })

    ffprobe.on('error', (err) => {
      reject(new Error(`Failed to spawn ffprobe: ${err.message}`))
    })
  })
}

/**
 * Clean up temporary audio files
 */
function cleanupTempFiles(): void {
  if (existsSync(TEMP_DIR)) {
    const files = readdirSync(TEMP_DIR)
    for (const file of files) {
      try {
        unlinkSync(join(TEMP_DIR, file))
      } catch {
        // Ignore errors
      }
    }
  }
}

async function generateAudio(
  slug: string,
  voiceId: string,
  apiKey: string,
  modelId: string = DEFAULT_MODEL
): Promise<GenerationResult> {
  // Read input text file
  const scriptPath = join(SCRIPTS_DIR, `${slug}.txt`)
  if (!existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`)
  }

  const text = readFileSync(scriptPath, 'utf-8')

  // Split into chunks if needed
  const chunks = splitTextIntoChunks(text, MAX_CHARS_PER_REQUEST)

  console.log(`\n📝 Text analysis:`)
  console.log(`   Total characters: ${text.length}`)
  console.log(`   Chunks needed: ${chunks.length}`)

  if (chunks.length > 1) {
    console.log(`   Chunk sizes: ${chunks.map(c => c.charCount).join(', ')} chars`)
  }

  // Create temp directory for chunk files
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true })
  }

  // Generate audio for each chunk
  const chunkPaths: string[] = []

  for (const chunk of chunks) {
    const chunkPath = join(TEMP_DIR, `chunk-${chunk.index}.mp3`)

    console.log(`\n🎙️  Generating audio for chunk ${chunk.index + 1}/${chunks.length}...`)

    await generateAudioChunk(chunk.text, voiceId, apiKey, chunkPath, modelId)
    chunkPaths.push(chunkPath)

    console.log(`   ✅ Chunk ${chunk.index + 1} complete`)
  }

  // Ensure output directory exists
  const outputDir = join(OUTPUT_BASE_DIR, slug)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const finalOutputPath = join(outputDir, 'audio.mp3')

  // Concatenate if multiple chunks, otherwise just move the file
  if (chunks.length > 1) {
    console.log(`\n🔗 Stitching ${chunks.length} audio chunks together...`)
    await concatenateAudioFiles(chunkPaths, finalOutputPath)
  } else {
    // Just copy the single chunk
    const chunkContent = readFileSync(chunkPaths[0])
    writeFileSync(finalOutputPath, chunkContent)
  }

  // Get duration
  const duration = await getAudioDuration(finalOutputPath)

  // Clean up temporary files
  cleanupTempFiles()

  return {
    audioPath: finalOutputPath,
    duration,
    chunks: chunks.length,
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Generate Audio Script

Converts text files to audio using ElevenLabs API v3.
Handles long texts by automatically splitting and stitching.

Usage:
  pnpm generate-audio <slug> [voice-id] [model-id]

Arguments:
  slug       The blog post slug (must match .txt file in ${SCRIPTS_DIR}/)
  voice-id   Optional ElevenLabs voice ID (default: ${DEFAULT_VOICE_ID})
  model-id   Optional model ID (default: ${DEFAULT_MODEL})

Available Models:
  eleven_v3                    Most expressive, ideal for narration (default)
  eleven_multilingual_v2       High quality for professional content
  eleven_turbo_v2_5           Fast with good quality
  eleven_flash_v2_5           Ultra-fast, lower latency

Environment Variables:
  ELEVENLABS_API_KEY   Required API key for ElevenLabs

Examples:
  pnpm generate-audio recruiting-engineers-as-a-startup
  pnpm generate-audio my-post 21m00Tcm4TlvDq8ikWAM
  pnpm generate-audio my-post 21m00Tcm4TlvDq8ikWAM eleven_multilingual_v2

Output:
  - Audio saved to: ${OUTPUT_BASE_DIR}/<slug>/audio.mp3
  - Format: MP3 at 192kbps, 44.1kHz (native v3 output)

Requirements:
  - ffmpeg must be installed (for concatenating chunks)
  - Valid ElevenLabs API key in environment

Notes:
  - Text longer than ${MAX_CHARS_PER_REQUEST} chars will be automatically split
  - Splits occur on paragraph boundaries for natural flow
  - Temporary chunk files are created in ${TEMP_DIR}/ and cleaned up after
    `)
    process.exit(0)
  }

  // Validate API key
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.error('\n❌ Error: ELEVENLABS_API_KEY environment variable is required')
    console.error('   Get your API key from: https://elevenlabs.io/app/settings/api-keys')
    console.error('   Then set it: export ELEVENLABS_API_KEY="your-key-here"')
    process.exit(1)
  }

  const slug = args[0]
  const voiceId = args[1] || DEFAULT_VOICE_ID
  const modelId = args[2] || DEFAULT_MODEL

  try {
    console.log(`\n🎵 Generating audio for: ${slug}`)
    console.log(`   Voice ID: ${voiceId}`)
    console.log(`   Model: ${modelId}`)

    const result = await generateAudio(slug, voiceId, apiKey, modelId)

    console.log(`\n✅ Audio generation complete!`)
    console.log(`   File: ${result.audioPath}`)
    console.log(`   Duration: ${Math.floor(result.duration / 60)}m ${Math.floor(result.duration % 60)}s`)
    console.log(`   Chunks: ${result.chunks}`)

    // Get file size
    const stats = readFileSync(result.audioPath)
    const fileSizeMB = stats.length / (1024 * 1024)
    console.log(`   Size: ${fileSizeMB.toFixed(2)} MB`)

    console.log(`\n📝 Next steps:`)
    console.log(`   1. Test the audio file: open ${result.audioPath}`)
    console.log(`   2. Add to your blog post component:`)
    console.log(`      <AudioPlayer audioUrl="/posts/${slug}/audio.mp3" title="Your Title" />`)
    console.log(`   3. Commit the audio file to the repository`)
    console.log(``)

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error))

    // Clean up on error
    cleanupTempFiles()

    process.exit(1)
  }
}

main()
