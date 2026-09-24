export interface VectorDocument {
  id: string; // Deterministic string ID (e.g. UUIDv5 or valid UUID)
  vector: number[];
  payload: {
    chunkId: string;
    documentId: string;
    documentVersion: number;
    chunkIndex: number;
    applicationId: string;
    tenantId: string;
    userId?: string;
    documentType: string;
    source: string;
    title?: string;
    text: string;
    visibility: 'public' | 'tenant' | 'user';
    metadata?: Record<string, any>;
  };
}

export interface VectorFilter {
  applicationId: string;
  tenantId: string;
  userId?: string;
  documentType?: string;
  visibility?: ('public' | 'tenant' | 'user')[];
  additionalFilter?: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  payload: VectorDocument['payload'];
}

export interface VectorStore {
  upsertDocuments(documents: VectorDocument[]): Promise<void>;
  deleteDocuments(ids: string[]): Promise<void>;
  similaritySearch(queryVector: number[], limit: number): Promise<VectorSearchResult[]>;
  similaritySearchWithFilter(
    queryVector: number[],
    filter: VectorFilter,
    limit: number,
    minScore?: number,
  ): Promise<VectorSearchResult[]>;
  deleteByDocumentId(
    documentId: string,
    applicationId: string,
    tenantId: string,
  ): Promise<void>;
  deleteByVersion(
    documentId: string,
    version: number,
    applicationId: string,
    tenantId: string,
  ): Promise<void>;
  ping(): Promise<boolean>;
}
