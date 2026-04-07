# Deployment Guide

## Prerequisites

1. ✅ Dependencies installed: `npm install`
2. ✅ `.env` configured with Discord webhook
3. ✅ Google OAuth token at `~/.openclaw/google/token.json`
4. ✅ Test run succeeded: `node scraper.js`

## Deploy Hourly Cron Job

### Option 1: Via OpenClaw CLI

```bash
openclaw cron add \
  --name "eBay DDR4 RAM Scraper" \
  --kind "every" \
  --everyMs 3600000 \
  --payload '{
    "kind": "agentTurn",
    "message": "Run the eBay DDR4 RAM scraper",
    "timeoutSeconds": 300
  }' \
  --sessionTarget "isolated" \
  --model "anthropic/claude-haiku-4-5" \
  --delivery '{
    "mode": "announce",
    "channel": "discord",
    "to": "1489711525571727520"
  }'
```

### Option 2: Direct Node Cron (Advanced)

Create `cron-runner.js`:

```javascript
const { CronJob } = require('cron');
const { execSync } = require('child_process');

const job = new CronJob('0 * * * *', () => {
  console.log('🚀 Running eBay DDR4 scraper...');
  try {
    execSync('node scraper.js', { cwd: __dirname });
  } catch (error) {
    console.error('❌ Scraper failed:', error.message);
  }
}, null, true, 'America/Los_Angeles');

console.log('✅ Cron job scheduled (hourly, on the hour)');
```

Run with: `node cron-runner.js`

## Monitoring

### Check Cron Job Status
```bash
openclaw cron list
```

### View Run History
```bash
openclaw cron runs <job-id>
```

### Manual Trigger
```bash
openclaw cron run <job-id> --force
```

## Logs

All runs are logged to OpenClaw cron history with:
- Start/end timestamps
- Deals found & deduplicated
- Discord notification status
- Google Sheets append status
- Any errors encountered

## Stopping the Scraper

```bash
openclaw cron remove <job-id>
```

## Adjusting Schedule

Change `everyMs` in the cron config:
- `3600000` = every 1 hour
- `1800000` = every 30 minutes
- `7200000` = every 2 hours

## Budget Notes

- Playwright: ~2-3 seconds per run (local, no cost)
- Google Sheets API: 1 call per run (~$0.0001 per call, negligible)
- Discord: Free webhook posts
- **Estimated monthly cost**: <$0.10

This is a zero-cost operation.
