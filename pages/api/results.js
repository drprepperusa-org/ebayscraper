import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) return res.status(200).json({ results: null });

  // Use user token if provided (RLS), otherwise service key
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  let sb;
  let userId = null;

  if (token && anonKey) {
    sb = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await sb.auth.getUser(token);
    userId = user?.id;
  } else if (key) {
    sb = createClient(url, key);
  } else {
    return res.status(200).json({ results: null });
  }

  const all = req.query.all === 'true';

  if (all) {
    let query = sb.from('scrape_results').select('*').order('created_at', { ascending: false }).limit(50);
    if (userId) query = query.or(`user_id.eq.${userId},user_id.is.null`);
    const { data, error } = await query;
    if (error) return res.status(200).json({ history: [] });
    return res.status(200).json({ history: data });
  }

  let query = sb.from('scrape_results').select('*').order('created_at', { ascending: false }).limit(1);
  if (userId) query = query.or(`user_id.eq.${userId},user_id.is.null`);
  const { data, error } = await query.single();

  if (error) return res.status(200).json({ results: null });

  res.status(200).json({
    deals: data.deals,
    scanned: data.scanned,
    results: data.results,
    timestamp: data.created_at,
  });
}
