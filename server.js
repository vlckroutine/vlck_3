const http = require('http');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const { getSupabase } = require('./lib/supabase');
const { embedText, searchSimilar } = require('./lib/rag');
const { buildFallbackPrompt, buildRagPrompt } = require('./lib/knowledge');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
};

async function getSystemPrompt(question) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const embedding = await embedText(question);
      const chunks = await searchSimilar(supabase, embedding, 5);
      if (chunks && chunks.length > 0) return buildRagPrompt(chunks);
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
    });
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function handleChat(req, res) {
  const { messages } = await readBody(req);
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(res, 400, { error: '잘못된 요청입니다.' });
  }

  const lastQuestion = messages[messages.length - 1]?.content ?? '';
  const systemPrompt = await getSystemPrompt(lastQuestion);

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

  if (!openaiRes.ok) return json(res, 502, { error: '응답을 불러올 수 없습니다.' });

  const data = await openaiRes.json();
  const reply = data.choices[0].message.content;

  logChat(lastQuestion, reply);
  json(res, 200, { reply });
}

async function handleLead(req, res) {
  const { name, biz, phone, msg } = await readBody(req);
  if (!name?.trim() || !phone?.trim()) {
    return json(res, 400, { error: '이름과 연락처는 필수입니다.' });
  }

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('leads').insert({ name, biz, phone, msg });
      if (error) throw error;
    }
    json(res, 200, { ok: true });
  } catch {
    json(res, 500, { error: '저장 중 오류가 발생했습니다.' });
  }
}

const server = http.createServer(async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'POST' && req.url === '/api/chat') return await handleChat(req, res);
    if (req.method === 'POST' && req.url === '/api/lead') return await handleLead(req, res);
  } catch {
    return json(res, 500, { error: '서버 오류가 발생했습니다.' });
  }

  // 정적 파일 서빙
  const urlPath = req.url.split('?')[0];
  const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const sb = getSupabase() ? '✅ Supabase 연결됨 (RAG 활성)' : '⚠️  Supabase 미설정 (파일 폴백)';
  console.log(`✅ VLCK server → http://localhost:${PORT}`);
  console.log(sb);
});
