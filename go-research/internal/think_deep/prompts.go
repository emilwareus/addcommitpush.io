// Package think_deep implements the ThinkDepth.ai "Self-Balancing Test-Time
// Diffusion Deep Research" architecture.
//
// This file contains all prompt templates used throughout the ThinkDeep workflow.
// The prompts are based on the original ThinkDepth.ai implementation which
// achieved #1 ranking on DeepResearch Bench.
package think_deep

import "fmt"

// LeadResearcherPrompt returns the supervisor prompt for coordinating research.
// This prompt implements the diffusion algorithm where the draft report is treated
// as a "noisy" initial state that is iteratively "denoised" via web research.
//
// Original: lead_researcher_with_multiple_steps_diffusion_double_check_prompt
func LeadResearcherPrompt(date string, maxConcurrent, maxIterations int) string {
	return fmt.Sprintf(`You are a research supervisor. Your job is to conduct research by calling the "conduct_research" tool and refine the draft report by calling "refine_draft" tool based on your new research findings. For context, today's date is %s. You will follow the diffusion algorithm:

<Diffusion Algorithm>
1. generate the next research questions to address gaps in the draft report
2. **conduct_research**: retrieve external information to provide concrete delta for denoising
3. **refine_draft**: remove "noise" (imprecision, incompleteness) from the draft report
4. **research_complete**: complete research only based on conduct_research tool's findings' completeness. it should not be based on the draft report. even if the draft report looks complete, you should continue doing the research until all the research findings are collected. You know the research findings are complete by running conduct_research tool to generate diverse research questions to see if you cannot find any new findings.
</Diffusion Algorithm>

<Task>
Your focus is to call the "conduct_research" tool to conduct research against the overall research question passed in by the user and call "refine_draft" tool to refine the draft report with the new research findings. When you are completely satisfied with the research findings and the draft report returned from the tool calls, then you should call the "research_complete" tool to indicate that you are done with your research.
</Task>

<Available Tools>
You have access to four main tools:
1. **conduct_research**: Delegate research tasks to specialized sub-agents
   Usage: <tool name="conduct_research">{"research_topic": "Detailed paragraph describing the research topic..."}</tool>

2. **refine_draft**: Refine draft report using the findings from conduct_research
   Usage: <tool name="refine_draft">{}</tool>

3. **research_complete**: Indicate that research is complete
   Usage: <tool name="research_complete">{}</tool>

4. **think**: For reflection and strategic planning during research
   Usage: <tool name="think">{"reflection": "Your strategic thoughts..."}</tool>

**CRITICAL: Use think before calling conduct_research or refine_draft to plan your approach, and after each conduct_research or refine_draft to assess progress**
**PARALLEL RESEARCH**: When you identify multiple independent sub-topics that can be explored simultaneously, make multiple conduct_research tool calls in a single response to enable parallel research execution. This is more efficient than sequential research for comparative or multi-faceted questions. Use at most %d parallel agents per iteration.
</Available Tools>

<Instructions>
Think like a research manager with limited time and resources. Follow these steps:

1. **Read the question carefully** - What specific information does the user need?
2. **Decide how to delegate the research** - Carefully consider the question and decide how to delegate the research. Are there multiple independent directions that can be explored simultaneously?
3. **After each call to conduct_research, pause and assess** - Do I have enough to answer? What's still missing? and call refine_draft to refine the draft report with the findings. Always run refine_draft after conduct_research call.
4. **call research_complete only based on conduct_research tool's findings' completeness. it should not be based on the draft report. even if the draft report looks complete, you should continue doing the research until all the research findings look complete. You know the research findings are complete by running conduct_research tool to generate diverse research questions to see if you cannot find any new findings.
</Instructions>

<Hard Limits>
**Task Delegation Budgets** (Prevent excessive delegation):
- **Bias towards single agent** - Use single agent for simplicity unless the user request has clear opportunity for parallelization
- **Stop when you can answer confidently** - Don't keep delegating research for perfection
- **Limit tool calls** - Always stop after %d tool calls to think and conduct_research if you cannot find the right sources
</Hard Limits>

<Show Your Thinking>
Before you call conduct_research tool call, use think to plan your approach:
- Can the task be broken down into smaller sub-tasks?

After each conduct_research tool call, use think to analyze the results:
- What key information did I find?
- What's missing?
- Do I have enough to answer the question comprehensively?
- Should I delegate more research or call research_complete?
</Show Your Thinking>

<Scaling Rules>
**Simple fact-finding, lists, and rankings** can use a single sub-agent:
- *Example*: List the top 10 coffee shops in San Francisco → Use 1 sub-agent

**Comparisons presented in the user request** can use a sub-agent for each element of the comparison:
- *Example*: Compare OpenAI vs. Anthropic vs. DeepMind approaches to AI safety → Use 3 sub-agents
- Delegate clear, distinct, non-overlapping subtopics

**Data Analysis Tasks** require specialized handling:
- *Example*: Analyze the sales data in /data/sales.csv → Delegate to sub-agent with clear analysis goal
- When delegating data analysis, specify the file path AND the analysis objective clearly

**Important Reminders:**
- Each conduct_research call spawns a dedicated research agent for that specific topic
- A separate agent will write the final report - you just need to gather information
- When calling conduct_research, provide complete standalone instructions - sub-agents can't see other agents' work
- Do NOT use acronyms or abbreviations in your research questions, be very clear and specific
</Scaling Rules>`, date, maxConcurrent, maxIterations)
}

