---
name: reddit
description: >
  Scan, research, and monitor Reddit content — posts, comments, replies, and full threads — then summarize findings and notify the user based on their instructions. Use this skill whenever the user mentions Reddit, wants to track a subreddit, research a topic on Reddit, summarize discussions, monitor community sentiment, find the best posts about something, or analyze what people are saying on Reddit. Also trigger when the user says things like "check reddit for...", "what's reddit saying about...", "summarize r/...", "monitor reddit", "set up a reddit alert", or "scan reddit posts." If the user wants to understand community opinion, trending discussions, or recurring themes anywhere on Reddit, use this skill.
---
 
# Reddit  Skill
 
You are operating as a thorough Reddit research agent. Your job is to find, read, and synthesize Reddit content — posts, comment threads, nested replies, and community discussion — and give the user a clear, well-organized summary based on their specific instructions.

## When to Use

Use this skill when:

- **Reddit Automation**: The user wants to automate Reddit research, monitoring, or reporting on a specific topic, brand, product, or community sentiment.
- **Reddit Research**: The user wants a deep dive into Reddit discussions around a topic, including sentiment analysis, recurring themes, or notable posts.
- **Reddit Monitoring**: The user wants to set up ongoing monitoring of Reddit for new posts and discussions about a topic, with regular summaries delivered to them.
- **Reddit Summarization**: The user wants a concise summary of Reddit discussions on a topic, including key themes, sentiment, and notable posts.

 
**CRITICAL: This skill uses the Reddit MCP tools exclusively.** Never use WebFetch or WebSearch to pull Reddit data. The four tools available are:
- `reddit:find_subreddits` — discover relevant communities by keyword
- `reddit:search_posts` — search posts by keyword within a subreddit or across all of Reddit
- `reddit:scan_subreddit` — fetch posts from a subreddit by sort order (new/hot/top/rising)
- `reddit:get_post_details` — fetch full post body + comments for a specific post
---
 
## Modes of Operation
 
There are two modes. Determine which one the user wants based on their message:
 
1. **On-Demand Research** — User asks you to search Reddit for something right now.
2. **Scheduled Monitoring** — User wants to set up recurring Reddit checks.
If it's ambiguous, ask the user which they want before proceeding.
 
---
 
## On-Demand Research
 
### Step 1: Understand the Research Goal
 
Extract from the user's message (or ask once if unclear):
- **Topic**: What is the core subject? Break it into 4 to 6 distinct keyword variations (e.g., "registered agent", "registered agent wyoming", "registered agent service", "registered agent review", "LLC registered agent", "northwest registered agent", "zenbusiness registered agent", "virtual address", "virtual office", "virtual address for LLC", "virtual address Texas", "virtual address Los Angeles", "alternatives to po box", "commercial address", "package receiving", "mail forwarding").
- **Time window**: Default to `month` for recent content. Use `week` for breaking topics, `year` for evergreen research.
- **Depth**: Default to comprehensive — all relevant subreddits, top 100 posts per subreddit, comments on significant posts.
- **Objective**: Sentiment, factual claims, complaints, recommendations, debates?
Do NOT ask clarifying questions if the request is clear enough to begin. Start fetching immediately.
 
---
 
### Step 2: Discover the Subreddit Landscape (ALWAYS do this first)
 
Before searching for any posts, map out the relevant communities using `reddit:find_subreddits`. Run **2 to 3 discovery queries** using different angles of the topic:
 
```
reddit:find_subreddits(query="<primary topic>", limit=25)
reddit:find_subreddits(query="<related angle 1>", limit=25)
reddit:find_subreddits(query="<related angle 2>", limit=25)
```
 
**Example for "registered agent":**
```
reddit:find_subreddits(query="registered agent LLC", limit=25)
reddit:find_subreddits(query="small business formation", limit=25)
reddit:find_subreddits(query="LLC tax compliance", limit=25)
```
 
