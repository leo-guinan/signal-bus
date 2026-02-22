#!/usr/bin/env node
// Handler: bounty-detected
// Estimates build cost for a new bounty using architecture-brain component registry
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const msgFile = process.argv[2];
if (!msgFile) { console.log('Usage: node estimate-bounty.mjs <message.json>'); process.exit(1); }

const msg = JSON.parse(readFileSync(msgFile, 'utf8'));
const { bountyId, title, description, reward } = msg.payload;

console.log(`Estimating bounty #${bountyId}: ${title} ($${reward})`);

// Component keywords for matching (subset of architecture-brain/estimate.mjs)
const COMPONENT_KEYWORDS = {
  'farcaster-api': ['farcaster', 'cast', 'warpcast'],
  'swap-engine': ['swap', 'trade', 'dex'],
  'stream-engine': ['stream', 'live', 'video', 'broadcast'],
  'tts-elevenlabs': ['voice', 'tts', 'speech'],
  'token-price': ['price', 'market cap', 'token price', 'holder'],
  'image-gen': ['image', 'sticker', 'picture', 'visual', 'banner', 'design', 'logo', 'meme'],
  'youtube-api': ['youtube', 'upload video'],
  'email-gog': ['email', 'gmail'],
  'bounty-scanner': ['bounty board'],
  'nextjs-app': ['website', 'web app', 'landing page', 'dashboard'],
  'x-posting': ['tweet', 'twitter', 'x post', 'engagement report'],
  'pipe-entropy': ['cron', 'monitor', 'alert', 'periodic'],
};

const desc = `${title} ${description}`.toLowerCase();
const matched = [];
for (const [comp, keywords] of Object.entries(COMPONENT_KEYWORDS)) {
  if (keywords.some(kw => desc.includes(kw))) matched.push(comp);
}

const reuseRatio = matched.length > 0 ? Math.min(matched.length / 5, 1) : 0;
let profile = 'heavy';
if (reuseRatio > 0.6) profile = 'trivial';
else if (reuseRatio > 0.3) profile = 'light';
else if (matched.length > 0) profile = 'medium';

const profiles = {
  trivial: { tokens: 7000, minutes: 3, cost: 0.05 },
  light: { tokens: 23000, minutes: 10, cost: 0.15 },
  medium: { tokens: 75000, minutes: 30, cost: 0.50 },
  heavy: { tokens: 225000, minutes: 60, cost: 1.50 },
};

const est = profiles[profile];
const profitable = reward > est.cost;

const result = {
  bountyId,
  title,
  reward,
  profile,
  estimatedMinutes: est.minutes,
  estimatedCost: est.cost,
  componentsReused: matched,
  profitable,
  margin: Math.round((reward - est.cost) * 100) / 100,
  recommendation: profitable ? 'BUILD' : (reward > est.cost * 0.5 ? 'CONSIDER' : 'SKIP'),
  ts: new Date().toISOString(),
};

const resultsDir = join(__dirname, '..', 'results');
mkdirSync(resultsDir, { recursive: true });
writeFileSync(join(resultsDir, `bounty-${bountyId}-estimate.json`), JSON.stringify(result, null, 2));

console.log(`Profile: ${profile} | Cost: $${est.cost} | Reward: $${reward} | Margin: $${result.margin}`);
console.log(`Recommendation: ${result.recommendation}`);
console.log(`Components: ${matched.join(', ') || 'none'}`);