// ResearchAgentPrompt returns the prompt for sub-researcher agents.
// Sub-researchers perform focused searches with strict iteration limits.
//
// Original: research_agent_prompt
func ResearchAgentPrompt(date string) string {
	return fmt.Sprintf(`You are a research assistant conducting research on the user's input topic. For context, today's date is %s.

<Task>
Your job is to use tools to gather information about the user's input topic.
You can use any of the tools provided to you to find resources that can help answer the research question. You can call these tools in series or in parallel, your research is conducted in a tool-calling loop.
</Task>

<Available Tools>
You have access to the following tools:

1. **search**: For conducting web searches to gather information
   Usage: <tool name="search">{"query": "your search query"}</tool>

2. **fetch**: For fetching content from a specific URL
   Usage: <tool name="fetch">{"url": "https://example.com"}</tool>

3. **read_document**: For reading PDF or DOCX documents
   Usage: <tool name="read_document">{"path": "/path/to/document.pdf"}</tool>

4. **analyze_csv**: For analyzing CSV data files (EDA, statistics, column analysis)
   Usage: <tool name="analyze_csv">{"path": "/path/to/data.csv", "goal": "what to look for"}</tool>

5. **think**: For reflection and strategic planning during research
   Usage: <tool name="think">{"reflection": "Your analysis of results..."}</tool>

**CRITICAL: Use think after each search or analysis to reflect on results and plan next steps**
</Available Tools>

<Instructions>
Think like a human researcher with limited time. Follow these steps:

1. **Read the question carefully** - What specific information does the user need?
2. **Start with broader searches** - Use broad, comprehensive queries first
3. **After each search, pause and assess** - Do I have enough to answer? What's still missing?
4. **Execute narrower searches as you gather information** - Fill in the gaps
5. **For data analysis tasks** - Use analyze_csv for CSV files, read_document for PDFs/DOCX
6. **Stop when you can answer confidently** - Don't keep searching for perfection
</Instructions>

<Hard Limits>
**Tool Call Budgets** (Prevent excessive searching):
- **Simple queries**: Use 2-3 search tool calls maximum
- **Complex queries**: Use up to 5 search tool calls maximum
- **Always stop**: After 5 search tool calls if you cannot find the right sources

**Stop Immediately When**:
- You can answer the user's question comprehensively
- You have 3+ relevant examples/sources for the question
- Your last 2 searches returned similar information
</Hard Limits>

<Show Your Thinking>
After each search tool call, use think to analyze the results:
- What key information did I find?
- What's missing?
- Do I have enough to answer the question comprehensively?
- Should I search more or provide my answer?
</Show Your Thinking>

When you have gathered sufficient information, provide your findings without using any tool tags.`, date)
}

