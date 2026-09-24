export interface ServiceAuthContext {
  authenticated: boolean;
  apiKey: string;
}

export interface SecurityContext {
  applicationId: string;
  tenantId: string;
  userId?: string;
  requestId: string;
}

export interface Citation {
  documentId: string;
  source: string;
  chunkId: string;
  score: number;
  snippet?: string;
  documentType?: string;
  title?: string;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatResponseDto {
  requestId: string;
  conversationId: string;
  answer: string;
  citations: Citation[];
  usage: TokenUsage;
  model: string;
  latencyMs: number;
  cached?: boolean;
}

export interface StreamEventPayload {
  event: 'token' | 'status' | 'retrieval' | 'tool_call' | 'tool_result' | 'citation' | 'done' | 'error';
  data: Record<string, unknown> | string;
}

export interface RagIngestionJobData {
  applicationId: string;
  tenantId: string;
  userId?: string;
  documentId: string;
  documentVersion: number;
  documentType: string;
  source: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  visibility: 'public' | 'tenant' | 'user';
}

export interface MemoryExtractionJobData {
  applicationId: string;
  tenantId: string;
  userId: string;
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
}
