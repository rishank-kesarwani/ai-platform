import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from '@langchain/core/messages';
import {
  GenerateOptions,
  LLMProvider,
  LLMResponse,
  StructuredGenerateOptions,
} from './llm.interface';

@Injectable()
export class GeminiLLMProvider implements LLMProvider {
  private readonly logger = new Logger(GeminiLLMProvider.name);
  private readonly defaultModel: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('gemini.apiKey') || '';
    this.defaultModel =
      this.configService.get<string>('gemini.model') || 'gemini-1.5-flash';
  }

  private getModelInstance(options: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    streaming?: boolean;
  }): ChatGoogleGenerativeAI {
    return new ChatGoogleGenerativeAI({
      apiKey: this.apiKey,
      modelName: options.model || this.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      streaming: options.streaming ?? false,
    });
  }

  private buildMessages(options: GenerateOptions): BaseMessage[] {
    const messages: BaseMessage[] = [];
    if (options.systemInstruction) {
      messages.push(new SystemMessage(options.systemInstruction));
    }
    if (options.messages && options.messages.length > 0) {
      messages.push(...options.messages);
    } else if (options.prompt) {
      messages.push(new HumanMessage(options.prompt));
    }
    return messages;
  }

  private handleGeminiError(error: any): never {
    const errorMsg = error?.message || 'Unknown error occurred in Gemini provider';
    this.logger.error(`Gemini provider error: ${errorMsg}`, error?.stack);

    if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit')) {
      throw new HttpException(
        'Gemini rate limit exceeded. Please retry with exponential backoff.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (errorMsg.toLowerCase().includes('timeout') || errorMsg.toLowerCase().includes('deadline')) {
      throw new GatewayTimeoutException('Gemini service request timed out.');
    }
    if (errorMsg.toLowerCase().includes('api key') || errorMsg.toLowerCase().includes('unauthenticated')) {
      throw new HttpException(
        'Gemini API key is invalid or not configured properly.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    throw new BadGatewayException(`Gemini provider error: ${errorMsg}`);
  }

  async generate(options: GenerateOptions): Promise<LLMResponse> {
    try {
      const model = this.getModelInstance({
        model: options.model,
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
      });

      const messages = this.buildMessages(options);
      const response = await model.invoke(messages);

      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const usageMetadata = (response as any).usage_metadata;

      return {
        content,
        model: options.model || this.defaultModel,
        usage: {
          promptTokens: usageMetadata?.input_tokens,
          completionTokens: usageMetadata?.output_tokens,
          totalTokens: usageMetadata?.total_tokens,
        },
      };
    } catch (error) {
      this.handleGeminiError(error);
    }
  }

  async *stream(options: GenerateOptions): AsyncGenerator<string, void, unknown> {
    try {
      const model = this.getModelInstance({
        model: options.model,
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
        streaming: true,
      });

      const messages = this.buildMessages(options);
      const responseStream = await model.stream(messages);

      for await (const chunk of responseStream) {
        const text =
          typeof chunk.content === 'string'
            ? chunk.content
            : JSON.stringify(chunk.content);
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.handleGeminiError(error);
    }
  }

  async structuredGenerate<T>(options: StructuredGenerateOptions<T>): Promise<T> {
    try {
      const promptWithSchema = `
${options.prompt}

You must return valid JSON matching the following schema description:
${options.schemaDescription}

Return ONLY raw JSON. Do not include markdown code block backticks, notes or additional prose.
`;

      const response = await this.generate({
        ...options,
        prompt: promptWithSchema,
        temperature: options.temperature ?? 0.1,
      });

      let cleanedContent = response.content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      try {
        return JSON.parse(cleanedContent) as T;
      } catch (parseErr: any) {
        this.logger.error(`Failed to parse structured JSON: ${cleanedContent}`);
        throw new BadGatewayException(
          `Malformed structured output returned by LLM: ${parseErr.message}`,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.handleGeminiError(error);
    }
  }
}