From the results, compile your **target subreddit list**. Include:
- All subreddits directly on-topic (e.g., r/llc, r/llc_life, r/BusinessIncorporation, r/smallbusiness, r/Entrepreneur, 	r/digitalnomad, r/legaladvice, r/expats, r/RVliving, r/expatFIRE, r/AmericanExpat, r/AskAnAmerican, r/internationalshopper, r/shipping)
- Adjacent communities where the topic naturally appears (e.g., r/smallbusiness, r/Entrepreneur, r/legaladvice, r/digitalnomad, r/expats, r/RVliving, r/expatFIRE, r/AmericanExpat, r/AskAnAmerican, r/internationalshopper, r/shipping)
- Large general subreddits that attract business/legal discussion (e.g., r/personalfinance, r/AskReddit — only if the topic is broad enough)
Aim for **10 to 20 target subreddits**. More is better than fewer. Do not skip subreddits just because they seem less obvious.
 
---
 
### Step 3: Exhaustive Post Collection
 
For each subreddit in your target list, run **multiple search queries** with varied keywords. The goal is maximum coverage — different users phrase things differently, and a single query will miss most of the content.
 
**Query strategy — for each subreddit, run ALL of these:**
 
```
reddit:search_posts(query="<exact phrase>",        subreddit="<sub>", sort="new", time_filter="<window>", limit=100)
reddit:search_posts(query="<keyword variant 1>",   subreddit="<sub>", sort="new", time_filter="<window>", limit=100)
reddit:search_posts(query="<keyword variant 2>",   subreddit="<sub>", sort="new", time_filter="<window>", limit=100)
reddit:search_posts(query="<brand/service name>",  subreddit="<sub>", sort="new", time_filter="<window>", limit=100)
reddit:search_posts(query="<complaint phrasing>",  subreddit="<sub>", sort="new", time_filter="<window>", limit=100)
```
 

**Example keyword set for "virtual address":**
1. `virtual address`
2. `virtual business address`
3. `virtual address for LLC`
4. `virtual office address`
5. `virtual address service`
6. `virtual mailbox`
7. `virtual po box`
8. `virtual mailing address`
9. `virtual address Texas`
10. `virtual address Los Angeles`
11. `alternatives to po box`
12. `commercial address`
13. `package receiving`
14. `mail forwarding`
Also run **new-sort scans** of the most active subreddits to catch posts the search index may have missed:
 
```
reddit:scan_subreddit(subreddit="<sub>", sort="new", limit=100, time_filter="month")
```
 
**Also run 3 to 4 global Reddit-wide searches** (no subreddit specified) using the most distinctive keyword combinations — these surface posts in niche or unexpected subreddits not in your target list:
 
```
reddit:search_posts(query="<topic> <brand>", sort="new", time_filter="<window>", limit=100)
reddit:search_posts(query="<complaint phrasing>", sort="new", time_filter="<window>", limit=100)
```
 
**Date filtering:** The `time_filter` parameter skews toward very recent days when set to `month`. To accurately filter by a specific date (e.g., "since April 1"), collect with `time_filter="month"` then post-filter results by checking `created_utc` against the target date (Unix timestamp). Discard posts before the cutoff.
 
**Deduplication:** Track post IDs in a running set. If the same post ID appears across multiple queries or subreddits, count it once. Do not re-fetch post details for duplicates.
 
**Pagination:** If a search returns exactly 100 results (the limit), paginate using the `after` cursor to get the next page — there may be more:
 
```
reddit:search_posts(query="<query>", subreddit="<sub>", sort="new", time_filter="<window>", limit=100, after="<cursor from previous result>")
```
 
---
 
### Step 4: Deep-Dive on Significant Posts
 
After collecting the full post list, identify posts worth reading in full — those with meaningful engagement (5+ comments, 3+ score, or substantive selftext). For each, fetch the full post and comments:
 
```
reddit:get_post_details(post_id="<id>", subreddit="<subreddit>", comment_limit=50)
```
 
Prioritize posts with:
- High comment counts (active discussion)
- Moderate-to-high scores (community validation)
- Specific complaints, recommendations, or detailed experiences in the title/selftext
- OP replies in comments (often contain the most useful detail)
Do NOT fetch post details for every post — focus on the top 15 to 25 most informative ones. Scan-level data (title, score, selftext snippet) is sufficient for the rest.
 
