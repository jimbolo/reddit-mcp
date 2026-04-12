import { z } from "zod";
import type { RedditProvider } from "../reddit/client.js";
import { validateSubreddit } from "../core/validation.js";

export const GetSubredditInfoSchema = {
  subreddit: z.string().describe("Subreddit name (without r/ prefix), e.g. 'programming'"),
};

export async function handleGetSubredditInfo(
  provider: RedditProvider,
  args: {
    subreddit: string;
  },
) {
  const subreddit = validateSubreddit(args.subreddit);
  const result = await provider.getSubredditInfo(subreddit);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result),
      },
    ],
  };
}
