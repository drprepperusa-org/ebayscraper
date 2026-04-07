#!/usr/bin/env node
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const GoogleSheetsClient = require('./google-sheets-client');
const DiscordWebhook = require('./discord-webhook');

// Default products to scrape
const DEFAULT_PRODUCTS = [
  { name: 'DDR4 32GB', query: 'DDR4 32GB RAM', maxPrice: 100, category: 'RAM' },
  { name: 'DDR4 64GB', query: 'DDR4 64GB RAM', maxPrice: 200, category: 'RAM' },
  { name: 'DDR4 128GB', query: 'DDR4 128GB RAM', maxPrice: 500, category: 'RAM' },
];

const DEFAULT_EXCLUDE_KEYWORDS = ['broken', 'for parts', 'untested', 'as-is', 'as is', 'not working', 'damaged'];

const DEFAULT_CONDITIONS = ['new', 'used', 'refurbished'];

// Browser setup for local scraping (bypasses eBay bot detection)
const USE_BROWSER = !process.env.VERCEL;
let _browser = null;

async function getBrowser() {
  if (!USE_BROWSER) return null;
  if (_browser && _browser.connected) return _browser;
  const puppeteer = require('puppeteer-core');
  const chromePath = process.env.CHROME_PATH || (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome');
  _browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  return _browser;
}

async function closeBrowser() {
  if (_browser) { await _browser.close().catch(() => {}); _browser = null; }
}

async function fetchEbayPage(url) {
  if (USE_BROWSER) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('li.s-item, li.s-card', { timeout: 8000 }).catch(() => {});
      return await page.content();
    } finally {
      await page.close();
    }
  }
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    timeout: 10000,
  });
  return response.data;
}

