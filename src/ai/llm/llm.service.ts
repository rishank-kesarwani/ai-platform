import { Injectable } from '@nestjs/common';
import { GeminiLLMProvider } from './gemini.service';
import {
  GenerateOptions,
  LLMProvider,
  LLMResponse,
  StructuredGenerateOptions,
} from './llm.interface';

@Injectable()
export class LLMService implements LLMProvider {
  constructor(private readonly geminiProvider: GeminiLLMProvider) {}

  async generate(options: GenerateOptions): Promise<LLMResponse> {
    return this.geminiProvider.generate(options);
  }

  async *stream(options: GenerateOptions): AsyncGenerator<string, void, unknown> {
    yield* this.geminiProvider.stream(options);
  }

  async structuredGenerate<T>(options: StructuredGenerateOptions<T>): Promise<T> {
    return this.geminiProvider.structuredGenerate<T>(options);
  }
}
