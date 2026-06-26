const http = require('http');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const UPLOADS = path.join(ROOT, 'uploads');

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

function buildSystemPrompt() {
  const files = fs.readdirSync(UPLOADS).filter(f => f.endsWith('.md'));
  const kb = files.map(f => {
    const content = fs.readFileSync(path.join(UPLOADS, f), 'utf-8');
    return `=== ${f} ===\n${content}`;
  }).join('\n\n');

  return `당신은 VLCK Marketing Agency의 AI 상담 어시스턴트입니다. 이름은 "VLCK 봇"입니다.
아래 지식베이스를 참고하여 방문자의 질문에 답하세요.

[지식베이스]
${kb}

[답변 규칙]
1. 자기소개·대화형 질문("이름이 뭐야", "뭘 도와줄 수 있어" 등): 챗봇 이름과 역할을 자연스럽게 소개하세요.
2. 서비스·정책 질문: 지식베이스 내용만 사용하세요. 정보가 없으면 무료 상담(contact@vlck.co.kr / 카카오톡 @VLCK)을 안내하세요.
3. 서비스와 무관한 질문(날씨, 시사 등): "저는 VLCK 서비스 관련 질문만 답할 수 있어요 😊"라고 안내하세요.
4. 지식베이스에 없는 구체적 정보(가격, 일정 등)는 절대 창작하지 마세요.
5. 친근하고 전문적인 어조를 사용하세요. 답변은 간결하게 유지하세요.`;
}

const SYSTEM_PROMPT = buildSystemPrompt();

async function handleChat(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { messages } = JSON.parse(body);

      if (!Array.isArray(messages)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '잘못된 요청입니다.' }));
        return;
      }

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
          max_completion_tokens: 600,
          temperature: 0.7,
        }),
      });

      if (!openaiRes.ok) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '응답을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.' }));
        return;
      }

      const data = await openaiRes.json();
      const reply = data.choices[0].message.content;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '서버 오류가 발생했습니다.' }));
    }
  });
}

const server = http.createServer((req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    handleChat(req, res);
    return;
  }

  // Static file serving
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  // Prevent path traversal
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`✅ VLCK chatbot server running → http://localhost:${PORT}`);
});
