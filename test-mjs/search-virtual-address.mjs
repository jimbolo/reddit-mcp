// Search script: find "virtual address" posts since April 1, 2026
import { PublicJsonProvider } from "../dist/reddit/providers/publicJson.js";

const provider = new PublicJsonProvider();
const APRIL_1_UTC = new Date("2026-04-01T00:00:00Z").getTime() / 1000;

const subredditsToScan = [
  "smallbusiness", "llc", "llc_life", "privacy", "Entrepreneur",
  "Business_Ideas", "ecommerce", "digitalnomad", "legaladvice",
  "BusinessIncorporation", "freelance", "tax", "realestateinvesting",
  "startups", "LosAngeles", "bayarea", "nyc", "houston", "Austin",
  "Dallas", "Miami", "Denver", "Seattle", "Portland", "Chicago",
  "SanFrancisco", "personalfinance", "legaladviceofftopic",
  "NWRegisteredAgent", "ZenBusinessInc", "indiebiz", "3PL",
  "sweatystartup", "sidehustle", "Bookkeeping", "flipping"
];

const globalQueries = [
  "virtual address",
  "virtual business address",
  "virtual address LLC",
  "virtual office address",
  "virtual mailbox LLC",
  "virtual address for business",
  "business address service",
  "virtual office LLC",
];

const cityStateQueries = [
  "virtual address Los Angeles",
  "virtual address Wyoming",
  "virtual address Delaware",
  "virtual address Florida",
  "virtual address New York",
  "virtual address Texas",
  "virtual address California",
  "virtual address Nevada",
  "virtual address Miami",
  "virtual address Chicago",
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const allPosts = [];

  // 1. Global searches
  for (const q of globalQueries) {
    console.log(`Global search: "${q}"...`);
    try {
      const r = await provider.search(q, "all", "new", "month", 100);
      const filtered = r.posts.filter(p => p.created_utc >= APRIL_1_UTC);
      console.log(`  Found ${r.posts.length} total, ${filtered.length} since Apr 1`);
      allPosts.push(...filtered);
    } catch (e) { console.error(`  Failed: ${e.message}`); }
    await sleep(1200);
  }

  // 2. City/State specific global searches
  for (const q of cityStateQueries) {
    console.log(`Global search: "${q}"...`);
    try {
      const r = await provider.search(q, "all", "new", "month", 50);
      const filtered = r.posts.filter(p => p.created_utc >= APRIL_1_UTC);
      if (filtered.length > 0) {
        console.log(`  Found ${filtered.length} since Apr 1`);
        allPosts.push(...filtered);
      } else {
        console.log(`  No results since Apr 1`);
      }
    } catch (e) { console.error(`  Failed: ${e.message}`); }
    await sleep(1200);
  }

  // 3. Search specific subreddits
  const subQueries = ["virtual address", "virtual office", "business address", "mail forwarding LLC"];
  for (const sub of subredditsToScan) {
    for (const q of subQueries) {
      try {
        const r = await provider.search(q, sub, "new", "month", 25);
        const filtered = r.posts.filter(p => p.created_utc >= APRIL_1_UTC);
        if (filtered.length > 0) {
          console.log(`  r/${sub} "${q}": ${filtered.length} posts`);
          allPosts.push(...filtered);
        }
      } catch (e) { /* skip errors */ }
      await sleep(800);
    }
  }

  // 4. Scan key subreddits for any virtual address mentions
  const scanSubs = ["llc_life", "llc", "smallbusiness", "BusinessIncorporation", "Entrepreneur"];
  for (const sub of scanSubs) {
    try {
      const r = await provider.fetchListing(sub, "new", 100, "all");
      const filtered = r.posts.filter(p => {
        if (p.created_utc < APRIL_1_UTC) return false;
        const text = `${p.title} ${p.selftext}`.toLowerCase();
        return text.includes("virtual address") || text.includes("virtual office") ||
               text.includes("virtual mailbox") || text.includes("business address") ||
               text.includes("mail forwarding") || text.includes("mailing address");
      });
      if (filtered.length > 0) {
        console.log(`  Scan r/${sub}: ${filtered.length} virtual-address posts since Apr 1`);
        allPosts.push(...filtered);
      }
    } catch (e) { /* skip */ }
    await sleep(1000);
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

  // Filter to only truly relevant posts
  const relevant = unique.filter(p => {
    const text = `${p.title} ${p.selftext}`.toLowerCase();
    return text.includes("virtual address") || text.includes("virtual office") ||
           text.includes("virtual mailbox") || text.includes("business address") ||
           text.includes("mail forwarding") || text.includes("mailing address") ||
           text.includes("po box") || text.includes("registered agent address") ||
           text.includes("commercial address");
  });

  // Sort by score descending
  relevant.sort((a, b) => b.score - a.score);

  console.log(`\n=== RESULTS ===`);
  console.log(`Total unique posts found: ${unique.length}`);
  console.log(`Relevant (filtered): ${relevant.length}`);

  // Get comments for top posts
  const enriched = [];
  for (const post of relevant.slice(0, 60)) {
    try {
      console.log(`  Fetching comments for: ${post.title.slice(0, 60)}...`);
      const details = await provider.fetchPostDetails(post.subreddit, post.id, 15);
      enriched.push({ ...post, comments: details.comments });
      await sleep(800);
    } catch {
      enriched.push({ ...post, comments: [] });
    }
  }

  const fs = await import("fs");
  fs.writeFileSync("search-results-virtual-address.json", JSON.stringify(enriched, null, 2));
  console.log(`\nDone! ${enriched.length} results saved to search-results-virtual-address.json`);
}

main().catch(console.error);
