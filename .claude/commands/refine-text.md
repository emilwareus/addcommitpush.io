# Refine Text for Audio Narration

You are tasked with refining raw text extracted from a blog post to make it suitable for audio narration (podcast/TTS format).

## Context

The user has extracted plain text from a blog post component using `pnpm extract-text <slug>`. This raw text is saved in `podcasts/scripts/<slug>.txt`.

The text needs to be refined for audio narration, but should remain **90% identical** to the original. Only fix things that don't work well in audio format.

## Your Task

1. **Read the raw text file** from `podcasts/scripts/<slug>.txt`
2. **Refine the text** for audio narration by:
   - Removing or describing visual-only references (e.g., "as shown in the image above")
   - Converting lists into flowing sentences when appropriate
   - Fixing awkward phrasing that works in text but not in speech
   - Expanding abbreviations that might be unclear when spoken
   - Adding natural transitions between sections
   - Removing references to interactive elements (buttons, links, etc.)
   - Keeping the tone, voice, and 90% of the original content intact

3. **Save the refined version** to the same file, overwriting the raw extraction

## Guidelines

**Do refine:**
- ✅ "See the chart below" → "Consider the following data"
- ✅ "Click here to learn more" → "More information on this topic"
- ✅ "TL;DR" → "In summary" or "To summarize"
- ✅ Bullet points → Flowing sentences with appropriate transitions
- ✅ "etc." → "and so on" or "among others"
- ✅ Awkward line breaks → Smooth paragraphs

**Don't change:**
- ❌ The author's voice and tone
- ❌ Technical accuracy or key points
- ❌ The overall structure and flow
- ❌ Core content (should be 90% identical)
- ❌ Personal anecdotes or stories

## Example Transformation

**Before (raw):**
```
Intro

As someone who's worked as a data lead...

What will you get to read

• Recruitment process
• How I evaluate candidates
• How to find good candidates

Click here for more details.
```

**After (refined):**
```
Introduction

As someone who's worked as a data lead...

In this post, I'll cover three main topics: the recruitment process, how I evaluate candidates, and how to find good candidates.
```

## Output

After refining:
1. Save the refined text to the same file
2. Report the changes made (briefly)
3. Show before/after word count
4. Confirm the file is ready for audio generation

Remember: This is a refinement, not a rewrite. Keep it **90% identical** to the original.