function cleanTitle(raw) {
  return raw.replace(/^New Listing/, '').replace(/Opens in a new window or tab$/i, '').trim();
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Generic listing parser — works for ANY product
function parseGenericListings(html, product, options = {}) {
  const $ = cheerio.load(html);
  const maxPrice = product.maxPrice || 9999;
  const excludeKeywords = options.excludeKeywords || DEFAULT_EXCLUDE_KEYWORDS;
  const conditions = options.conditions || DEFAULT_CONDITIONS;
  const deals = [];

  const listingSelectors = ['li.s-card', 'li.s-item', 'div.s-item__wrapper'];
  let $listings = $([]);
  for (const selector of listingSelectors) {
    $listings = $(selector);
    if ($listings.length > 0) break;
  }

  if ($listings.length === 0) return { deals, listingsOnPage: 0 };

  $listings.each((i, el) => {
    try {
      const $el = $(el);
      const titleEl = $el.find('.s-card__title, .s-item__title, [role="heading"]').first();
      const rawTitle = titleEl.length ? titleEl.text().trim() : '';
      if (!rawTitle || rawTitle === 'Shop on eBay') return;
      const title = cleanTitle(rawTitle);
      if (!title || title.length < 5) return;

      // Skip auctions
      const fullText = $el.text().toLowerCase();
      const auctionPatterns = ['starting at', 'current bid', 'bid now', 'place bid', ' bids'];
      if (auctionPatterns.some(p => fullText.includes(p))) return;

      // Price
      const $priceEl = $el.find('.s-card__price, .s-item__price, [data-test-id="PRICE"]').first();
      const priceText = $priceEl.length ? $priceEl.text() : '';
      const priceMatch = priceText.match(/\$([\d,]+\.?\d*)/);
      if (!priceMatch) return;
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (!price || isNaN(price)) return;

      // Exclude keywords
      const titleLower = title.toLowerCase();
      if (excludeKeywords.some(p => titleLower.includes(p.toLowerCase()))) return;

      // Condition
      let condition = 'Used';
      const $condEl = $el.find('.s-card__subtitle, .SECONDARY_INFO, .s-item__subtitle').first();
      if ($condEl.length) condition = $condEl.text().trim();
      const condLower = condition.toLowerCase();
      if (conditions.length > 0) {
        const condMatches = conditions.some(c => {
          if (c === 'new') return condLower.includes('new') && !condLower.includes('pre-owned') && !condLower.includes('refurb');
          if (c === 'used') return condLower.includes('used') || condLower.includes('pre-owned');
          if (c === 'refurbished') return condLower.includes('refurb');
          return false;
        });
        if (!condMatches) return;
      }

      // Price threshold check
      if (price >= maxPrice) return;

      // Link
      let link = 'N/A';
      $el.find('a').each((j, a) => {
        const href = $(a).attr('href') || '';
        if (href.includes('/itm/') && link === 'N/A') link = href;
      });

      // Seller
      let seller = 'Unknown';
      const $sellerEl = $el.find('[class*="seller"]').first();
      if ($sellerEl.length) seller = $sellerEl.text().trim();

      deals.push({
        timestamp: new Date().toISOString(),
        product: product.name,
        category: product.category || 'General',
        title,
        price: price.toFixed(2),
        maxPrice: maxPrice.toFixed(2),
        condition,
        seller,
        link,
        alertedAt: new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
      });
    } catch (err) { /* skip */ }
  });

  return { deals, listingsOnPage: $listings.length };
}

// Fetch a single page and parse it
async function fetchAndParse(url, capacity, options) {
  const html = await fetchEbayPage(url);
  const result = parseListings(html, capacity, options);
  return result;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scrapeCapacity(capacity, options) {
  const thresholds = options.thresholds || DEFAULT_THRESHOLDS;
  const maxPages = options.maxPages || 10;
  const deals = [];
  let scanned = 0;

  for (let page = 1; page <= maxPages; page++) {
    const query = encodeURIComponent(product.query);
    const url = `https://www.ebay.com/sch/i.html?_nkw=${query}&_sop=15&rt=nc&LH_BIN=1&_pgn=${page}`;

    try {
      console.log(`[${product.name}] page ${page}...`);
      const html = await fetchEbayPage(url);
      const result = parseGenericListings(html, product, options);

      scanned += result.listingsOnPage;
      deals.push(...result.deals);
      console.log(`  => ${result.listingsOnPage} listings, ${result.deals.length} deals`);

      if (result.listingsOnPage === 0) {
        console.log(`[${product.name}] no more results, done`);
        break;
      }

      if (result.deals.length === 0 && page > 1) {
        console.log(`[${product.name}] prices above $${product.maxPrice}, done`);
        break;
      }

      await delay(1500);
    } catch (err) {
      console.error(`[${product.name}] page ${page} error: ${err.message}`);
      break;
    }
  }

  console.log(`[${product.name}] total ${deals.length} deals from ${scanned} listings`);
  return { product: product.name, deals, scanned };
}

async function scrapeAll(options = {}) {
  const products = options.products || DEFAULT_PRODUCTS;
  const seenLinks = new Set();
  let allDeals = [];
  let totalScanned = 0;

  for (const product of products) {
    const result = await scrapeProduct(product, options);
    totalScanned += result.scanned;
    for (const deal of result.deals) {
      if (deal.link === 'N/A' || !seenLinks.has(deal.link)) {
        if (deal.link !== 'N/A') seenLinks.add(deal.link);
        allDeals.push(deal);
      }
    }
  }

  await closeBrowser();
  return { deals: allDeals, scanned: totalScanned };
}

async function scrapeAndNotify(options = {}) {
  const sendToSheets = options.sendToSheets !== false;
  const sendToDiscord = options.sendToDiscord !== false;

  console.log('eBay Scraper started');

  const scrapeResult = await scrapeAll(options);
  const allDeals = scrapeResult.deals;
  const scanned = scrapeResult.scanned;
  console.log(`Scanned ${scanned} listings, found ${allDeals.length} deals`);

  if (allDeals.length === 0) {
    return { deals: 0, scanned, results: [], sheetsStatus: 'skipped', discordStatus: 'skipped' };
  }

  allDeals.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

  let sheetsStatus = 'skipped';
  let discordStatus = 'skipped';

  if (sendToSheets) {
    try {
      const sheetsClient = new GoogleSheetsClient();
      await sheetsClient.clearDeals();
      await sheetsClient.appendDeals(allDeals);
      sheetsStatus = 'sent';
    } catch (err) {
      sheetsStatus = 'error: ' + err.message;
    }
  }

  if (sendToDiscord) {
    try {
      const discord = new DiscordWebhook();
      await discord.sendDeals(allDeals);
      discordStatus = 'sent';
    } catch (err) {
      discordStatus = 'error: ' + err.message;
    }
  }

  return { deals: allDeals.length, scanned, results: allDeals, sheetsStatus, discordStatus };
}

module.exports = { scrapeAndNotify, DEFAULT_PRODUCTS, DEFAULT_EXCLUDE_KEYWORDS, DEFAULT_CONDITIONS };

if (require.main === module) {
  scrapeAndNotify()
    .then((result) => { console.log(`Done. ${result.deals} deals, ${result.scanned} scanned.`); process.exit(0); })
    .catch((error) => { console.error('Fatal error:', error.message); process.exit(1); });
}
