import { Injectable, Logger } from '@nestjs/common';
import { PromptRepository } from './prompt.repository';
import { PromptTemplate } from '../../database/schemas/prompt.schema';

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);

  // In-memory fallback templates for common patterns
  private readonly defaultTemplates: Map<string, string> = new Map([
    [
      'default-chat',
      `You are a helpful, professional, and reliable AI assistant.
Answer user questions accurately and concisely.

{{userMemory}}

{{retrievedContext}}
`,
    ],
    [
      'rag-qa',
      `You are an accurate, citation-conscious assistant.
Answer the user's question ONLY based on the provided retrieved context snippets when possible.
If the retrieved context does not contain the answer, politely state that you do not have sufficient information in the knowledge base.
Never invent facts or citations.

{{userMemory}}

Context:
{{retrievedContext}}
`,
    ],
    [
      'agent-reasoning',
      `You are a reasoning and task execution agent.
Analyze the user request, plan the necessary steps, decide whether to call available tools, and synthesize a comprehensive final answer.

{{userMemory}}

Context:
{{retrievedContext}}
`,
    ],
  ]);

  constructor(private readonly promptRepository: PromptRepository) {}

  async getTemplate(
    applicationId: string,
    promptName: string,
    version?: number,
  ): Promise<{
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
  }> {
    let promptDoc: PromptTemplate | null = null;

    if (version) {
      promptDoc = await this.promptRepository.findByVersion(
        applicationId,
        promptName,
        version,
      );
    } else {
      promptDoc = await this.promptRepository.findActive(
        applicationId,
        promptName,
      );
    }

    if (promptDoc) {
      return {
        systemPrompt: promptDoc.systemPrompt,
        temperature: promptDoc.temperature,
        maxTokens: promptDoc.maxTokens,
      };
    }

    const fallback =
      this.defaultTemplates.get(promptName) ||
      this.defaultTemplates.get('default-chat')!;

    return {
      systemPrompt: fallback,
      temperature: 0.7,
      maxTokens: 2048,
    };
  }

  renderPrompt(
    template: string,
    variables: Record<string, string | undefined>,
  ): string {
    let rendered = template;
    for (const [key, val] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, val || '');
    }
    // Clean up empty double newlines from empty variable insertions
    return rendered.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  }
}
