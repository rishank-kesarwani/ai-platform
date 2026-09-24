import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { IEmbeddingService } from './embedding.interface';

@Injectable()
export class GeminiEmbeddingService implements IEmbeddingService {
  private readonly logger = new Logger(GeminiEmbeddingService.name);
  private embeddingsClient: GoogleGenerativeAIEmbeddings;
  private readonly dimension: number;
  private readonly modelName: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('gemini.apiKey') || '';
    this.modelName =
      this.configService.get<string>('gemini.embeddingModel') || 'text-embedding-004';
    this.dimension =
      this.configService.get<number>('gemini.embeddingDimension') || 768;

    this.embeddingsClient = new GoogleGenerativeAIEmbeddings({
      apiKey: this.apiKey,
      modelName: this.modelName,
    });
  }

  getDimension(): number {
    return this.dimension;
  }

  private handleEmbeddingError(error: any): never {
    const errorMsg = error?.message || 'Unknown error occurred in Gemini Embeddings';
    this.logger.error(`Gemini embedding error: ${errorMsg}`, error?.stack);

    if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit')) {
      throw new HttpException(
        'Gemini Embeddings rate limit exceeded.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (errorMsg.toLowerCase().includes('api key') || errorMsg.toLowerCase().includes('unauthenticated')) {
      throw new HttpException(
        'Gemini API key is invalid or not configured properly.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    throw new BadGatewayException(`Gemini embedding error: ${errorMsg}`);
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      return await this.embeddingsClient.embedQuery(text);
    } catch (error) {
      this.handleEmbeddingError(error);
    }
  }

  async embedDocument(text: string): Promise<number[]> {
    try {
      const results = await this.embedDocuments([text]);
      return results[0];
    } catch (error) {
      this.handleEmbeddingError(error);
    }
  }

  async embedDocuments(texts: string[], batchSize = 20): Promise<number[][]> {
    try {
      if (texts.length === 0) return [];
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const chunk = texts.slice(i, i + batchSize);
        const chunkEmbeddings = await this.embeddingsClient.embedDocuments(chunk);
        results.push(...chunkEmbeddings);
      }

      return results;
    } catch (error) {
      this.handleEmbeddingError(error);
    }
  }
}
