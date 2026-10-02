import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceAuthService } from './service-auth.service';

describe('ServiceAuthService', () => {
  let service: ServiceAuthService;

  const mockConfig = {
    'auth.serviceApiKeys': {
      travel: 'travel-secret-key-123',
      movie: 'movie-secret-key-456',
      sports: 'sports-secret-key-789',
      study: 'study-secret-key-abc',
      resume: 'resume-secret-key-def',
      finance: 'finance-secret-key-ghi',
    },
    'auth.fallbackApiKeys': ['legacy-fallback-key-xyz'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<ServiceAuthService>(ServiceAuthService);
  });

  it('should accept travel application API key', () => {
    const result = service.validateKey('travel-secret-key-123');
    expect(result.isValid).toBe(true);
    expect(result.service).toBe('travel');
  });

  it('should accept movie application API key', () => {
    const result = service.validateKey('movie-secret-key-456');
    expect(result.isValid).toBe(true);
    expect(result.service).toBe('movie');
  });

  it('should accept sports application API key', () => {
    const result = service.validateKey('sports-secret-key-789');
    expect(result.isValid).toBe(true);
    expect(result.service).toBe('sports');
  });

  it('should accept study application API key', () => {
    const result = service.validateKey('study-secret-key-abc');
    expect(result.isValid).toBe(true);
    expect(result.service).toBe('study');
  });

  it('should accept dynamic resume application API key from AI_PLATFORM_RESUME_API_KEY', () => {
    const result = service.validateKey('resume-secret-key-def');
    expect(result.isValid).toBe(true);
    expect(result.service).toBe('resume');
  });

  it('should accept dynamic finance application API key from AI_PLATFORM_FINANCE_API_KEY', () => {
    const result = service.validateKey('finance-secret-key-ghi');
    expect(result.isValid).toBe(true);
    expect(result.service).toBe('finance');
  });

  it('should accept legacy fallback API key during migration', () => {
    const result = service.validateKey('legacy-fallback-key-xyz');
    expect(result.isValid).toBe(true);
    expect(result.service).toBe('legacy-fallback');
  });

  it('should reject invalid API key', () => {
    const result = service.validateKey('invalid-random-key');
    expect(result.isValid).toBe(false);
    expect(result.service).toBeUndefined();
  });

  it('should reject empty or whitespace API key', () => {
    expect(service.validateKey('').isValid).toBe(false);
    expect(service.validateKey('   ').isValid).toBe(false);
    expect(service.validateKey(null as any).isValid).toBe(false);
    expect(service.validateKey(undefined as any).isValid).toBe(false);
  });
});