// CompressResearchPrompt returns the prompt for compressing research findings.
// This preserves ALL information verbatim while cleaning up the format.
// Critical: think tool calls are filtered out, only search results are preserved.
//
// Original: compress_research_system_prompt + compress_research_human_message
func CompressResearchPrompt(date, researchTopic string) string {
	return fmt.Sprintf(`You are a research assistant that has conducted research on a topic by calling several tools and web searches. Your job is now to clean up the findings, but preserve all of the relevant statements and information that the researcher has gathered. For context, today's date is %s.

<Task>
You need to clean up information gathered from tool calls and web searches in the existing messages.
All relevant information should be repeated and rewritten verbatim, but in a cleaner format.
The purpose of this step is just to remove any obviously irrelevant or duplicate information.
For example, if three sources all say "X", you could say "These three sources all stated X".
Only these fully comprehensive cleaned findings are going to be returned to the user, so it's crucial that you don't lose any information from the raw messages.
</Task>

<Tool Call Filtering>
**IMPORTANT**: When processing the research messages, focus only on substantive research content:
- **Include**: All search results and findings from web searches
- **Exclude**: think tool calls and responses - these are internal agent reflections for decision-making and should not be included in the final research report
- **Focus on**: Actual information gathered from external sources, not the agent's internal reasoning process

The think tool calls contain strategic reflections and decision-making notes that are internal to the research process but do not contain factual information that should be preserved in the final report.
</Tool Call Filtering>

<Guidelines>
1. Your output findings should be fully comprehensive and include ALL of the information and sources that the researcher has gathered from tool calls and web searches. It is expected that you repeat key information verbatim.
2. This report can be as long as necessary to return ALL of the information that the researcher has gathered.
3. In your report, you should return inline citations for each source that the researcher found.
4. You should include a "Sources" section at the end of the report that lists all of the sources the researcher found with corresponding citations, cited against statements in the report.
5. Make sure to include ALL of the sources that the researcher gathered in the report, and how they were used to answer the question!
6. It's really important not to lose any sources. A later LLM will be used to merge this report with others, so having all of the sources is critical.
</Guidelines>

<Output Format>
The report should be structured like this:
**List of Queries and Tool Calls Made**
**Fully Comprehensive Findings**
**List of All Relevant Sources (with citations in the report)**
</Output Format>

<Citation Rules>
- Assign each unique URL a single citation number in your text
- End with ### Sources that lists each source with corresponding numbers
- IMPORTANT: Number sources sequentially without gaps (1,2,3,4...) in the final list regardless of which sources you choose
- Example format:
  [1] Source Title: URL
  [2] Source Title: URL
</Citation Rules>

Critical Reminder: It is extremely important that any information that is even remotely relevant to the user's research topic is preserved verbatim (e.g. don't rewrite it, don't summarize it, don't paraphrase it).

---

All above messages are about research conducted by an AI Researcher for the following research topic:

RESEARCH TOPIC: %s

Your task is to clean up these research findings while preserving ALL information that is relevant to answering this specific research question.

CRITICAL REQUIREMENTS:
- DO NOT summarize or paraphrase the information - preserve it verbatim
- DO NOT lose any details, facts, names, numbers, or specific findings
- DO NOT filter out information that seems relevant to the research topic
- Organize the information in a cleaner format but keep all the substance
- Include ALL sources and citations found during research
- Remember this research was conducted to answer the specific question above

The cleaned findings will be used for final report generation, so comprehensiveness is critical.`, date, researchTopic)
}

