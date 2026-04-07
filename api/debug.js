const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  try {
    const url = 'https://www.ebay.com/sch/i.html?_nkw=DDR4+32GB&_sop=15&rt=nc';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Parse first 10 real listings with full detail
    const listings = [];
    let count = 0;
    $('li.s-card').each((i, el) => {
      if (count >= 10) return false;
      const $el = $(el);

      const titleEl = $el.find('.s-card__title, .s-item__title, [role="heading"]').first();
      const rawTitle = titleEl.length ? titleEl.text().trim() : '';
      if (!rawTitle || rawTitle === 'Shop on eBay') return;

      const title = rawTitle.replace(/^New Listing/, '').replace(/Opens in a new window or tab$/i, '').trim();
      count++;

      // Price
      const $priceEl = $el.find('.s-card__price, .s-item__price, [data-test-id="PRICE"]').first();
      const priceText = $priceEl.length ? $priceEl.text().trim() : 'NOT FOUND';
      const priceMatch = priceText.match(/\$([\d,]+\.?\d*)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

      // Condition
      const $condEl = $el.find('.s-card__subtitle, .SECONDARY_INFO, .s-item__subtitle').first();
      const condition = $condEl.length ? $condEl.text().trim() : 'NOT FOUND';

      // Auction check
      const fullText = $el.text().toLowerCase();
      const auctionPatterns = ['starting at', 'auction', 'current bid', 'ends in', 'time left', 'bid now', 'place bid'];
      const matchedAuction = auctionPatterns.filter(p => fullText.includes(p));

      // DDR4
      const hasDDR4 = title.toLowerCase().includes('ddr4');

      // Capacity
      const kitMatch = title.match(/(\d+)\s*x\s*(\d+)\s*GB/i);
      const totalMatch = title.match(/\b(\d+)\s*GB\b/ig);
      let parsedCap = null;
      if (kitMatch) parsedCap = parseInt(kitMatch[1]) * parseInt(kitMatch[2]);
      else if (totalMatch) {
        const vals = totalMatch.map(m => parseInt(m));
        const max = Math.max(...vals);
        if ([32, 64, 128].includes(max)) parsedCap = max;
      }

      listings.push({
        title: title.substring(0, 80),
        priceText,
        price,
        condition,
        hasDDR4,
        parsedCapacity: parsedCap,
        auctionKeywords: matchedAuction,
      });
    });

    res.status(200).json({
      totalCards: $('li.s-card').length,
      parsedListings: listings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
