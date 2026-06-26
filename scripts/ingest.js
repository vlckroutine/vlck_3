require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getSupabase } = require('../lib/supabase');
const { embedText } = require('../lib/rag');

const UPLOADS = path.join(__dirname, '..', 'uploads');
const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 80;

function chunkText(text) {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > CHUNK_SIZE && current) {
      chunks.push(current.trim());
      // overlap: keep last portion of current
      current = current.slice(-CHUNK_OVERLAP) + '\n\n' + para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function ingest() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_KEY 환경변수가 없습니다.');
    process.exit(1);
  }

  const files = fs.readdirSync(UPLOADS).filter(f => f.endsWith('.md'));
  console.log(`📂 ${files.length}개 파일 처리 시작\n`);

  for (const file of files) {
    console.log(`▶ ${file}`);
    const text = fs.readFileSync(path.join(UPLOADS, file), 'utf-8');
    const chunks = chunkText(text);

    // 기존 문서 삭제 후 재적재
    await supabase.from('documents').delete().eq('source', file);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);
      const { error } = await supabase.from('documents').insert({
        source: file,
        chunk_index: i,
        content: chunks[i],
        embedding,
      });
      if (error) {
        console.error(`  ❌ 청크 ${i} 저장 실패:`, error.message);
      } else {
        process.stdout.write(`  ✓ 청크 ${i + 1}/${chunks.length}\r`);
      }
    }
    console.log(`  ✅ ${chunks.length}개 청크 완료`);
  }

  console.log('\n🎉 인제스트 완료');
}

ingest().catch(e => { console.error(e); process.exit(1); });
