import type { RedditProvider } from "../client.js";
import type { SortOption, TimeFilter } from "../../core/validation.js";
import type { RedditComment, RedditPost, PostDetails, ScanResult, SearchResult, SubredditInfo, SubredditSearchResult } from "../../core/types.js";
import { ErrorCode, mapHttpError, RedditMcpError } from "../../core/errors.js";

const API_BASE = "https://oauth.reddit.com";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

export interface OAuthProviderOptions {
  clientId: string;
  clientSecret: string;
  userAgent: string;
}

function mapPost(raw: any): RedditPost {
  const data = raw.data;
  return {
    id: data.id,
    title: data.title,
    author: data.author,
    subreddit: data.subreddit,
    score: data.score,
    upvote_ratio: data.upvote_ratio ?? 0,
    num_comments: data.num_comments,
    created_utc: data.created_utc,
    url: data.url,
    permalink: `https://reddit.com${data.permalink}`,
    selftext: data.selftext ?? "",
    is_self: data.is_self ?? false,
    link_flair_text: data.link_flair_text ?? null,
    over_18: data.over_18 ?? false,
  };
}

function mapComment(raw: any, depth: number): RedditComment | null {
  if (!raw || raw.kind !== "t1") return null;
  const data = raw.data;
  return {
    id: data.id,
    author: data.author ?? "[deleted]",
    body: data.body ?? "",
    score: data.score ?? 0,
    created_utc: data.created_utc ?? 0,
    depth,
  };
}

function mapSubreddit(raw: any): SubredditInfo {
  const data = raw.data ?? raw;
  return {
    name: data.display_name ?? "",
    title: data.title ?? "",
    description: (data.public_description ?? data.description ?? "").slice(0, 500),
    subscribers: data.subscribers ?? 0,
    active_users: data.accounts_active ?? data.active_user_count ?? 0,
    created_utc: data.created_utc ?? 0,
    over_18: data.over18 ?? false,
    url: `https://reddit.com/r/${data.display_name ?? ""}`,
  };
}

function flattenComments(node: any, depth = 0, comments: RedditComment[] = [], limit = 50, seen = new Set<string>()): RedditComment[] {
  if (comments.length >= limit || !node) return comments;
  if (node.kind === "Listing" && node.data?.children) {
    for (const child of node.data.children) {
      if (comments.length >= limit) break;
      flattenComments(child, depth, comments, limit, seen);
    }
    return comments;
  }

  const comment = mapComment(node, depth);
  if (comment && !seen.has(comment.id)) {
    seen.add(comment.id);
    comments.push(comment);
    if (node.data?.replies && typeof node.data.replies === "object") {
      flattenComments(node.data.replies, depth + 1, comments, limit, seen);
    }
  }
  return comments;
}

export class OAuthProvider implements RedditProvider {
  private accessToken?: string;
  private expiresAt = 0;

  constructor(private readonly options: OAuthProviderOptions) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) return this.accessToken;

    const credentials = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString("base64");
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.options.userAgent,
      },
      body: "grant_type=client_credentials",
    });
    const body = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!response.ok || !body.access_token) {
      throw new RedditMcpError(ErrorCode.UPSTREAM_ERROR, `OAuth token request failed with status ${response.status}`);
    }

    this.accessToken = body.access_token;
    this.expiresAt = Date.now() + Math.max((body.expires_in ?? 3600) * 1000 - TOKEN_REFRESH_BUFFER_MS, 0);
    return this.accessToken;
  }

  private async fetchJson(url: string): Promise<any> {
    const token = await this.getAccessToken();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": this.options.userAgent },
    });
    if (!response.ok) throw mapHttpError(response.status, url);
    return response.json();
  }

  async fetchListing(subreddit: string, sort: SortOption, limit: number, timeFilter: TimeFilter, after?: string): Promise<ScanResult> {
    const query = new URLSearchParams({ limit: String(limit), t: timeFilter, raw_json: "1" });
    if (after) query.set("after", after);
    const data = await this.fetchJson(`${API_BASE}/r/${encodeURIComponent(subreddit)}/${sort}?${query}`);
    return { subreddit, sort, posts: (data.data?.children ?? []).map(mapPost), after: data.data?.after ?? null };
  }

  async search(query: string, subreddit: string, sort: string, timeFilter: TimeFilter, limit: number, after?: string): Promise<SearchResult> {
    const params = new URLSearchParams({ q: query, sort, t: timeFilter, limit: String(limit), raw_json: "1", restrict_sr: subreddit === "all" ? "0" : "1" });
    if (after) params.set("after", after);
    const prefix = subreddit === "all" ? "" : `/r/${encodeURIComponent(subreddit)}`;
    const data = await this.fetchJson(`${API_BASE}${prefix}/search?${params}`);
    return { query, subreddit, posts: (data.data?.children ?? []).map(mapPost), after: data.data?.after ?? null };
  }

  async fetchPostDetails(subreddit: string, postId: string, commentLimit: number): Promise<PostDetails> {
    const cleanId = postId.replace(/^t3_/, "");
    const data = await this.fetchJson(`${API_BASE}/r/${encodeURIComponent(subreddit)}/comments/${encodeURIComponent(cleanId)}?limit=${commentLimit}&raw_json=1`);
    const postRaw = data[0]?.data?.children?.[0];
    if (!postRaw) throw new RedditMcpError(ErrorCode.SUBREDDIT_NOT_FOUND, `Post ${postId} not found`);
    return { post: mapPost(postRaw), comments: data.length > 1 ? flattenComments(data[1], 0, [], commentLimit) : [] };
  }

  async searchSubreddits(query: string, limit: number, after?: string): Promise<SubredditSearchResult> {
    const params = new URLSearchParams({ q: query, limit: String(limit), raw_json: "1" });
    if (after) params.set("after", after);
    const data = await this.fetchJson(`${API_BASE}/subreddits/search?${params}`);
    return { query, subreddits: (data.data?.children ?? []).map(mapSubreddit), after: data.data?.after ?? null };
  }

  async getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
    return mapSubreddit(await this.fetchJson(`${API_BASE}/r/${encodeURIComponent(subreddit)}/about?raw_json=1`));
  }
}