# Signal Bus

Self-executing message pipeline. Git push triggers GitHub Actions handlers automatically.
No polling. No waking Marvin. Known cost per message type.

## Flow

```
Source (VPS, cron, external) → push JSON to inbox/ → GitHub Actions auto-dispatches → handler runs → result written back
```

## Message Format

Filename: `{timestamp}-{type}.json`

```json
{
  "type": "design-batch-complete",
  "source": "vps",
  "ts": "2026-02-22T15:30:00Z",
  "payload": { "jobId": "sticker-batch-001", "count": 27, "urls": ["..."] }
}
```

## Registered Message Types

| Type | Handler | Est. Cost | Action |
|------|---------|-----------|--------|
| `design-batch-complete` | score-images.yml | ~$0.02 | Download images, run scoring, pick winners, commit results |
| `bounty-detected` | estimate-bounty.yml | ~$0.01 | Run architecture-brain estimator, commit estimate |
| `build-complete` | publish-receipt.yml | ~$0.00 | Format receipt, update public registry |
| `price-alert` | log-alert.yml | ~$0.00 | Log to data/, no action needed |

## Sending a Message

```bash
# From VPS
./send.sh design-batch-complete '{"jobId":"abc","count":27}'

# Or raw
echo '...' > inbox/$(date +%s)-design-batch-complete.json
git add inbox/ && git commit -m "signal: design-batch-complete" && git push
```

## Cost Control

- Every handler has a max runtime in the workflow file
- No handler calls external paid APIs without explicit budget in the message
- GitHub Actions: 2,000 free min/month on public repos
- Self-contained: handlers use only tools available in the runner
