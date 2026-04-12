import type { RedditProvider } from "../client.js";
import type { SortOption, TimeFilter } from "../../core/validation.js";
import type { RedditPost, RedditComment, ScanResult, SearchResult, PostDetails, SubredditInfo, SubredditSearchResult } from "../../core/types.js";
import { mapHttpError, RedditMcpError, ErrorCode } from "../../core/errors.js";

const USER_AGENT = "RedditMCP/1.0 (MCP server; +https://github.com/reddit-mcp)";
const BASE = "https://www.reddit.com";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// URL-level TTL cache to prevent duplicate Reddit fetches
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 120_000; // 2 minutes

/** Clear the URL cache (used in tests) */
export function clearCache() {
  cache.clear();
}

async function fetchWithRetry(url: string): Promise<unknown> {
  // Check cache first
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (res.ok) {
        const data = await res.json();
        cache.set(url, { data, ts: Date.now() });
        return data;
      }
      const err = mapHttpError(res.status, url);
      if (!err.retryable) throw err;
      lastError = err;
    } catch (e) {
      if (e instanceof RedditMcpError && !e.retryable) throw e;
      lastError = e instanceof Error ? e : new Error(String(e));
    }
    // exponential backoff before retry
    const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw lastError ?? new RedditMcpError(ErrorCode.NETWORK_ERROR, "Request failed after retries");
}

function mapPost(raw: any): RedditPost {
  const d = raw.data;
  return {
    id: d.id,
    title: d.title,
    author: d.author,
    subreddit: d.subreddit,
    score: d.score,
    upvote_ratio: d.upvote_ratio ?? 0,
    num_comments: d.num_comments,
    created_utc: d.created_utc,
    url: d.url,
    permalink: `https://reddit.com${d.permalink}`,
    selftext: d.selftext ?? "",
    is_self: d.is_self ?? false,
    link_flair_text: d.link_flair_text ?? null,
    over_18: d.over_18 ?? false,
  };
}

function mapComment(raw: any, depth: number): RedditComment | null {
  if (!raw || raw.kind !== "t1") return null;
  const d = raw.data;
  return {
    id: d.id,
    author: d.author ?? "[deleted]",
    body: d.body ?? "",
    score: d.score ?? 0,
    created_utc: d.created_utc ?? 0,
    depth,
  };
}

function mapSubreddit(raw: any): SubredditInfo {
  const d = raw.data ?? raw;
  return {
    name: d.display_name ?? "",
    title: d.title ?? "",
    description: (d.public_description ?? d.description ?? "").slice(0, 500),
    subscribers: d.subscribers ?? 0,
    active_users: d.accounts_active ?? d.active_user_count ?? 0,
    created_utc: d.created_utc ?? 0,
    over_18: d.over18 ?? false,
    url: `https://reddit.com/r/${d.display_name ?? ""}`,
  };
}

function flattenComments(node: any, depth = 0, out: RedditComment[] = [], limit = 50, seen = new Set<string>()): RedditComment[] {
  if (out.length >= limit) return out;
  if (!node) return out;

  // listing container
  if (node.kind === "Listing" && node.data?.children) {
    for (const child of node.data.children) {
      if (out.length >= limit) break;
      flattenComments(child, depth, out, limit, seen);
    }
    return out;
  }

  const comment = mapComment(node, depth);
  if (comment && !seen.has(comment.id)) {
    seen.add(comment.id);
    out.push(comment);
    // recurse into replies
    if (node.data?.replies && typeof node.data.replies === "object") {
      flattenComments(node.data.replies, depth + 1, out, limit, seen);
    }
  }
  return out;
}

export class PublicJsonProvider implements RedditProvider {
  async fetchListing(
    subreddit: string,
    sort: SortOption,
    limit: number,
    timeFilter: TimeFilter,
    after?: string,
  ): Promise<ScanResult> {
    let url = `${BASE}/r/${encodeURIComponent(subreddit)}/${sort}.json?limit=${limit}&t=${timeFilter}&raw_json=1`;
    if (after) url += `&after=${encodeURIComponent(after)}`;

    const data = (await fetchWithRetry(url)) as any;
    const posts = (data.data?.children ?? []).map(mapPost);
    return {
      subreddit,
      sort,
      posts,
      after: data.data?.after ?? null,
    };
  }

  async search(
    query: string,
    subreddit: string,
    sort: string,
    timeFilter: TimeFilter,
    limit: number,
    after?: string,
  ): Promise<SearchResult> {
    const sub = subreddit === "all" ? "" : `/r/${encodeURIComponent(subreddit)}`;
    let url = `${BASE}${sub}/search.json?q=${encodeURIComponent(query)}&sort=${sort}&t=${timeFilter}&limit=${limit}&restrict_sr=${subreddit !== "all" ? 1 : 0}&raw_json=1`;
    if (after) url += `&after=${encodeURIComponent(after)}`;

    const data = (await fetchWithRetry(url)) as any;
    const posts = (data.data?.children ?? []).map(mapPost);
    return {
      query,
      subreddit,
      posts,
      after: data.data?.after ?? null,
    };
  }

  async fetchPostDetails(
    subreddit: string,
    postId: string,
    commentLimit: number,
  ): Promise<PostDetails> {
    const cleanId = postId.replace(/^t3_/, "");
    const url = `${BASE}/r/${encodeURIComponent(subreddit)}/comments/${encodeURIComponent(cleanId)}.json?limit=${commentLimit}&raw_json=1`;

    const data = (await fetchWithRetry(url)) as any;
    if (!Array.isArray(data) || data.length < 1) {
      throw new RedditMcpError(ErrorCode.SUBREDDIT_NOT_FOUND, `Post ${postId} not found`);
    }

    const postRaw = data[0]?.data?.children?.[0];
    if (!postRaw) {
      throw new RedditMcpError(ErrorCode.SUBREDDIT_NOT_FOUND, `Post ${postId} not found`);
    }

    const post = mapPost(postRaw);
    const comments = data.length > 1 ? flattenComments(data[1], 0, [], commentLimit) : [];

    return { post, comments };
  }

  async searchSubreddits(
    query: string,
    limit: number,
    after?: string,
  ): Promise<SubredditSearchResult> {
    let url = `${BASE}/subreddits/search.json?q=${encodeURIComponent(query)}&limit=${limit}&raw_json=1`;
    if (after) url += `&after=${encodeURIComponent(after)}`;

    const data = (await fetchWithRetry(url)) as any;
    const subreddits = (data.data?.children ?? []).map(mapSubreddit);
    return {
      query,
      subreddits,
      after: data.data?.after ?? null,
    };
  }

  async getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
    const url = `${BASE}/r/${encodeURIComponent(subreddit)}/about.json?raw_json=1`;
    const data = (await fetchWithRetry(url)) as any;
    return mapSubreddit(data);
  }
}
