# Reddit MCP Server v3

MCP server that lets Claude (and other MCP clients) scan, search, and read Reddit posts and comments.

## Tools

| Tool | Description |
| ------ | ------------- |
| `scan_subreddit` | Fetch posts from a subreddit by sort order (hot/top/new/rising) with optional comments |
| `search_posts` | Search Reddit posts by keyword across one or all subreddits |
| `get_post_details` | Get full details and comments for a specific post |
| `find_subreddits` | Find subreddits by topic keyword |
| `get_subreddit_info` | Get metadata for a subreddit |

## Setup

```bash
npm install
npm run build
```

Requires Node.js 18 or newer.

The server uses Reddit's public JSON endpoints by default. Public requests include retry handling, exponential backoff, and a short-lived URL cache. Reddit blocks anonymous Data API traffic from many hosted networks, so OAuth credentials are recommended for reliable server-side access.

Copy the committed `env.txt` template to `.env`, then fill in the Reddit app credentials:

```bash
cp env.txt .env
```

On Windows PowerShell, use `Copy-Item env.txt .env`. The `.env` file is gitignored and is loaded automatically when the server starts.

```dotenv
REDDIT_CLIENT_ID=your-client-id
REDDIT_CLIENT_SECRET=your-client-secret
REDDIT_USER_AGENT=script:reddit-mcp:v1.0 (by /u/your_reddit_username)
```

When both `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` are present, the server automatically uses the OAuth provider with cached access tokens. Otherwise it falls back to the public JSON provider.

## Claude Desktop Configuration

Add to your Claude Desktop config (`~/.config/Claude/claude_desktop_config.json` on macOS/Linux, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "reddit": {
      "command": "node",
      "args": ["/absolute/path/to/reddit-mcp/dist/server.js"]
    }
  }
}
```

Replace the example path with the path where you cloned this repository.

## VS Code MCP Configuration

Add to your VS Code settings (`.vscode/mcp.json`):

```json
{
  "servers": {
    "reddit": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/server.js"]
    }
  }
}
```

When configuring this outside the repository workspace, replace `${workspaceFolder}` with the absolute path to the cloned repository.

## Usage Examples

Once connected, Claude can use these tools:

- **Scan a subreddit:** "Show me the top 20 posts from r/programming this week"
- **Search posts:** "Search Reddit for 'MCP server tutorial'"
- **Get post details:** "Get the comments on that first post"

## Architecture

- `src/server.ts` — MCP server entry, tool registration, stdio transport
- `src/tools/` — Individual tool handlers with input validation
- `src/reddit/client.ts` — `RedditProvider` interface and provider exports
- `src/reddit/providers/publicJson.ts` — Anonymous JSON provider with retries, backoff, caching, and comment deduplication
- `src/reddit/providers/oauth.ts` — OAuth provider with cached access tokens
- `src/core/types.ts` — Stable result types shared by all tools and providers
- `src/core/validation.ts` — Zod input schemas and sort/time-filter validation
- `src/core/errors.ts` — Shared error taxonomy and HTTP error mapping
- `env.txt` — Committed template for local OAuth configuration; copy it to `.env`

Both providers implement the same `RedditProvider` interface, so the tool layer does not depend on Reddit's transport or authentication method.
