import { z } from "zod";
import type { RedditProvider } from "../reddit/client.js";
import { validateQuery, validateLimit } from "../core/validation.js";

export const FindSubredditsSchema = {
  query: z.string().describe("Topic or keyword to search for subreddits (e.g. 'email deliverability', 'AI agents')"),
  limit: z.number().min(1).max(25).optional().describe("Number of subreddits to return (1-25, default 10)"),
  after: z.string().optional().describe("Pagination cursor from a previous response"),
};

export async function handleFindSubreddits(
  provider: RedditProvider,
  args: {
    query: string;
    limit?: number;
    after?: string;
  },
) {
  const query = validateQuery(args.query);
  const limit = validateLimit(args.limit, 10);

  const result = await provider.searchSubreddits(query, limit, args.after);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
