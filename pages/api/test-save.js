import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Missing env vars', hasUrl: !!url, hasKey: !!key });
  }

  const sb = createClient(url, key);

  // Try inserting a test row
  const { data, error } = await sb.from('scrape_results').insert({
    deals: 1,
    scanned: 10,
    results: [{ capacity: '32GB', title: 'Test Deal', price: '50.00', stickCount: 1, perStickCost: '50.00', condition: 'Used', seller: 'test', link: 'https://ebay.com', timestamp: new Date().toISOString(), alertedAt: new Date().toISOString() }],
  }).select();

  if (error) {
    return res.status(500).json({ error: error.message, code: error.code, details: error.details });
  }

  res.status(200).json({ success: true, inserted: data });
}