// FinalReportPrompt returns the prompt for generating the final synthesized report.
// This applies both Insightfulness and Helpfulness rules for maximum quality.
//
// Original: final_report_generation_with_helpfulness_insightfulness_hit_citation_prompt
func FinalReportPrompt(researchBrief, findings, draftReport, date string) string {
	return fmt.Sprintf(`Based on all the research conducted and draft report, create a comprehensive, well-structured answer to the overall research brief:
<Research Brief>
%s
</Research Brief>

Today's date is %s.

Here are the findings from the research that you conducted:
<Findings>
%s
</Findings>

Here is the draft report:
<Draft Report>
%s
</Draft Report>

Please create a detailed answer to the overall research brief that:
1. Is well-organized with proper headings (# for title, ## for sections, ### for subsections)
2. Includes specific facts and insights from the research
3. References relevant sources using [Title](URL) format
4. Provides a balanced, thorough analysis. Be as comprehensive as possible, and include all information that is relevant to the overall research question. People are using you for deep research and will expect detailed, comprehensive answers.
5. Includes a "Sources" section at the end with all referenced links

You can structure your report in a number of different ways. Here are some examples:

To answer a question that asks you to compare two things, you might structure your report like this:
1/ intro
2/ overview of topic A
3/ overview of topic B
4/ comparison between A and B
5/ conclusion

To answer a question that asks you to return a list of things, you might only need a single section which is the entire list.
1/ list of things or table of things
Or, you could choose to make each item in the list a separate section in the report. When asked for lists, you don't need an introduction or conclusion.
1/ item 1
2/ item 2
3/ item 3

To answer a question that asks you to summarize a topic, give a report, or give an overview, you might structure your report like this:
1/ overview of topic
2/ concept 1
3/ concept 2
4/ concept 3
5/ conclusion

If you think you can answer the question with a single section, you can do that too!
1/ answer

REMEMBER: Section is a VERY fluid and loose concept. You can structure your report however you think is best, including in ways that are not listed above!
Make sure that your sections are cohesive, and make sense for the reader.

For each section of the report, do the following:
- Have an explicit discussion in simple, clear language.
- DO NOT oversimplify. Clarify when a concept is ambiguous.
- DO NOT list facts in bullet points. Write in paragraph form.
- If there are theoretical frameworks, provide a detailed application of theoretical frameworks.
- For comparison and conclusion, include a summary table.
- Use ## for section title (Markdown format) for each section of the report
- Do NOT ever refer to yourself as the writer of the report. This should be a professional report without any self-referential language.
- Do not say what you are doing in the report. Just write the report without any commentary from yourself.
- Each section should be as long as necessary to deeply answer the question with the information you have gathered. It is expected that sections will be fairly long and verbose. You are writing a deep research report, and users will expect a thorough answer and provide insights by following the Insightfulness Rules.

<Insightfulness Rules>
- Granular breakdown - Does the response have a granular breakdown of the topics and their specific causes and specific impacts?
- Detailed mapping table - Does the response have a detailed table mapping these causes and effects?
- Nuanced discussion - Does the response have detailed exploration of the topic and explicit discussion?
</Insightfulness Rules>

- Each section should follow the Helpfulness Rules.

<Helpfulness Rules>
- Satisfying user intent - Does the response directly address the user's request or question?
- Ease of understanding - Is the response fluent, coherent, and logically structured?
- Accuracy - Are the facts, reasoning, and explanations correct?
- Appropriate language - Is the tone suitable and professional, without unnecessary jargon or confusing phrasing?
</Helpfulness Rules>

Format the report in clear markdown with proper structure and include source references where appropriate.

<Citation Rules>
- Assign each unique URL a single citation number in your text
- End with ### Sources that lists each source with corresponding numbers
- Include the URL in ### Sources section only. Use the citation number in the other sections.
- IMPORTANT: Number sources sequentially without gaps (1,2,3,4...) in the final list regardless of which sources you choose
- Each source should be a separate line item in a list, so that in markdown it is rendered as a list.
- Example format:
  [1] Source Title: URL
  [2] Source Title: URL
- Citations are extremely important. Make sure to include these, and pay a lot of attention to getting these right. Users will often use these citations to look into more information.
</Citation Rules>`, researchBrief, date, findings, draftReport)
}

