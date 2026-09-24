export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  logLevel: string;
  auth: {
    serviceApiKeys: string[];
  };
  mongodb: {
    uri: string;
  };
  redis: {
    url: string;
  };
  qdrant: {
    url: string;
    apiKey?: string;
    collection: string;
  };
  gemini: {
    apiKey: string;
    model: string;
    embeddingModel: string;
    embeddingDimension: number;
  };
  rag: {
    chunkSize: number;
    chunkOverlap: number;
    topK: number;
    minScore: number;
  };
  cache: {
    enabled: boolean;
    ttlSeconds: number;
  };
  throttler: {
    ttl: number;
    limit: number;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  logLevel: process.env.LOG_LEVEL || 'info',
  auth: {
    serviceApiKeys: (process.env.AI_SERVICE_API_KEY || 'test-service-api-key-12345')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://root:rootpassword@localhost:27017/ai_platform?authSource=admin',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined,
    collection: process.env.QDRANT_COLLECTION || 'ai_platform_documents',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || '768', 10),
  },
  rag: {
    chunkSize: parseInt(process.env.RAG_CHUNK_SIZE || '800', 10),
    chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP || '150', 10),
    topK: parseInt(process.env.RAG_TOP_K || '5', 10),
    minScore: parseFloat(process.env.RAG_MIN_SCORE || '0.5'),
  },
  cache: {
    enabled: process.env.AI_CACHE_ENABLED === 'true' || process.env.AI_CACHE_ENABLED === undefined,
    ttlSeconds: parseInt(process.env.AI_CACHE_TTL_SECONDS || '300', 10),
  },
  throttler: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '120', 10),
  },
});
