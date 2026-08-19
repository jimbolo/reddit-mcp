import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { existsSync, readFileSync } from "node:fs";
import { OAuthProvider, PublicJsonProvider } from "./reddit/client.js";
import { RedditMcpError } from "./core/errors.js";

import { ScanSubredditSchema, handleScanSubreddit } from "./tools/scanSubreddit.js";
import { SearchPostsSchema, handleSearchPosts } from "./tools/searchPosts.js";
import { GetPostDetailsSchema, handleGetPostDetails } from "./tools/getPostDetails.js";
import { FindSubredditsSchema, handleFindSubreddits } from "./tools/findSubreddits.js";
import { GetSubredditInfoSchema, handleGetSubredditInfo } from "./tools/getSubredditInfo.js";

function loadDotEnv() {
  if (!existsSync(".env")) return;

  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}

loadDotEnv();

const provider = process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET
  ? new OAuthProvider({
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      userAgent: process.env.REDDIT_USER_AGENT ?? "script:reddit-mcp:v1.0 (by /u/unknown)",
    })
  : new PublicJsonProvider();

const server = new McpServer({
  name: "reddit-mcp",
  version: "1.0.0",
});

// --- Tool: scan_subreddit ---
server.tool(
  "scan_subreddit",
  "Fetch posts from a subreddit by sort order (hot, top, new, rising). " +
    "Supports pagination, time filters, and optional comment inclusion.",
  ScanSubredditSchema,
  async (args) => {
    try {
      return await handleScanSubreddit(provider, args);
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// --- Tool: search_posts ---
server.tool(
  "search_posts",
  "Search Reddit posts by keyword across one subreddit or all of Reddit. " +
    "Supports sorting by relevance, hot, top, new and time filtering.",
  SearchPostsSchema,
  async (args) => {
    try {
      return await handleSearchPosts(provider, args);
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// --- Tool: get_post_details ---
server.tool(
  "get_post_details",
  "Get full details of a specific Reddit post including its comments. " +
    "Use this after scanning/searching to dive deeper into a post.",
  GetPostDetailsSchema,
  async (args) => {
    try {
      return await handleGetPostDetails(provider, args);
    } catch (e) {
      return errorResponse(e);
    }
  },
);

function errorResponse(e: unknown) {
  const message =
    e instanceof RedditMcpError
      ? `[${e.code}] ${e.message}`
      : e instanceof Error
        ? e.message
        : String(e);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

// --- Tool: find_subreddits ---
server.tool(
  "find_subreddits",
  "Search for subreddits by topic keyword. Use this to discover relevant communities " +
    "before scanning or searching posts. Returns subreddit name, description, subscriber count, and activity.",
  FindSubredditsSchema,
  async (args) => {
    try {
      return await handleFindSubreddits(provider, args);
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// --- Tool: get_subreddit_info ---
server.tool(
  "get_subreddit_info",
  "Get detailed metadata about a specific subreddit: description, subscriber count, " +
    "active users, creation date, and NSFW status. Use this to evaluate if a subreddit is worth scanning.",
  GetSubredditInfoSchema,
  async (args) => {
    try {
      return await handleGetSubredditInfo(provider, args);
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// Start
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Reddit MCP server running on stdio");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
