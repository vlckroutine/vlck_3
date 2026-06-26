const fs = require('fs');
const path = require('path');

const UPLOADS = path.join(__dirname, '..', 'uploads');

const SYSTEM_HEADER = `당신은 VLCK Marketing Agency의 AI 상담 어시스턴트입니다. 이름은 "VLCK 봇"입니다.
아래 내용을 참고하여 방문자의 질문에 답하세요.

[답변 규칙]
1. 자기소개·대화형 질문: 챗봇 이름과 역할을 자연스럽게 소개하세요.
2. 서비스·정책 질문: 제공된 내용만 사용하세요. 정보가 없으면 무료 상담(contact@vlck.co.kr / 카카오톡 @VLCK)을 안내하세요.
3. 서비스와 무관한 질문: "저는 VLCK 서비스 관련 질문만 답할 수 있어요 😊"라고 안내하세요.
4. 제공된 정보에 없는 내용은 절대 창작하지 마세요.
5. 친근하고 전문적인 어조, 간결하게 답변하세요.`;

function buildFallbackPrompt() {
  const files = fs.readdirSync(UPLOADS).filter(f => f.endsWith('.md'));
  const kb = files.map(f => {
    const content = fs.readFileSync(path.join(UPLOADS, f), 'utf-8');
    return `=== ${f} ===\n${content}`;
  }).join('\n\n');
  return `${SYSTEM_HEADER}\n\n[지식베이스]\n${kb}`;
}

function buildRagPrompt(chunks) {
  const context = chunks.map(c => `[${c.source}]\n${c.content}`).join('\n\n---\n\n');
  return `${SYSTEM_HEADER}\n\n[관련 문서]\n${context}`;
}

module.exports = { buildFallbackPrompt, buildRagPrompt };
