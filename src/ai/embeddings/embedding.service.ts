import { Injectable } from '@nestjs/common';
import { GeminiEmbeddingService } from './gemini-embedding.service';
import { IEmbeddingService } from './embedding.interface';

@Injectable()
export class EmbeddingService implements IEmbeddingService {
  constructor(private readonly geminiEmbeddingService: GeminiEmbeddingService) {}

  getDimension(): number {
    return this.geminiEmbeddingService.getDimension();
  }

  async embedDocument(text: string): Promise<number[]> {
    return this.geminiEmbeddingService.embedDocument(text);
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.geminiEmbeddingService.embedQuery(text);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.geminiEmbeddingService.embedDocuments(texts);
  }
}