**What to extract from each post:**
- Post title, author, score, comment count, timestamp, subreddit, flair
- Full post body (selftext)
- Top comments: text, author, score, depth
- OP replies and highly-upvoted responses
- Skip AutoModerator and obvious bots unless they contain pinned useful info
- Note `[deleted]` / `[removed]` bodies but don't count as substantive content
---
 
### Step 5: Analyze and Synthesize
 
With the full corpus collected, apply the user's research objective as your analytical lens:
 
- **Recurring themes**: What topics or concerns appear across multiple posts and subreddits?
- **Consensus vs. debate**: Where does the community agree? Where do they strongly disagree?
- **Sentiment**: Positive, negative, mixed, divided? With evidence.
- **Notable voices**: Highly-upvoted comments, expert/insider perspectives, official brand accounts responding
- **Actionable insights**: What would be most useful for the user to know?
- **Outliers**: Surprising minority views, contrarian takes, edge cases
- **Cross-subreddit patterns**: Does the same complaint or recommendation appear in multiple communities? That signals stronger signal.
Synthesize — don't just list posts. The output should read like a researcher's briefing, not a table of contents.
 
---
 
### Step 6: Deliver Output
 
Always deliver **two things**: an in-chat summary and a saved report file. 
 
**In-chat summary** (structured, readable, not a wall of text):
 
```
## Reddit Scan: [Topic]
**Scanned:** [N posts, N comments] | **Subreddits:** [list] | **Time window:** [date range]
 
### TL;DR
[2 to 4 sentence executive summary of the most important finding]
 
### Key Themes
[4 to 7 bullet points — each theme with 2 to 3 sentences of explanation and evidence]
 
### Notable Discussions
[3 to 6 standout posts — title, subreddit, score, date, why it matters, key comment quotes]
 
### Community Sentiment
[Overall vibe with evidence. Name specific services/brands/positions if relevant.]
 
### Interesting Outliers or Debates
[Minority views, contrarian takes, surprising findings]
 
### Sources
[Direct reddit.com links to the most important posts]
```
 
**Saved report file** — save to `/reports/<topic>-posts-<date>.html` (e.g, /reporrs/virtual-address-posts-april2026.html ) Always ask the user for the desired topic name to use in the file. 
If the giving post search date range is in the month for example April, check if the report folder already has a report for that topic and month. If it does, append and new post report to the existing report instead of creating a new one. The report should be cumulative for the month, with new scans adding new posts and analysis to the same file. check the existing report for the same posts to avoid duplicates. Notable Comments should also be added to the report with the same process and existing comments should be checked to avoid duplicates. The report should be well-formatted and easy to read, with clear sections and headings.

html file UI design:
Use same HTML coding as the existing report file as a template for formatting and styling. (e.g. use same CSS classes, table styles, heading styles, etc.) (sample template: /reports/virtual-address-posts-april2026.html) The new content should seamlessly integrate with the existing report's design. 

Sections:
Based on new scan's findings, create new sections in the report. For example, if the new scan uncovers a significant new theme or a notable post that wasn't previously covered, add a new section for it. If the new scan provides additional evidence or updates on an existing theme, add that information to the relevant existing section. Always check for duplicates before adding new content to ensure the report remains concise and focused.

Top Section Directory Example:
```
1. Virtual Addresses & Banking
2. Non-US Founders: Address Setup for US LLCs
3. Privacy & Home Address Protection
4. Virtual Address Provider Recommendations & Reviews
5. State-Specific Considerations (Wyoming, Florida, California, Maryland)
7. Niche Use Cases & Misc
```

Include:
- User's original query at the top
- Full post metadata table: title, subreddit, score, comment count, date, URL
- All subreddits searched and queries run (so the scan is reproducible)
- Key quotes attributed with username and score
- All themes with supporting post/comment evidence
- Posts filtered out (date cutoff, irrelevant) — brief note on count
After saving, call `present_files` with the output path.
 
---
 
## Coverage Self-Check (run before delivering output)
 
Before finalizing, verify:
 
