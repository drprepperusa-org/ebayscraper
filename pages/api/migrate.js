import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Missing env' });

  const sb = createClient(url, key);
  const results = [];

  // Add exclude_keywords column
  try {
    const { error } = await sb.rpc('exec_sql', {
      query: "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS exclude_keywords TEXT[] DEFAULT '{}'"
    });
    if (error) {
      // rpc might not exist, try raw query via postgrest
      // Fallback: directly update a row to test if column exists
      const { data: testData, error: testErr } = await sb.from('products').select('exclude_keywords').limit(1);
      if (testErr && testErr.message.includes('exclude_keywords')) {
        results.push({ column: 'exclude_keywords', status: 'MISSING - run SQL manually' });
      } else {
        results.push({ column: 'exclude_keywords', status: 'EXISTS' });
      }
    } else {
      results.push({ column: 'exclude_keywords', status: 'CREATED' });
    }
  } catch (e) {
    results.push({ column: 'exclude_keywords', status: 'error: ' + e.message });
  }

  // Add min_price column
  try {
    const { data: testData, error: testErr } = await sb.from('products').select('min_price').limit(1);
    if (testErr && testErr.message.includes('min_price')) {
      results.push({ column: 'min_price', status: 'MISSING - run SQL manually' });
    } else {
      results.push({ column: 'min_price', status: 'EXISTS' });
    }
  } catch (e) {
    results.push({ column: 'min_price', status: 'error: ' + e.message });
  }

  // Test saving exclude_keywords
  try {
    const { data: products } = await sb.from('products').select('id').limit(1);
    if (products && products.length > 0) {
      const { error } = await sb.from('products').update({ exclude_keywords: ['__test__'] }).eq('id', products[0].id);
      if (error) {
        results.push({ test_save: 'FAILED: ' + error.message });
      } else {
        // Revert
        await sb.from('products').update({ exclude_keywords: [] }).eq('id', products[0].id);
        results.push({ test_save: 'SUCCESS' });
      }
    }
  } catch (e) {
    results.push({ test_save: 'error: ' + e.message });
  }

  res.status(200).json({ results });
}
