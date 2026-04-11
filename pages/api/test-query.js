import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const query = req.query.q || 'DDR4 64GB';
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=10&rt=nc&LH_BIN=1&_pgn=1`;

  try {
    const r = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(r.data);
    const listings = [];
    $('li.s-card').each((i, el) => {
      if (i >= 15) return false;
      const title = $(el).find('.s-card__title').first().text().trim();
      const price = $(el).find('.s-card__price').first().text().trim();
      if (title && title !== 'Shop on eBay') {
        listings.push({ title: title.substring(0, 100), price });
      }
    });

    res.status(200).json({ query, url, count: listings.length, listings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
