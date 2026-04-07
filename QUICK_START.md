# Quick Start Guide

## 30-Second Setup

```bash
cd /Users/djmac/.openclaw/workspace/ebay-ram-scraper

# 1. Test it once
node scraper.js

# 2. Register for hourly operation
openclaw cron add \
  --name "eBay DDR4 RAM Scraper" \
  --kind "every" \
  --everyMs 3600000 \
  --command "cd /Users/djmac/.openclaw/workspace/ebay-ram-scraper && node scraper.js" \
  --model "anthropic/claude-haiku-4-5"

# 3. Verify it's running
openclaw cron list
```

## What's Running

✅ Scrapes eBay hourly (32GB, 64GB, 128GB DDR4)  
✅ Posts to Discord #1489711525571727520  
✅ Tracks deals in Google Sheets  
✅ 24h deduplication (no repeat alerts)  
✅ Pricing filters ($100/$200/$500 per stick)  

## The Data

📊 **Google Sheet:** https://docs.google.com/spreadsheets/d/1DsIADrgk7gIWBQEfDy4suY4DFRk4l4gjIv6YeC0_Aps  
💾 **Database:** `/Users/djmac/.openclaw/workspace/ebay-ram-scraper/deals.db`

## Configuration

Edit thresholds in `.env`:
```bash
THRESHOLD_32GB=100    # dollars per stick
THRESHOLD_64GB=200
THRESHOLD_128GB=500
```

## Support

Full docs: `README.md` | Operations: `DEPLOYMENT.md` | Summary: `COMPLETION_SUMMARY.md`

## Done! 🚀

System ready for 24/7 operation.
