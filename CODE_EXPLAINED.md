# eBay DDR4 RAM Scraper — Code Explained in Plain English

## Overview: How It Works

Every **30 minutes**, the system does this:

1. **Scrapes eBay** (scraper.js) — Searches for DDR4 RAM listings
2. **Filters deals** — Keeps only those under your price thresholds
3. **Removes duplicates** (dedup.js) — Doesn't alert you twice for the same deal
4. **Saves to Google Sheet** (google-sheets-client.js) — Creates a permanent record
5. **Posts to Discord** (discord-webhook.js) — Sends you a formatted alert

---

## The Files (What Each One Does)

### 1. **scraper.js** — The Main Brain

This is the workhorse. It runs every 30 minutes and does all the searching.

**What it does:**

```
FOR EACH CAPACITY (32GB, 64GB, 128GB):
  1. Go to eBay search URL (e.g., "DDR4 32GB sorted by price")
  2. Find all listing cards on the page
  3. For each listing:
     - Extract: title, price, condition, seller, link
     - Check: Is it Buy-It-Now (not auction)?
     - Check: Is it actually DDR4 (not Optane/persistent memory)?
     - Check: Is it NOT damaged/broken?
     - Calculate: Cost per stick (price ÷ number of sticks)
     - Check: Does it beat your threshold?
     - If YES to all checks → Add to deals list
  4. Return all deals found
  5. NO DEDUP FILTERING — All deals are sent to Discord/Sheets every cycle
```

**Key Rules (the validation checks):**

| Check | What It Does | Example |
|-------|------|---------|
| **DDR4 Only** | Rejects Optane, PMEM, other memory types | ❌ "Intel Optane" → rejected |
| **Buy-It-Now Only** | Auction-only listings are skipped | ❌ "Starting at $X" → rejected |
| **No Damaged Items** | Rejects "for parts," "broken," "untested" | ❌ "For Parts Only" → rejected |
| **Per-Stick Cost** | Divides total price by stick count | 4x16GB @ $60 = $15/stick ✅ |
| **Under Threshold** | Compares per-stick cost to your limits | 32GB < $100/stick ✅ |

**The thresholds (hard-coded):**
- 32GB sticks: Must be **< $100 per stick**
- 64GB sticks: Must be **< $200 per stick**
- 128GB sticks: Must be **< $500 per stick**

**How it extracts data from eBay:**

The scraper uses **Playwright** (a browser automation tool) to:
- Load each eBay search page
- Wait for listings to fully load
- Read the HTML and pull out: title, price, seller, condition
- Extract the eBay link from each listing

**Retry Logic (Safety Feature):**

If something fails (network hiccup, browser crash), it retries:
- Browser launch: 3 attempts (1s, 2s, 4s delays)
- Page navigation: 3 attempts (2s, 4s, 8s delays)
- Item extraction: 2 attempts (1.5s, 3s delays)

This prevents a single glitch from stopping the entire scrape.

---

### 2. **dedup.js** — DISABLED (Show All Active Listings)

**Current behavior (as of Apr 4, 2026):**

Dedup logic has been removed. Every 30-minute cycle shows **all active listings**, even if you've been alerted about them before.

**Why this approach:**

You might miss a deal the first time it's alerted. Showing all active listings every cycle gives you another chance to spot deals you may have overlooked.

**How it works now:**

```
When scraper finds deals:
  For EACH deal found:
    Send to Discord (no dedup check)
    Log to Google Sheet
    Next cycle: Same deal appears again (still on eBay)
    Alert again (you see it again)
```

**Trade-off:**

- ✅ No missed deals due to dedup window expiring
- ⚠️ You might see the same deal multiple times per day
- ✅ More opportunities to act before listing sells out

**Note:** The `dedup.js` file still exists but is no longer imported or used.

---

### 3. **google-sheets-client.js** — The Data Logger

**What it does:**

Connects to your Google Sheet and appends all new deals as rows.

**Sheet structure:**

| Timestamp | Capacity | Title | Price | Stick Count | Per-Stick | Condition | Seller | Link | Alerted At |
|-----------|----------|-------|-------|-------------|-----------|-----------|--------|------|-----------|
| 2026-04-04T18:30:00Z | 32GB | Team Group 32GB... | 31.00 | 2 | 15.50 | Pre-Owned | Unknown | https://ebay.com/... | Apr 4, 11:10 AM |

**Authentication:**

Uses your Google OAuth token at: `~/.openclaw/google/token.json`

This file was created the first time you authorized access. It's reusable — no re-authentication needed.

**Methods:**

| Method | What It Does |
|--------|------|
| `appendDeals(deals)` | Add rows to the sheet |
| `checkHeaders()` | Verify column headers exist |
| `createHeaders()` | Create headers if sheet is new |

---

### 4. **discord-webhook.js** — The Alert Formatter

**What it does:**

Takes the deals and formats them into a nice Discord embed, then posts it.

**What the alert looks like:**

```
🎯 32GB DDR4 Deals Detected
─────────────────────────────
Found 3 deals under threshold ($100/stick)

#1 - $15.50/stick (2x)
Team Group 32GB DDR4-3200 SO-DIMM
Price: $31 | Seller: Unknown

#2 - $20.50/stick (1x)
Crucial Pro 32GB DDR4 RAM Kit
Price: $20.50 | Seller: Unknown

... (up to 10 deals per alert)

─────────────────────────────
eBay DDR4 Scraper | Auto-logged to sheet | Apr 4, 11:10 AM
```

**Formatting:**

