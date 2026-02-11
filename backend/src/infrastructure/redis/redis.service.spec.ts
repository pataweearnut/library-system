import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

const mockRedisClient = {
  get: jest.fn(),
  setex: jest.fn(),
  keys: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});

describe('RedisService', () => {
  let service: RedisService;
  let config: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(null) },
        },
      ],
    }).compile();

    service = module.get(RedisService);
    config = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when REDIS_URL is not set', () => {
    it('get returns null', async () => {
      const result = await service.get('any-key');
      expect(result).toBeNull();
    });

    it('set does not throw', async () => {
      await expect(service.set('key', 'value')).resolves.toBeUndefined();
    });

    it('invalidateBooksCache does not throw', async () => {
      await expect(service.invalidateBooksCache()).resolves.toBeUndefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('does not throw when client is null', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('when REDIS_URL is set', () => {
    beforeEach(async () => {
      (config.get as jest.Mock).mockReturnValue('redis://localhost:6379');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisService,
          {
            provide: ConfigService,
            useValue: config,
          },
        ],
      }).compile();
      service = module.get(RedisService);
    });

    it('get returns value from client', async () => {
      mockRedisClient.get.mockResolvedValue('cached-value');
      const result = await service.get('key');
      expect(result).toBe('cached-value');
    });

    it('get returns null on client error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('network'));
      const result = await service.get('key');
      expect(result).toBeNull();
    });

    it('set calls client setex', async () => {
      mockRedisClient.setex.mockResolvedValue(undefined);
      await service.set('key', 'val', 60);
      expect(mockRedisClient.setex).toHaveBeenCalledWith('key', 60, 'val');
    });

    it('invalidateBooksCache deletes keys', async () => {
      mockRedisClient.keys
        .mockResolvedValueOnce(['books:list:1:10'])
        .mockResolvedValueOnce(['books:search:q:1:10']);
      mockRedisClient.del.mockResolvedValue(undefined);
      await service.invalidateBooksCache();
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('onModuleDestroy calls client.quit', async () => {
      await service.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
