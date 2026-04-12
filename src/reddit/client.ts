import type { SortOption, TimeFilter } from "../core/validation.js";
import type { RedditPost, RedditComment, ScanResult, SearchResult, PostDetails, SubredditInfo, SubredditSearchResult } from "../core/types.js";

/**
 * Provider interface — swap implementations without changing tool layer.
 */
export interface RedditProvider {
  fetchListing(subreddit: string, sort: SortOption, limit: number, timeFilter: TimeFilter, after?: string): Promise<ScanResult>;
  search(query: string, subreddit: string, sort: string, timeFilter: TimeFilter, limit: number, after?: string): Promise<SearchResult>;
  fetchPostDetails(subreddit: string, postId: string, commentLimit: number): Promise<PostDetails>;
  searchSubreddits(query: string, limit: number, after?: string): Promise<SubredditSearchResult>;
  getSubredditInfo(subreddit: string): Promise<SubredditInfo>;
}

export { PublicJsonProvider } from "./providers/publicJson.js";
