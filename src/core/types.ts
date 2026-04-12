// Stable output types shared across all tools and providers

export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: number;
  url: string;
  permalink: string;
  selftext: string;
  is_self: boolean;
  link_flair_text: string | null;
  over_18: boolean;
}

export interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  depth: number;
}

export interface ScanResult {
  subreddit: string;
  sort: string;
  posts: RedditPost[];
  after: string | null;
}

export interface SearchResult {
  query: string;
  subreddit: string;
  posts: RedditPost[];
  after: string | null;
}

export interface PostDetails {
  post: RedditPost;
  comments: RedditComment[];
}

export interface SubredditInfo {
  name: string;
  title: string;
  description: string;
  subscribers: number;
  active_users: number;
  created_utc: number;
  over_18: boolean;
  url: string;
}

export interface SubredditSearchResult {
  query: string;
  subreddits: SubredditInfo[];
  after: string | null;
}
