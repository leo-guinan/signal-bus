#!/usr/bin/env node
// Handler: build-complete
// Publishes a build cost receipt to the public registry
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const msgFile = process.argv[2];
if (!msgFile) { console.log('Usage: node publish-receipt.mjs <message.json>'); process.exit(1); }

const msg = JSON.parse(readFileSync(msgFile, 'utf8'));
const { buildId, description, cost, model, minutes, tokensIn, tokensOut, bountyReward, components } = msg.payload;

const receipt = {
  buildId,
  description,
  completedAt: msg.ts,
  actual: { cost, model, minutes, tokensIn, tokensOut },
  revenue: { bountyReward: bountyReward || 0 },
  profit: (bountyReward || 0) - cost,
  componentsUsed: components || [],
};

const receiptsDir = join(__dirname, '..', 'receipts');
mkdirSync(receiptsDir, { recursive: true });
writeFileSync(join(receiptsDir, `${buildId}.json`), JSON.stringify(receipt, null, 2));

// Update running totals
const totalsFile = join(receiptsDir, '_totals.json');
let totals = { builds: 0, totalCost: 0, totalRevenue: 0, totalProfit: 0 };
if (existsSync(totalsFile)) totals = JSON.parse(readFileSync(totalsFile, 'utf8'));

totals.builds++;
totals.totalCost = Math.round((totals.totalCost + cost) * 10000) / 10000;
totals.totalRevenue = Math.round((totals.totalRevenue + (bountyReward || 0)) * 100) / 100;
totals.totalProfit = Math.round((totals.totalRevenue - totals.totalCost) * 10000) / 10000;
totals.lastBuild = buildId;
totals.lastUpdated = msg.ts;

writeFileSync(totalsFile, JSON.stringify(totals, null, 2));

console.log(`Receipt: ${buildId} | Cost: $${cost} | Revenue: $${bountyReward || 0} | Profit: $${receipt.profit}`);
console.log(`Running totals: ${totals.builds} builds | $${totals.totalCost} spent | $${totals.totalRevenue} earned | $${totals.totalProfit} net`);
