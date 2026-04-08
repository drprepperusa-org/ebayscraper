import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Missing env' });

  const sb = createClient(url, key);

  // Try saving with discord_webhook to see if column exists
  const { error } = await sb.from('user_settings').upsert({
    id: '2cf678cc-72ae-41a2-8242-9a0069917c96',
    exclude_keywords: ['test-keyword'],
    conditions: ['new', 'used'],
    discord_webhook: 'https://test.com',
    max_pages: 10,
    send_to_sheets: true,
    send_to_discord: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (error) {
    return res.status(500).json({ error: error.message, code: error.code, details: error.details, hint: error.hint });
  }

  // Read it back
  const { data } = await sb.from('user_settings').select('*').eq('id', '2cf678cc-72ae-41a2-8242-9a0069917c96').single();
  res.status(200).json({ success: true, settings: data });
}
