-- ① pgvector 확장
create extension if not exists vector;

-- ② 지식베이스 청크
create table if not exists documents (
  id          bigserial primary key,
  source      text    not null,
  chunk_index integer not null,
  content     text    not null,
  embedding   vector(1536),
  created_at  timestamptz default now()
);

create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ③ 유사도 검색 함수
create or replace function match_documents(
  query_embedding vector(1536),
  match_count     int default 5
)
returns table (
  id         bigint,
  source     text,
  content    text,
  similarity float
)
language plpgsql as $$
begin
  return query
  select
    d.id,
    d.source,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ④ 상담 리드
create table if not exists leads (
  id         bigserial primary key,
  name       text not null,
  biz        text,
  phone      text not null,
  msg        text,
  created_at timestamptz default now()
);

-- ⑤ 대화 로그
create table if not exists chat_logs (
  id         bigserial primary key,
  question   text not null,
  answer     text not null,
  created_at timestamptz default now()
);
