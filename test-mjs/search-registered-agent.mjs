// Search script: find "registered agent" posts since April 1, 2026
import { PublicJsonProvider } from "../dist/reddit/providers/publicJson.js";

const provider = new PublicJsonProvider();
const APRIL_1_UTC = new Date("2026-04-01T00:00:00Z").getTime() / 1000;

const subredditsToScan = [
  "smallbusiness", "llc", "llc_life", "privacy", "Entrepreneur",
  "Business_Ideas", "ecommerce", "digitalnomad", "legaladvice",
  "BusinessIncorporation", "stripe", "freelance", "tax",
  "NWRegisteredAgent", "ZenBusinessInc", "indiebiz", "startups"
];

async function main() {
  const allPosts = [];

  // 1. Global search for "registered agent"
  console.log("Searching globally for 'registered agent'...");
  try {
    const r1 = await provider.search("registered agent", "all", "new", "month", 100);
    const filtered = r1.posts.filter(p => p.created_utc >= APRIL_1_UTC);
    console.log(`  Global search: ${r1.posts.length} total, ${filtered.length} since Apr 1`);
    allPosts.push(...filtered);
  } catch (e) { console.error("  Global search failed:", e.message); }

  // 2. Search specific subreddits for broader terms
  const queries = ["registered agent", "LLC formation", "virtual address registered"];
  for (const sub of subredditsToScan) {
    for (const q of queries) {
      try {
        const r = await provider.search(q, sub, "new", "month", 25);
        const filtered = r.posts.filter(p => p.created_utc >= APRIL_1_UTC);
        if (filtered.length > 0) {
          console.log(`  r/${sub} "${q}": ${filtered.length} posts`);
          allPosts.push(...filtered);
        }
      } catch (e) { /* skip errors */ }
    }
  }

  // 3. Scan specific subreddits
  for (const sub of ["llc_life", "llc", "NWRegisteredAgent", "ZenBusinessInc", "BusinessIncorporation"]) {
    try {
      const r = await provider.fetchListing(sub, "new", 50, "all");
      const filtered = r.posts.filter(p => p.created_utc >= APRIL_1_UTC);
      if (filtered.length > 0) {
        console.log(`  Scan r/${sub}: ${filtered.length} posts since Apr 1`);
        allPosts.push(...filtered);
      }
    } catch (e) { /* skip */ }
  }

  // Deduplicate by post ID
  const seen = new Set();
  const unique = [];
  for (const post of allPosts) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      unique.push(post);
    }
  }

  // Filter to only posts mentioning registered agent / RA / virtual address / LLC formation
  const relevant = unique.filter(p => {
    const text = `${p.title} ${p.selftext}`.toLowerCase();
    return text.includes("registered agent") || text.includes("virtual address") ||
           text.includes("llc formation") || text.includes("formation service") ||
           text.includes("northwest") || text.includes("zenbusiness") ||
           text.includes("legalzoom") || text.includes("registered office");
  });

  // Sort by score descending
  relevant.sort((a, b) => b.score - a.score);

  console.log(`\n=== RESULTS ===`);
  console.log(`Total unique posts found: ${unique.length}`);
  console.log(`Relevant (filtered): ${relevant.length}`);
  console.log(`\nWriting results to search-results.json...`);

  // Get comments for top posts
  const enriched = [];
  for (const post of relevant.slice(0, 50)) {
    try {
      const details = await provider.fetchPostDetails(post.subreddit, post.id, 15);
      enriched.push({ ...post, comments: details.comments });
    } catch {
      enriched.push({ ...post, comments: [] });
    }
  }

  const fs = await import("fs");
  fs.writeFileSync("search-results.json", JSON.stringify(enriched, null, 2));
  console.log("Done! Results saved.");
}

main().catch(console.error);
