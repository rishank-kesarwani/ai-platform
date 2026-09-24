export const QUEUES = {
  RAG_INGESTION: 'rag-ingestion',
  EMBEDDING: 'embedding',
  MEMORY: 'memory',
  AI_GENERATION: 'ai-generation',
  CLEANUP: 'cleanup',
} as const;

export const JOBS = {
  INGEST_DOCUMENT: 'ingest-document',
  DELETE_DOCUMENT: 'delete-document',
  PROCESS_BATCH_EMBEDDINGS: 'process-batch-embeddings',
  EXTRACT_USER_MEMORY: 'extract-user-memory',
  ASYNC_AI_CHAT: 'async-ai-chat',
} as const;

export const HEADERS = {
  CORRELATION_ID: 'x-correlation-id',
  REQUEST_ID: 'x-request-id',
  API_KEY: 'x-api-key',
  APPLICATION_ID: 'x-application-id',
  TENANT_ID: 'x-tenant-id',
  USER_ID: 'x-user-id',
} as const;

export const CACHE_PREFIXES = {
  AI_RESPONSE: 'ai:response',
  RETRIEVAL: 'ai:retrieval',
  USER_MEMORY: 'ai:memory:user',
  CONVERSATION_CONTEXT: 'ai:conversation:context',
  RATE_LIMIT: 'ai:rate_limit',
  LOCK: 'ai:lock',
} as const;

export const VECTOR_STORE_TOKENS = {
  VECTOR_STORE_PROVIDER: 'VECTOR_STORE_PROVIDER',
} as const;
