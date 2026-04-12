import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicJsonProvider, clearCache } from "../reddit/providers/publicJson.js";

// Fake Reddit listing response
function fakeListing(postIds: string[]) {
  return {
    data: {
      children: postIds.map((id) => ({
        data: {
          id,
          title: `Post ${id}`,
          author: "user1",
          subreddit: "test",
          score: 10,
          upvote_ratio: 0.9,
          num_comments: 5,
          created_utc: 1700000000,
          url: `https://reddit.com/r/test/comments/${id}`,
          permalink: `/r/test/comments/${id}/post/`,
          selftext: "body text here",
          is_self: true,
          link_flair_text: null,
          over_18: false,
        },
      })),
      after: null,
    },
  };
}

describe("URL-level request cache", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearCache();
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeListing(["aaa", "bbb"])),
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("should call Reddit only once for identical scan requests", async () => {
    const provider = new PublicJsonProvider();

    // First call — should hit Reddit
    const r1 = await provider.fetchListing("test", "hot", 25, "all");
    // Second call — same args — should use cache
    const r2 = await provider.fetchListing("test", "hot", 25, "all");

    expect(r1.posts).toHaveLength(2);
    expect(r2.posts).toHaveLength(2);
    // fetch should have been called exactly once
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should make a new fetch for different parameters", async () => {
    const provider = new PublicJsonProvider();

    await provider.fetchListing("test", "hot", 25, "all");
    await provider.fetchListing("test", "new", 25, "all"); // different sort

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should make a new fetch for a different subreddit", async () => {
    const provider = new PublicJsonProvider();

    await provider.fetchListing("test", "hot", 25, "all");
    await provider.fetchListing("other", "hot", 25, "all");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should cache search results for identical queries", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeListing(["s1", "s2"])),
    });
    const provider = new PublicJsonProvider();

    await provider.search("AI agents", "all", "relevance", "all", 25);
    await provider.search("AI agents", "all", "relevance", "all", 25);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should cache getSubredditInfo for the same subreddit", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            display_name: "test",
            title: "Test Sub",
            public_description: "A test subreddit",
            subscribers: 100000,
            accounts_active: 500,
            created_utc: 1400000000,
            over18: false,
          },
        }),
    });
    const provider = new PublicJsonProvider();

    await provider.getSubredditInfo("test");
    await provider.getSubredditInfo("test");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
