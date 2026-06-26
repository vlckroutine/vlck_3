const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

let client = null;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, {
    realtime: { transport: ws },
  });
  return client;
}

module.exports = { getSupabase };
