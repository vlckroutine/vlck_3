const { getSupabase } = require('../lib/supabase');
const { embedText, searchSimilar } = require('../lib/rag');
const { buildFallbackPrompt, buildRagPrompt } = require('../lib/knowledge');

async function getSystemPrompt(question) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const embedding = await embedText(question);
      const chunks = await searchSimilar(supabase, embedding, 5);
      if (chunks && chunks.length > 0) {
        return buildRagPrompt(chunks);
      }
    }
  } catch {}
  return buildFallbackPrompt();
}

async function logChat(question, answer) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('chat_logs').insert({ question, answer });
  } catch {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: '잘못된 요청입니다.' });
    return;
  }

  const lastQuestion = messages[messages.length - 1]?.content ?? '';
  const systemPrompt = await getSystemPrompt(lastQuestion);

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_completion_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      res.status(502).json({ error: '응답을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.' });
      return;
    }

    const data = await openaiRes.json();
    const reply = data.choices[0].message.content;

    logChat(lastQuestion, reply); // best-effort, await 생략

    res.status(200).json({ reply });
  } catch {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
