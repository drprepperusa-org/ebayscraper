# eBay DDR4 RAM Scraper

Automated hourly scraper for DDR4 RAM deals on eBay with Google Sheets logging and Discord alerts.

## Setup

### 1. Install Dependencies
```bash
cd /Users/djmac/.openclaw/workspace/ebay-ram-scraper
npm install
```

### 2. Configure Environment
`.env` is already configured with:
- Discord webhook (posts to #ddr4-ram)
- Google Sheets ID (auto-logs deals)

### 3. Verify Google OAuth Token
Make sure `/Users/djmac/.openclaw/google/token.json` exists and is valid.

## Running

### Manual Test
```bash
node scraper.js
```

### Scheduled (Hourly via Cron)
See DEPLOYMENT.md for OpenClaw cron setup.

## Features

✅ Scrapes eBay for 32GB, 64GB, 128GB DDR4  
✅ Filters by price thresholds:
  - 32GB: <$100/stick
  - 64GB: <$200/stick
  - 128GB: <$500/stick

✅ Auto-deduplicates within 24h window  
✅ Consolidates deals by capacity in Discord alerts  
✅ Logs to Google Sheets with:
  - Timestamp
  - Capacity
  - Title
  - Price & per-stick cost
  - Stick count
  - Condition & seller
  - Link

✅ Handles multi-stick kits (2x16GB, 4x8GB, etc.)  
✅ Rate limiting & user-agent rotation  
✅ Error recovery with detailed logging

## Pricing Thresholds

Edit these in `scraper.js` line ~13:
```javascript
const THRESHOLDS = {
  '32GB': 100,   // Alert if <$100/stick
  '64GB': 200,   // Alert if <$200/stick
  '128GB': 500,  // Alert if <$500/stick
};
```

## Google Sheets
📊 https://docs.google.com/spreadsheets/d/1DsIADrgk7gIWBQEfDy4suY4DFRk4l4gjIv6YeC0_Aps

Auto-shared with:
- info@drprepperusa.com
- shupaguy@gmail.com

## Discord Alerts
Posts to #ddr4-ram with:
- Capacity (32GB, 64GB, 128GB)
- Top 5 cheapest deals
- Links to listings
- Per-stick cost calculation

## Troubleshooting

**Sheet not updating?**
- Check Google token: `ls -la ~/.openclaw/google/token.json`
- Verify Sheets ID in .env matches the spreadsheet URL

**No Discord alerts?**
- Verify webhook URL in .env
- Check webhook still exists in Discord Server Settings

**No deals found?**
- Thresholds may be too strict
- Try lowering them in scraper.js
- eBay inventory changes hourly

## Logs

Each run outputs:
- Listings scraped per capacity
- New deals (post-dedup count)
- Success/error status

Run logs are stored in OpenClaw cron history.
