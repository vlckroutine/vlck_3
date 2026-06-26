const fs = require('fs');
const path = require('path');

let cachedPrompt = null;

function buildSystemPrompt() {
  if (cachedPrompt) return cachedPrompt;

  const uploadsDir = path.join(process.cwd(), 'uploads');
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.md'));
  const kb = files.map(f => {
    const content = fs.readFileSync(path.join(uploadsDir, f), 'utf-8');
    return `=== ${f} ===\n${content}`;
  }).join('\n\n');

  cachedPrompt = `당신은 VLCK Marketing Agency의 AI 상담 어시스턴트입니다. 이름은 "VLCK 봇"입니다.
아래 지식베이스를 참고하여 방문자의 질문에 답하세요.

[지식베이스]
${kb}

[답변 규칙]
1. 자기소개·대화형 질문("이름이 뭐야", "뭘 도와줄 수 있어" 등): 챗봇 이름과 역할을 자연스럽게 소개하세요.
2. 서비스·정책 질문: 지식베이스 내용만 사용하세요. 정보가 없으면 무료 상담(contact@vlck.co.kr / 카카오톡 @VLCK)을 안내하세요.
3. 서비스와 무관한 질문(날씨, 시사 등): "저는 VLCK 서비스 관련 질문만 답할 수 있어요 😊"라고 안내하세요.
4. 지식베이스에 없는 구체적 정보(가격, 일정 등)는 절대 창작하지 마세요.
5. 친근하고 전문적인 어조를 사용하세요. 답변은 간결하게 유지하세요.`;

  return cachedPrompt;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { messages } = req.body || {};

  if (!Array.isArray(messages)) {
    res.status(400).json({ error: '잘못된 요청입니다.' });
    return;
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
        max_completion_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      res.status(502).json({ error: '응답을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.' });
      return;
    }

    const data = await openaiRes.json();
    res.status(200).json({ reply: data.choices[0].message.content });
  } catch {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