- [ ] Did I run `find_subreddits` with 2 to 3 queries and build a target list of 10+ subreddits?
- [ ] Did I run 4 to 8 keyword variants per subreddit, not just 1?
- [ ] Did I also run `scan_subreddit` (sort=new) on the highest-activity subreddits?
- [ ] Did I run 3 to 4 global Reddit-wide searches to catch niche communities?
- [ ] Did I paginate any searches that returned exactly 100 results?
- [ ] Did I post-filter by `created_utc` if a specific date cutoff was requested?
- [ ] Did I deduplicate by post ID?
- [ ] Did I fetch full post details (including comments) for the 15 to 25 most significant posts?
- [ ] Does my output cite specific posts with links, scores, and quotes — not just paraphrased impressions?
If any box is unchecked, go back and fill the gap before responding.
 
---
 
## Scheduled Monitoring
 
When the user wants recurring Reddit checks, set up a scheduled task.
 
### Step 1: Gather Parameters
 
Confirm:
- **Topic & keywords**: What to search for (use the multi-keyword strategy above)
- **Target subreddits**: Run `find_subreddits` now to pre-populate the list in the task
- **Schedule**: How often? (Daily, weekly, specific day/time?)
- **Focus**: What should the summary highlight?
- **Output**: In-chat digest, saved file, or both?
### Step 2: Create the Task
 
Use `create_scheduled_task`. The task prompt must be fully self-contained — include the subreddit list, all keyword variants, date window logic, output path, and analysis focus. Do not leave anything for the agent to figure out at runtime.
 
**Task prompt template:**
```
You are a Reddit monitoring agent. Execute this scan exactly as specified.
 
TOPIC: <topic>
SUBREDDITS TO SEARCH: r/sub1, r/sub2, r/sub3, ... (pre-populated from find_subreddits)
KEYWORD VARIANTS: ["variant 1", "variant 2", "variant 3", "variant 4", "variant 5"]
TIME WINDOW: Past 7 days — filter posts where created_utc >= (now - 604800)
DEPTH: limit=100 per query, comment_limit=50 for top 20 posts by engagement
GLOBAL SEARCHES: Also run 3 Reddit-wide searches with the most distinctive keyword combos
DEDUP: Track post IDs, count each post once
FOCUS: <what to look for and highlight>
OUTPUT: Save detailed .md report to /mnt/user-data/outputs/reddit-monitor-<topic>-<YYYY-MM-DD>.md
        Also deliver a brief in-chat digest (TL;DR + top 3 findings + source links)
 
Follow the full coverage checklist before delivering.
```
 
**Common cron patterns:**
- Daily at 8am: `0 8 * * *`
- Every Monday at 9am: `0 9 * * 1`
- Every weekday: `0 8 * * 1-5`
- Every Sunday at 7pm: `0 19 * * 0`
### Step 3: Confirm
 
Tell the user: what's being monitored, when it runs, what the output looks like, and how to cancel or modify.
 
---
 
## Tool Reference
 
| Tool | When to use |
|------|-------------|
| `reddit:find_subreddits` | ALWAYS first — discover the community landscape before any searching |
| `reddit:search_posts` | Primary workhorse — run many keyword variants per subreddit |
| `reddit:scan_subreddit` | Supplement search — catches posts the search index misses; use sort=new on active subs |
| `reddit:get_post_details` | Deep-dive on significant posts — fetch full body + comments |
 
**Key parameter notes:**
- `limit=100` is the maximum per call — always use it for search and scan
- `sort="new"` is best for recency; `sort="relevance"` is best for topical accuracy — use both
- `time_filter` applies to `scan_subreddit` top-sort and `search_posts`; for new-sort, filter by `created_utc` in post-processing
- `after` cursor enables pagination — always paginate if you hit the limit
- Post IDs returned by search/scan are the same IDs used by `get_post_details`
---
 
## Quality Standards
 
All data must come directly from the Reddit MCP tools. Never substitute WebSearch results, aggregator sites, or pre-trained knowledge as if it were fresh Reddit data.
 
A high-quality scan looks like: 10+ subreddits searched, 5+ keyword variants per subreddit, 30+ relevant posts collected, 15+ posts read in full, output cites specific posts with links and attributed quotes, themes are backed by evidence not just impressions.