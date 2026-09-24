import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserMemoryService } from './user-memory.service';
import { UserMemory } from '../../database/schemas/user-memory.schema';

describe('UserMemoryService', () => {
  let service: UserMemoryService;
  let mockModel: any;

  beforeEach(async () => {
    mockModel = {
      findOneAndUpdate: jest.fn().mockImplementation((query, update) => {
        return Promise.resolve({
          ...query,
          ...update.$set,
        });
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              { key: 'diet', value: 'Vegetarian' },
              { key: 'budget', value: 'Mid-range' },
            ]),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserMemoryService,
        { provide: getModelToken(UserMemory.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<UserMemoryService>(UserMemoryService);
  });

  it('should save user preference memory', async () => {
    const memory = await service.saveMemory({
      applicationId: 'ai-travel-planner',
      tenantId: 'tenant-1',
      userId: 'user-1',
      key: 'diet',
      value: 'Vegetarian',
      category: 'preference',
    });

    expect(memory.key).toBe('diet');
    expect(memory.value).toBe('Vegetarian');
    expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
  });

  it('should format memories for prompt insertion', () => {
    const memories: any[] = [
      { key: 'diet', value: 'Vegetarian' },
      { key: 'favorite_city', value: 'Kyoto' },
    ];

    const formatted = service.formatMemoriesForPrompt(memories);
    expect(formatted).toContain('- diet: Vegetarian');
    expect(formatted).toContain('- favorite_city: Kyoto');
  });
});
