import fs from 'fs';

const f1 = JSON.parse(fs.readFileSync('c:\\Users\\ecarn\\AppData\\Roaming\\Code - Insiders\\User\\workspaceStorage\\69c8cb3e748ce391ec436b1320ea60b0\\GitHub.copilot-chat\\chat-session-resources\\4559a5a6-d141-4f3f-a7b9-0088cf1c466c\\toolu_bdrk_01DJDt3N5LfHmXAmAG6tffdd__vscode-1775974017857\\content.json', 'utf8'));
const f2 = JSON.parse(fs.readFileSync('c:\\Users\\ecarn\\AppData\\Roaming\\Code - Insiders\\User\\workspaceStorage\\69c8cb3e748ce391ec436b1320ea60b0\\GitHub.copilot-chat\\chat-session-resources\\4559a5a6-d141-4f3f-a7b9-0088cf1c466c\\toolu_bdrk_013ECjmfAA7nwYqMwwq5GPtJ__vscode-1775974017859\\content.json', 'utf8'));

const all = [...f1.posts, ...f2.posts];
const seen = new Set();
const uniq = all.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

const apr1 = new Date('2026-04-01').getTime() / 1000;
const noise = ['AITAH', 'DoorDash', 'diydrones', 'PrivacyCompass', 'TheSaturnSignal', 'VPN',
  'relationships', 'legaladvice', 'gaming', 'AskReddit', 'politics', 'news', 'funny',
  'Music', 'movies', 'pics', 'todayilearned', 'worldnews', 'science', 'food', 'aww',
  'Showerthoughts', 'mildlyinteresting', 'explainlikeimfive', 'LifeProTips', 'TwoXChromosomes',
  'books', 'tifu', 'Jokes', 'gifs', 'nottheonion', 'GetMotivated', 'DIY', 'sports',
  'space', 'gadgets', 'askscience', 'philosophy', 'nosleep', 'WritingPrompts',
  'UpliftingNews', 'television', 'boardgames', 'OldSchoolCool'];

const relevant = uniq.filter(p => {
  if (p.created_utc < apr1) return false;
  const t = (p.title + ' ' + (p.selftext || '')).toLowerCase();
  const hasKeyword = t.includes('virtual address') || t.includes('virtual office') ||
    t.includes('virtual mailbox') || t.includes('business address') ||
    t.includes('mailing address') || t.includes('mail forwarding') ||
    t.includes('po box') || t.includes('commercial address');
  if (!hasKeyword) return false;
  // Must be in a business-related context
  const bizContext = t.includes('llc') || t.includes('business') || t.includes('company') ||
    t.includes('registered') || t.includes('formation') || t.includes('startup') ||
    t.includes('freelanc') || t.includes('ecommerce') || t.includes('entrepreneur') ||
    t.includes('incorporate') || t.includes('sole prop') || t.includes('s-corp') || 
    t.includes('tax') || t.includes('irs') || t.includes('ein') || t.includes('home address');
  if (!bizContext) return false;
  // Skip noise subreddits
  if (noise.some(n => p.subreddit.toLowerCase().includes(n.toLowerCase()))) return false;
  return true;
});

relevant.sort((a, b) => b.score - a.score);

console.log('Total unique:', uniq.length, '| Relevant:', relevant.length);
console.log('');
relevant.forEach((p, i) => {
  const date = new Date(p.created_utc * 1000);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  console.log(`${i + 1}. [${p.score}↑ ${p.num_comments}c] r/${p.subreddit} (${dateStr})`);
  console.log(`   ${p.title}`);
  console.log(`   ID: ${p.id} | ${p.permalink}`);
  console.log('');
});

// Save IDs for fetching details
fs.writeFileSync('virtual-address-filtered.json', JSON.stringify(relevant, null, 2));
console.log('Saved to virtual-address-filtered.json');
