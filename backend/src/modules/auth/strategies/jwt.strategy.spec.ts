import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'JWT_SECRET' ? 'test-secret' : undefined,
            ),
          },
        },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('returns user object from payload', async () => {
      const payload = {
        sub: 'user-123',
        email: 'u@example.com',
        role: 'member',
      };
      const result = await strategy.validate(payload);
      expect(result).toEqual({
        userId: 'user-123',
        email: 'u@example.com',
        role: 'member',
      });
    });
  });

  describe('when JWT_SECRET is not set', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      }).compile();
      strategy = module.get(JwtStrategy);
    });

    it('uses dev-secret fallback', async () => {
      const result = await strategy.validate({
        sub: 'id',
        email: 'e@x.com',
        role: 'member',
      });
      expect(result.userId).toBe('id');
    });
  });
});
