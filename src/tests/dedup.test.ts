import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicJsonProvider, clearCache } from "../reddit/providers/publicJson.js";

// Build a Reddit-shaped comment tree with duplicate IDs
function fakePostDetailsResponse(commentTree: any[]) {
  return [
    // [0] = post listing
    {
      data: {
        children: [
          {
            data: {
              id: "post1",
              title: "Test Post",
              author: "author1",
              subreddit: "test",
              score: 42,
              upvote_ratio: 0.95,
              num_comments: 10,
              created_utc: 1700000000,
              url: "https://reddit.com/r/test/comments/post1",
              permalink: "/r/test/comments/post1/test_post/",
              selftext: "Full body text",
              is_self: true,
              link_flair_text: null,
              over_18: false,
            },
          },
        ],
      },
    },
    // [1] = comment listing
    {
      kind: "Listing",
      data: {
        children: commentTree,
      },
    },
  ];
}

function makeComment(id: string, body: string, replies: any = "") {
  return {
    kind: "t1",
    data: {
      id,
      author: `user_${id}`,
      body,
      score: 5,
      created_utc: 1700000000,
      replies,
    },
  };
}

describe("Comment deduplication", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearCache();
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("should remove duplicate comment IDs from the response", async () => {
    // Comment "dup1" appears twice at the top level
    const tree = [
      makeComment("dup1", "First occurrence"),
      makeComment("c2", "Unique comment"),
      makeComment("dup1", "Duplicate occurrence"),
      makeComment("c3", "Another unique"),
    ];

    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakePostDetailsResponse(tree)),
    });

    const provider = new PublicJsonProvider();
    const result = await provider.fetchPostDetails("test", "post1", 50);

    const ids = result.comments.map((c) => c.id);
    // "dup1" should appear only once
    expect(ids.filter((id) => id === "dup1")).toHaveLength(1);
    // Total should be 3, not 4
    expect(result.comments).toHaveLength(3);
  });

  it("should remove duplicates across parent and nested replies", async () => {
    // "dup1" appears as a top-level comment AND inside replies of another comment
    const tree = [
      makeComment("dup1", "Top level"),
      makeComment("parent", "Parent comment", {
        kind: "Listing",
        data: {
          children: [makeComment("dup1", "Nested duplicate"), makeComment("child1", "Real child")],
        },
      }),
    ];

    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakePostDetailsResponse(tree)),
    });

    const provider = new PublicJsonProvider();
    const result = await provider.fetchPostDetails("test", "post1", 50);

    const ids = result.comments.map((c) => c.id);
    expect(ids.filter((id) => id === "dup1")).toHaveLength(1);
    // parent + dup1 + child1 = 3 unique
    expect(result.comments).toHaveLength(3);
  });

  it("should not drop unique comments", async () => {
    const tree = [
      makeComment("a", "Comment A"),
      makeComment("b", "Comment B"),
      makeComment("c", "Comment C"),
    ];

    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakePostDetailsResponse(tree)),
    });

    const provider = new PublicJsonProvider();
    const result = await provider.fetchPostDetails("test", "post1", 50);

    expect(result.comments).toHaveLength(3);
    expect(result.comments.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});
