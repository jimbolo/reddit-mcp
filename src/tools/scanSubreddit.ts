import { z } from "zod";
import type { RedditProvider } from "../reddit/client.js";
import type { RedditPost } from "../core/types.js";
import { validateSubreddit, validateLimit, validateSort, validateTimeFilter } from "../core/validation.js";

// Strip selftext from listing posts — full body is available via get_post_details
function stripSelftext<T extends RedditPost>(post: T): Omit<T, "selftext"> & { selftext: string } {
  return { ...post, selftext: post.selftext ? post.selftext.slice(0, 100) + (post.selftext.length > 100 ? "..." : "") : "" };
}

export const ScanSubredditSchema = {
  subreddit: z.string().describe("Subreddit name (without r/ prefix), e.g. 'programming'"),
  sort: z.enum(["hot", "top", "new", "rising"]).optional().describe("Sort order (default: hot)"),
  limit: z.number().min(1).max(100).optional().describe("Number of posts to return (1-100, default 25)"),
  time_filter: z.enum(["hour", "day", "week", "month", "year", "all"]).optional().describe("Time filter for 'top' sort (default: all)"),
  after: z.string().optional().describe("Pagination cursor from a previous response"),
  include_comments: z.boolean().optional().describe("Include top comments for each post (default: false)"),
  comment_limit: z.number().min(1).max(50).optional().describe("Max comments per post when include_comments is true (default: 10)"),
};

export async function handleScanSubreddit(
  provider: RedditProvider,
  args: {
    subreddit: string;
    sort?: string;
    limit?: number;
    time_filter?: string;
    after?: string;
    include_comments?: boolean;
    comment_limit?: number;
  },
) {
  const subreddit = validateSubreddit(args.subreddit);
  const sort = validateSort(args.sort);
  const limit = validateLimit(args.limit);
  const timeFilter = validateTimeFilter(args.time_filter);
  const includeComments = args.include_comments ?? false;
  const commentLimit = Math.min(Math.max(args.comment_limit ?? 10, 1), 50);

  const result = await provider.fetchListing(subreddit, sort, limit, timeFilter, args.after);

  // Optionally enrich with comments
  if (includeComments && result.posts.length > 0) {
    const enriched = await Promise.all(
      result.posts.slice(0, 10).map(async (post) => {
        try {
          const details = await provider.fetchPostDetails(subreddit, post.id, commentLimit);
          return { ...stripSelftext(post), comments: details.comments };
        } catch {
          return { ...stripSelftext(post), comments: [] };
        }
      }),
    );
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ ...result, posts: enriched }),
        },
      ],
    };
  }

  const compactPosts = result.posts.map(stripSelftext);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ ...result, posts: compactPosts }),
      },
    ],
  };
}
