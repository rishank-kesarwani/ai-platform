import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiLLMProvider } from './gemini.service';

describe('GeminiLLMProvider', () => {
  let provider: GeminiLLMProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiLLMProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'gemini.apiKey') return 'mock-key';
              if (key === 'gemini.model') return 'gemini-1.5-flash';
              return null;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<GeminiLLMProvider>(GeminiLLMProvider);
  });

  it('should initialize with config without errors', () => {
    expect(provider).toBeDefined();
  });
});
