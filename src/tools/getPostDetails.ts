import { z } from "zod";
import type { RedditProvider } from "../reddit/client.js";
import { validateSubreddit, validateLimit } from "../core/validation.js";

export const GetPostDetailsSchema = {
  post_id: z.string().describe("Reddit post ID (e.g. 'abc123' or 't3_abc123')"),
  subreddit: z.string().describe("Subreddit the post belongs to"),
  comment_limit: z.number().min(0).max(100).optional().describe("Max number of comments to return (0-100, default 25)"),
};

export async function handleGetPostDetails(
  provider: RedditProvider,
  args: {
    post_id: string;
    subreddit: string;
    comment_limit?: number;
  },
) {
  const subreddit = validateSubreddit(args.subreddit);
  const postId = args.post_id.trim();
  const commentLimit = validateLimit(args.comment_limit, 25);

  if (!postId) {
    return {
      content: [{ type: "text" as const, text: "Error: post_id is required" }],
      isError: true,
    };
  }

  const result = await provider.fetchPostDetails(subreddit, postId, commentLimit);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result),
      },
    ],
  };
}
