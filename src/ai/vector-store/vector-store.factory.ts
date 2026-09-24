import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VectorStore } from './vector-store.interface';
import { QdrantVectorStoreService } from './qdrant-vector-store.service';

@Injectable()
export class VectorStoreFactory {
  constructor(
    private readonly qdrantVectorStore: QdrantVectorStoreService,
    private readonly configService: ConfigService,
  ) {}

  getVectorStore(providerName?: string): VectorStore {
    const provider = providerName || 'qdrant';
    switch (provider.toLowerCase()) {
      case 'qdrant':
        return this.qdrantVectorStore;
      default:
        return this.qdrantVectorStore;
    }
  }
}
