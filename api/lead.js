const { getSupabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { name, biz, phone, msg } = req.body || {};
  if (!name?.trim() || !phone?.trim()) {
    res.status(400).json({ error: '이름과 연락처는 필수입니다.' });
    return;
  }

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('leads').insert({ name, biz, phone, msg });
      if (error) throw error;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '저장 중 오류가 발생했습니다.' });
  }
};
