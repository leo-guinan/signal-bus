#!/bin/bash
# Send a message to the signal bus
# Usage: ./send.sh <type> '<payload json>'
# Example: ./send.sh design-batch-complete '{"jobId":"abc","count":27}'
set -e

TYPE="$1"
PAYLOAD="$2"
TIMESTAMP=$(date +%s)
TS_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [ -z "$TYPE" ]; then
  echo "Usage: $0 <type> '[payload json]'"
  echo "Types: design-batch-complete, bounty-detected, build-complete, vps-health"
  exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
INBOX="$DIR/inbox"
FILE="$INBOX/${TIMESTAMP}-${TYPE}.json"

HOSTNAME=$(hostname -s)
node -e "
const fs = require('fs');
const msg = {
  type: process.argv[1],
  source: process.argv[2],
  ts: process.argv[3],
  payload: JSON.parse(process.argv[4] || '{}')
};
fs.writeFileSync(process.argv[5], JSON.stringify(msg, null, 2));
" "$TYPE" "$HOSTNAME" "$TS_ISO" "${PAYLOAD:-{}}" "$FILE"

cd "$DIR"
git add inbox/
git commit -m "signal: $TYPE" --quiet
git push --quiet

echo "✓ Sent: $TYPE → $(basename $FILE)"
