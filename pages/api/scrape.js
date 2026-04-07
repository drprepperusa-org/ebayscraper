const { scrapeAndNotify, DEFAULT_PRODUCTS, DEFAULT_EXCLUDE_KEYWORDS, DEFAULT_CONDITIONS } = require('../../scraper');
const { verifyAuth } = require('../../lib/auth');

export default async function handler(req, res) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return res.status(401).json({ success: false, error: 'Unauthorized: ' + auth.error });
  }

  if (req.method === 'GET') {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const result = await scrapeAndNotify();
      return res.status(200).json({ success: true, timestamp: new Date().toISOString(), ...result });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const options = {
      products: body.products || DEFAULT_PRODUCTS,
      conditions: body.conditions || DEFAULT_CONDITIONS,
      excludeKeywords: body.excludeKeywords || DEFAULT_EXCLUDE_KEYWORDS,
      maxPages: body.maxPages || 50,
      sendToSheets: body.sendToSheets !== false,
      sendToDiscord: body.sendToDiscord !== false,
    };

    try {
      const result = await scrapeAndNotify(options);
      return res.status(200).json({ success: true, timestamp: new Date().toISOString(), ...result });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
