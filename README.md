# Reddit MCP Server

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

The server uses Reddit's public JSON endpoints when anonymous requests are permitted. Reddit now blocks anonymous Data API traffic from many hosted networks. For reliable server-side access, register a Reddit app and add the OAuth application credentials to the local, gitignored `.env` file before starting the server:

```dotenv
REDDIT_CLIENT_ID=your-client-id
REDDIT_CLIENT_SECRET=your-client-secret
REDDIT_USER_AGENT=script:reddit-mcp:v1.0 (by /u/your_reddit_username)
```

When both `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` are present, the server automatically uses the OAuth provider. The `.env` file is ignored by Git and is not committed.

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
- `src/reddit/` — Reddit data client with provider abstraction
- `src/reddit/providers/publicJson.ts` — Public JSON endpoint provider (MVP)
- `src/core/` — Shared types, validation, and error taxonomy
- `src/tests/` — Unit tests for caching and comment deduplication

The provider interface (`RedditProvider`) makes it easy to swap to Reddit OAuth API later without changing any tool code.