- Deals grouped by capacity (32GB, 64GB, 128GB)
- Each capacity = separate Discord embed
- Sorted by cheapest per-stick cost first
- Shows up to 10 deals per alert
- Title links directly to eBay listing

---

## The Execution Flow (Step by Step)

```
CRON SCHEDULER (every 30 minutes)
    ↓
    ├─→ scraper.js starts
    │   ├─→ Launch browser
    │   ├─→ Search eBay for 32GB
    │   │   ├─→ Extract listings
    │   │   └─→ Filter by rules (BIN, DDR4, not damaged)
    │   ├─→ Search eBay for 64GB
    │   │   └─→ (same filtering)
    │   ├─→ Search eBay for 128GB
    │   │   └─→ (same filtering)
    │   └─→ Return all deals found
    │
    ├─→ google-sheets-client.js appends all deals
    │   └─→ Adds rows to Google Sheet (duplicate rows OK)
    │
    └─→ discord-webhook.js posts alert
        ├─→ Group deals by capacity
        ├─→ Format each group as embed
        └─→ Send to Discord channel (all active listings)
```

---

## Key Settings & How to Change Them

### 1. **Change Price Thresholds**

In `scraper.js`, find:

```javascript
const THRESHOLDS = {
  '32GB': 100,      // Change this to 80 if you want <$80/stick
  '64GB': 200,      // Change this to 150 if you want <$150/stick
  '128GB': 500,     // Change this to 400 if you want <$400/stick
};
```

### 2. **Add or Remove Capacities**

In `scraper.js`, find:

```javascript
const capacities = ['32GB', '64GB', '128GB'];  // Add '48GB' or remove items here
```

### 3. **Change Number of Results Per Alert**

In `discord-webhook.js`, find:

```javascript
const topDeals = deals.slice(0, 10);  // Show top 10 deals. Change to 20 to show more.
```

### 4. **Exclude More Sellers or Listings**

In `scraper.js`, find the `damagePatterns` array:

```javascript
const damagePatterns = ['damaged', 'not working', 'for parts', 'broken', 'untested', 'as-is', 'as is'];
// Add patterns like: 'missing', 'bent', 'chips', etc.
```

### 5. **Dedup (Disabled)**

As of Apr 4, 2026, dedup filtering is disabled. All active listings are shown every cycle.

If you ever want to re-enable dedup, uncomment the dedup logic in `scraper.js` (see git history).

### 6. **Change Scrape Interval**

The cron job config (where OpenClaw schedules the runs):

Current: Every 30 minutes (1800000 ms)

To change:
- 15 minutes: 900000 ms
- 1 hour: 3600000 ms
- 2 hours: 7200000 ms

---

## How to Make Changes

**Example: Lower 32GB threshold to $80/stick**

1. Open: `/Users/djmac/.openclaw/workspace/ebay-ram-scraper/scraper.js`
2. Find line: `'32GB': 100,`
3. Change to: `'32GB': 80,`
4. Save file
5. Next cron run will use the new value

**Example: Add 48GB capacity**

1. Open `scraper.js`
2. Change: `const capacities = ['32GB', '64GB', '128GB'];`
3. To: `const capacities = ['32GB', '48GB', '64GB', '128GB'];`
4. Add threshold: `'48GB': 150,` (or whatever limit you want)
5. Save file

**Example: Only show top 5 deals per alert**

1. Open: `discord-webhook.js`
2. Change: `const topDeals = deals.slice(0, 10);`
3. To: `const topDeals = deals.slice(0, 5);`
4. Save file

---

## Troubleshooting

### "No deals found" 

**Likely causes:**
- eBay UI changed (selectors don't match)
- All listings are auctions (no Buy-It-Now)
- No DDR4 in your search results
- All deals exceed your thresholds

**Fix:** Run `node scraper.js` manually in terminal and check the console output

### "Discord alert didn't post"

**Likely causes:**
- Webhook URL invalid in `.env`
- Discord webhook revoked
- Network issue

**Fix:** Check `.env` file for `DISCORD_WEBHOOK_URL`

### "Google Sheet has duplicate rows"

**This is expected behavior** — dedup is disabled, so every cycle appends all active listings to the sheet.

**If you want duplicates filtered:**
- Implement a manual cleanup (Google Sheets query to deduplicate)
- Or re-enable dedup logic in scraper.js

### "Google Sheet not updating"

**Likely causes:**
- OAuth token expired
- Insufficient permissions
- Sheet ID changed

**Fix:** Verify token at `~/.openclaw/google/token.json` exists

---

## Files at a Glance

| File | Purpose | Editable? |
|------|---------|-----------|
| `scraper.js` | Main scraper logic | ✅ Yes |
| `dedup.js` | Duplicate prevention | ⚠️ Usually not |
| `discord-webhook.js` | Alert formatting | ✅ Yes |
| `google-sheets-client.js` | Sheet integration | ⚠️ Usually not |
| `.env` | API keys & config | ✅ Yes (sensitive) |
| `package.json` | Dependencies | ⚠️ Usually not |
| `deals.db` | SQLite cache | ❌ No (auto-managed) |
| `dedup-cache.json` | Dedup memory | ❌ No (auto-managed) |

---

## Summary

The system is **simple in concept** but **thorough in execution:**

1. **Search** → Playwright visits eBay
2. **Filter** → 5 validation rules eliminate bad listings
3. **Deduplicate** → 24-hour memory prevents spam
4. **Log** → Results go to Google Sheet
5. **Alert** → Discord embed posts to your channel

All pieces communicate through simple file I/O and API calls. No databases. No complex state management.

**To make changes:** Edit the JS files, save, and the next cron run uses your updated code.
