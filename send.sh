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

cat > "$FILE" << EOF
{
  "type": "$TYPE",
  "source": "$(hostname -s)",
  "ts": "$TS_ISO",
  "payload": ${PAYLOAD:-{}}
}
EOF

cd "$DIR"
git add inbox/
git commit -m "signal: $TYPE" --quiet
git push --quiet

echo "✓ Sent: $TYPE → $(basename $FILE)"
