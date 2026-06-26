async function embedText(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  const data = await res.json();
  return data.data[0].embedding;
}

async function searchSimilar(supabase, embedding, topK = 5) {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_count: topK,
  });
  if (error) throw error;
  return data;
}

module.exports = { embedText, searchSimilar };