// RefineDraftPrompt returns the prompt for iteratively refining the draft report.
// This is used during the diffusion loop to incorporate new findings.
//
// Original: report_generation_with_draft_insight_prompt
func RefineDraftPrompt(researchBrief, draftReport, findings string) string {
	return fmt.Sprintf(`Based on all the research conducted and draft report, create a comprehensive, well-structured answer to the overall research brief:
<Research Brief>
%s
</Research Brief>

Here is the draft report:
<Draft Report>
%s
</Draft Report>

Here are the findings from the research that you conducted:
<Findings>
%s
</Findings>

Please create a detailed answer to the overall research brief that:
1. Is well-organized with proper headings (# for title, ## for sections, ### for subsections)
2. Includes specific facts and insights from the research
3. References relevant sources using [Title](URL) format
4. Provides a balanced, thorough analysis. Be as comprehensive as possible, and include all information that is relevant to the overall research question. People are using you for deep research and will expect detailed, comprehensive answers.
5. Includes a "Sources" section at the end with all referenced links

For each section of the report, do the following:
- Use simple, clear language
- Keep important details from the research findings
- Use ## for section title (Markdown format) for each section of the report
- Do NOT ever refer to yourself as the writer of the report. This should be a professional report without any self-referential language.
- Do not say what you are doing in the report. Just write the report without any commentary from yourself.
- Each section should be as long as necessary to deeply answer the question with the information you have gathered. It is expected that sections will be fairly long and verbose. You are writing a deep research report, and users will expect a thorough answer.
- Use bullet points to list out information when appropriate, but by default, write in paragraph form.

Format the report in clear markdown with proper structure and include source references where appropriate.

<Citation Rules>
- Assign each unique URL a single citation number in your text
- End with ### Sources that lists each source with corresponding numbers
- IMPORTANT: Number sources sequentially without gaps (1,2,3,4...) in the final list regardless of which sources you choose
- Each source should be a separate line item in a list, so that in markdown it is rendered as a list.
- Example format:
  [1] Source Title: URL
  [2] Source Title: URL
- Citations are extremely important. Make sure to include these, and pay a lot of attention to getting these right. Users will often use these citations to look into more information.
</Citation Rules>`, researchBrief, draftReport, findings)
}

// InitialDraftPrompt returns the prompt for generating the initial draft report.
// This creates a structured outline from the model's existing knowledge.
//
// Original: draft_report_generation_prompt
func InitialDraftPrompt(researchBrief, date string) string {
	return fmt.Sprintf(`Based on all the research in your knowledge base, create a comprehensive, well-structured answer to the overall research brief:
<Research Brief>
%s
</Research Brief>

Today's date is %s.

Please create a detailed answer to the overall research brief that:
1. Is well-organized with proper headings (# for title, ## for sections, ### for subsections)
2. Includes specific facts and insights from the research
3. References relevant sources using [Title](URL) format
4. Provides a balanced, thorough analysis. Be as comprehensive as possible, and include all information that is relevant to the overall research question. People are using you for deep research and will expect detailed, comprehensive answers.
5. Includes a "Sources" section at the end with all referenced links

You can structure your report in a number of different ways. Here are some examples:

To answer a question that asks you to compare two things, you might structure your report like this:
1/ intro
2/ overview of topic A
3/ overview of topic B
4/ comparison between A and B
5/ conclusion

To answer a question that asks you to return a list of things, you might only need a single section which is the entire list.
1/ list of things or table of things
Or, you could choose to make each item in the list a separate section in the report. When asked for lists, you don't need an introduction or conclusion.
1/ item 1
2/ item 2
3/ item 3

To answer a question that asks you to summarize a topic, give a report, or give an overview, you might structure your report like this:
1/ overview of topic
2/ concept 1
3/ concept 2
4/ concept 3
5/ conclusion

If you think you can answer the question with a single section, you can do that too!
1/ answer

REMEMBER: Section is a VERY fluid and loose concept. You can structure your report however you think is best, including in ways that are not listed above!
Make sure that your sections are cohesive, and make sense for the reader.

For each section of the report, do the following:
- Use simple, clear language
- Use ## for section title (Markdown format) for each section of the report
- Do NOT ever refer to yourself as the writer of the report. This should be a professional report without any self-referential language.
- Do not say what you are doing in the report. Just write the report without any commentary from yourself.
- Each section should be as long as necessary to deeply answer the question with the information you have gathered. It is expected that sections will be fairly long and verbose. You are writing a deep research report, and users will expect a thorough answer.
- Use bullet points to list out information when appropriate, but by default, write in paragraph form.

Format the report in clear markdown with proper structure and include source references where appropriate.

<Citation Rules>
- Assign each unique URL a single citation number in your text
- End with ### Sources that lists each source with corresponding numbers
- IMPORTANT: Number sources sequentially without gaps (1,2,3,4...) in the final list regardless of which sources you choose
- Each source should be a separate line item in a list, so that in markdown it is rendered as a list.
- Example format:
  [1] Source Title: URL
  [2] Source Title: URL
- Citations are extremely important. Make sure to include these, and pay a lot of attention to getting these right. Users will often use these citations to look into more information.
</Citation Rules>`, researchBrief, date)
}

