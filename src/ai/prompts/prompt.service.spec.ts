import { PromptService } from './prompt.service';
import { PromptRepository } from './prompt.repository';

describe('PromptService', () => {
  let promptService: PromptService;
  let mockPromptRepo: Partial<PromptRepository>;

  beforeEach(() => {
    mockPromptRepo = {
      findActive: jest.fn().mockResolvedValue(null),
      findByVersion: jest.fn().mockResolvedValue(null),
    };
    promptService = new PromptService(mockPromptRepo as PromptRepository);
  });

  it('should return fallback system prompt when no custom prompt is in DB', async () => {
    const template = await promptService.getTemplate('ai-travel-planner', 'rag-qa');
    expect(template.systemPrompt).toContain('You are an accurate, citation-conscious assistant');
  });

  it('should render placeholders in prompt templates', () => {
    const rawTemplate = 'Hello {{name}}, welcome to {{location}}!\n\n{{extra}}';
    const rendered = promptService.renderPrompt(rawTemplate, {
      name: 'Rishank',
      location: 'Tokyo',
      extra: 'Enjoy your trip.',
    });

    expect(rendered).toContain('Hello Rishank, welcome to Tokyo!');
    expect(rendered).toContain('Enjoy your trip.');
  });
});
