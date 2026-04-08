import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Missing env', hasUrl: !!url, hasKey: !!key });

  const sb = createClient(url, key);

  // Check if table exists
  const { data, error } = await sb.from('user_settings').select('*').limit(1);

  if (error) {
    return res.status(500).json({
      error: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details,
      tableExists: false
    });
  }

  res.status(200).json({ tableExists: true, rows: data?.length || 0, sample: data });
}
