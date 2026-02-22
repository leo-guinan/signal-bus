#!/usr/bin/env node
// Handler: design-batch-complete
// Downloads images from URLs, scores them, picks winners, writes results
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const msgFile = process.argv[2];
if (!msgFile) { console.log('Usage: node score-images.mjs <message.json>'); process.exit(1); }

const msg = JSON.parse(readFileSync(msgFile, 'utf8'));
const { jobId, count, urls, criteria, description } = msg.payload;

console.log(`Scoring job: ${jobId} (${count || urls?.length || 0} images)`);

// For now: download images and organize them for scoring
// Full scoring requires vision API which we'll add as a secret
const resultsDir = join(__dirname, '..', 'results', jobId);
mkdirSync(resultsDir, { recursive: true });

async function downloadImages() {
  if (!urls || urls.length === 0) {
    console.log('No URLs in payload — images may be served from VPS');
    writeFileSync(join(resultsDir, 'status.json'), JSON.stringify({
      jobId,
      status: 'awaiting-images',
      ts: new Date().toISOString(),
      message: 'No image URLs provided. Check VPS output directory.',
    }, null, 2));
    return;
  }

  const downloaded = [];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const fname = basename(new URL(url).pathname);
        writeFileSync(join(resultsDir, fname), buf);
        downloaded.push(fname);
        console.log(`  ✓ ${fname}`);
      }
    } catch (e) {
      console.log(`  ✗ ${url}: ${e.message}`);
    }
  }

  // Write manifest for scoring
  writeFileSync(join(resultsDir, 'manifest.json'), JSON.stringify({
    jobId,
    status: 'downloaded',
    ts: new Date().toISOString(),
    criteria: criteria || 'quality, readability, emotional clarity, style consistency',
    description: description || '',
    images: downloaded,
    scores: {}, // filled in by scoring step
    winner: null,
  }, null, 2));

  console.log(`Downloaded ${downloaded.length}/${urls.length} images`);
  console.log(`Results: ${resultsDir}`);
}

downloadImages().catch(console.error);
