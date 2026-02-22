#!/usr/bin/env node
// Handler: process-feedback — stores feedback and flags for action
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const file = process.argv[2];
if (!file) { console.error('No file'); process.exit(1); }

const msg = JSON.parse(readFileSync(file, 'utf8'));
const { agent, from, text, category, page } = msg.payload || {};

console.log(`Feedback for ${agent || 'general'} from ${from || 'anon'}: ${text}`);

// Append to feedback log
const dataDir = join(dirname(dirname(file)), 'data', 'feedback');
mkdirSync(dataDir, { recursive: true });

const logFile = join(dataDir, `${agent || 'general'}.jsonl`);
const entry = {
  ts: msg.ts,
  source: msg.source,
  agent: agent || null,
  from: from || 'anon',
  category: category || 'general',
  text,
  page: page || null,
};

const existing = existsSync(logFile) ? readFileSync(logFile, 'utf8') : '';
writeFileSync(logFile, existing + JSON.stringify(entry) + '\n');

console.log(`✓ Logged to data/feedback/${agent || 'general'}.jsonl`);
