import { z } from "zod";
import type { RedditProvider } from "../reddit/client.js";
import { validateQuery, validateLimit, validateSort, validateTimeFilter, validateSubreddit } from "../core/validation.js";

export const SearchPostsSchema = {
  query: z.string().describe("Search query string"),
  subreddit: z.string().optional().describe("Subreddit to search in (default: 'all' for global search)"),
  sort: z.enum(["relevance", "hot", "top", "new"]).optional().describe("Sort order (default: relevance)"),
  time_filter: z.enum(["hour", "day", "week", "month", "year", "all"]).optional().describe("Time filter (default: all)"),
  limit: z.number().min(1).max(100).optional().describe("Number of results (1-100, default 25)"),
  after: z.string().optional().describe("Pagination cursor from a previous response"),
};

export async function handleSearchPosts(
  provider: RedditProvider,
  args: {
    query: string;
    subreddit?: string;
    sort?: string;
    time_filter?: string;
    limit?: number;
    after?: string;
  },
) {
  const query = validateQuery(args.query);
  const subreddit = args.subreddit ? validateSubreddit(args.subreddit) : "all";
  const sort = args.sort ?? "relevance";
  const timeFilter = validateTimeFilter(args.time_filter);
  const limit = validateLimit(args.limit);

  const result = await provider.search(query, subreddit, sort, timeFilter, limit, args.after);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
