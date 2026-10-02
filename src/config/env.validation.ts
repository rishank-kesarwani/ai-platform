import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';

  @IsString()
  @IsOptional()
  AI_PLATFORM_TRAVEL_API_KEY?: string;

  @IsString()
  @IsOptional()
  AI_PLATFORM_MOVIE_API_KEY?: string;

  @IsString()
  @IsOptional()
  AI_PLATFORM_SPORTS_API_KEY?: string;

  @IsString()
  @IsOptional()
  AI_PLATFORM_STUDY_API_KEY?: string;

  @IsString()
  @IsOptional()
  AI_SERVICE_API_KEY?: string;

  @IsString()
  @IsOptional()
  MONGODB_URI: string = 'mongodb://root:rootpassword@localhost:27017/ai_platform?authSource=admin';

  @IsString()
  @IsOptional()
  REDIS_URL: string = 'redis://localhost:6379';

  @IsString()
  @IsOptional()
  QDRANT_URL: string = 'http://localhost:6333';

  @IsString()
  @IsOptional()
  QDRANT_API_KEY?: string;

  @IsString()
  @IsOptional()
  QDRANT_COLLECTION: string = 'ai_platform_documents';

  @IsString()
  @IsOptional()
  GEMINI_API_KEY: string = '';

  @IsString()
  @IsOptional()
  GEMINI_MODEL: string = 'gemini-1.5-flash';

  @IsString()
  @IsOptional()
  GEMINI_EMBEDDING_MODEL: string = 'text-embedding-004';

  @IsNumber()
  @IsOptional()
  EMBEDDING_DIMENSION: number = 768;

  @IsNumber()
  @IsOptional()
  RAG_CHUNK_SIZE: number = 800;

  @IsNumber()
  @IsOptional()
  RAG_CHUNK_OVERLAP: number = 150;

  @IsNumber()
  @IsOptional()
  RAG_TOP_K: number = 5;

  @IsNumber()
  @IsOptional()
  RAG_MIN_SCORE: number = 0.5;

  @IsBoolean()
  @IsOptional()
  AI_CACHE_ENABLED: boolean = true;

  @IsNumber()
  @IsOptional()
  AI_CACHE_TTL_SECONDS: number = 300;

  @IsNumber()
  @IsOptional()
  THROTTLE_TTL: number = 60000;

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT: number = 120;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }

  // Production check: Fail fast if no valid service authentication keys are configured
  if (validatedConfig.NODE_ENV === Environment.Production) {
    const hasAnyAppKey = Object.entries(config).some(([key, val]) => {
      return (
        /^AI_PLATFORM_([A-Z0-9_]+)_API_KEY$/i.test(key) &&
        typeof val === 'string' &&
        val.trim().length > 0
      );
    });

    const hasFallbackKey = Boolean(
      validatedConfig.AI_SERVICE_API_KEY && validatedConfig.AI_SERVICE_API_KEY.trim()
    );

    if (!hasAnyAppKey && !hasFallbackKey) {
      throw new Error(
        'Production configuration error: No valid service authentication keys configured. Set at least one AI_PLATFORM_<APP>_API_KEY or AI_SERVICE_API_KEY.',
      );
    }
  }

  return validatedConfig;
}