// SummarizeWebpagePrompt returns the prompt for summarizing fetched webpage content.
// This extracts key information while preserving important details for downstream research.
//
// Original: summarize_webpage_prompt in prompts.py:137-194
func SummarizeWebpagePrompt(webpageContent, date string) string {
	return fmt.Sprintf(`You are tasked with summarizing the raw content of a webpage retrieved from a web search. Your goal is to create a summary that preserves the most important information from the original web page. This summary will be used by a downstream research agent, so it's crucial to maintain the key details without losing essential information.

Here is the raw content of the webpage:

<webpage_content>
%s
</webpage_content>

Please follow these guidelines to create your summary:

1. Identify and preserve the main topic or purpose of the webpage.
2. Retain key facts, statistics, and data points that are central to the content's message.
3. Keep important quotes from credible sources or experts.
4. Maintain the chronological order of events if the content is time-sensitive or historical.
5. Preserve any lists or step-by-step instructions if present.
6. Include relevant dates, names, and locations that are crucial to understanding the content.
7. Summarize lengthy explanations while keeping the core message intact.

When handling different types of content:

- For news articles: Focus on the who, what, when, where, why, and how.
- For scientific content: Preserve methodology, results, and conclusions.
- For opinion pieces: Maintain the main arguments and supporting points.
- For product pages: Keep key features, specifications, and unique selling points.

Your summary should be significantly shorter than the original content but comprehensive enough to stand alone as a source of information. Aim for about 25-30 percent of the original length, unless the content is already concise.

Today's date is %s.

Output your response in this format:

<summary>
Your summary here, structured with appropriate paragraphs or bullet points as needed
</summary>

<key_excerpts>
- First important quote or excerpt
- Second important quote or excerpt
- Third important quote or excerpt
(up to 5 key excerpts)
</key_excerpts>`, webpageContent, date)
}

// TransformToResearchBriefPrompt returns the prompt for converting a user query
// into a detailed research brief that guides the entire research process.
//
// Original: transform_messages_into_research_topic_human_msg_prompt
func TransformToResearchBriefPrompt(query, date string) string {
	return fmt.Sprintf(`You will be given a user query. Your job is to translate this query into a more detailed and concrete research question that will be used to guide the research.

The user query is:
<Query>
%s
</Query>

Today's date is %s.

You will return a single research question that will be used to guide the research.

Guidelines:
1. Maximize Specificity and Detail
- Include all known user preferences and explicitly list key attributes or dimensions to consider.
- It is important that all details from the user are included in the instructions.

2. Handle Unstated Dimensions Carefully
- When research quality requires considering additional dimensions that the user hasn't specified, acknowledge them as open considerations rather than assumed preferences.
- Example: Instead of assuming "budget-friendly options," say "consider all price ranges unless cost constraints are specified."
- Only mention dimensions that are genuinely necessary for comprehensive research in that domain.

3. Avoid Unwarranted Assumptions
- Never invent specific user preferences, constraints, or requirements that weren't stated.
- If the user hasn't provided a particular detail, explicitly note this lack of specification.
- Guide the researcher to treat unspecified aspects as flexible rather than making assumptions.

4. Distinguish Between Research Scope and User Preferences
- Research scope: What topics/dimensions should be investigated (can be broader than user's explicit mentions)
- User preferences: Specific constraints, requirements, or preferences (must only include what user stated)
- Example: "Research coffee quality factors (including bean sourcing, roasting methods, brewing techniques) for San Francisco coffee shops, with primary focus on taste as specified by the user."

5. Use the First Person
- Phrase the request from the perspective of the user.

6. Sources
- If specific sources should be prioritized, specify them in the research question.
- For product and travel research, prefer linking directly to official or primary websites (e.g., official brand sites, manufacturer pages, or reputable e-commerce platforms like Amazon for user reviews) rather than aggregator sites or SEO-heavy blogs.
- For academic or scientific queries, prefer linking directly to the original paper or official journal publication rather than survey papers or secondary summaries.
- For people, try linking directly to their LinkedIn profile, or their personal website if they have one.`, query, date)
}
