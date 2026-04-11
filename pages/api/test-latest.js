import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Missing env' });

  const sb = createClient(url, key);
  const { data } = await sb
    .from('scrape_results')
    .select('*')
    .eq('user_id', '2cf678cc-72ae-41a2-8242-9a0069917c96')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return res.status(200).json({ error: 'no data' });

  // Group by searchQuery
  const grouped = {};
  (data.results || []).forEach(d => {
    const key = d.searchQuery || 'unknown';
    if (!grouped[key]) grouped[key] = 0;
    grouped[key]++;
  });

  res.status(200).json({
    timestamp: data.created_at,
    deals: data.deals,
    scanned: data.scanned,
    byQuery: grouped,
    totalQueries: Object.keys(grouped).length,
  });
}
