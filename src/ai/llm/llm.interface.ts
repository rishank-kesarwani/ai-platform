import { BaseMessage } from '@langchain/core/messages';
import { TokenUsage } from '../../common/types';

export interface GenerateOptions {
  prompt: string;
  systemInstruction?: string;
  messages?: BaseMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
  tools?: any[];
}

export interface LLMResponse {
  content: string;
  usage?: TokenUsage;
  model: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
}

export interface StructuredGenerateOptions<T> extends GenerateOptions {
  schemaDescription: string;
  jsonSchema?: Record<string, any>;
}

export interface LLMProvider {
  generate(options: GenerateOptions): Promise<LLMResponse>;
  stream(options: GenerateOptions): AsyncGenerator<string, void, unknown>;
  structuredGenerate<T>(options: StructuredGenerateOptions<T>): Promise<T>;
}
