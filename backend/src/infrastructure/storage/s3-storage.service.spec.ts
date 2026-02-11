import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { S3StorageService } from './s3-storage.service';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue(undefined),
  })),
  PutObjectCommand: jest.fn(),
}));

describe('S3StorageService', () => {
  let service: S3StorageService;

  const mockFile = {
    buffer: Buffer.from('x'),
    mimetype: 'image/png',
    originalname: 'cover.png',
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AWS_REGION') return null;
              if (key === 'AWS_S3_BUCKET') return null;
              if (key === 'AWS_ACCESS_KEY_ID') return undefined;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(S3StorageService);
  });

  it('returns null when S3 is not configured', async () => {
    const result = await service.upload(mockFile);
    expect(result).toBeNull();
  });

  describe('when S3 is configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3StorageService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'AWS_REGION') return 'us-east-1';
                if (key === 'AWS_S3_BUCKET') return 'my-bucket';
                if (key === 'AWS_ACCESS_KEY_ID') return undefined;
                return undefined;
              }),
            },
          },
        ],
      }).compile();
      service = module.get(S3StorageService);
    });

    it('uploads file and returns URL', async () => {
      const result = await service.upload(mockFile);
      expect(result).toMatch(
        /^https:\/\/my-bucket\.s3\.us-east-1\.amazonaws\.com\/books\/covers\//,
      );
    });

    it('uses .jpg when originalname has no extension', async () => {
      const result = await service.upload({
        ...mockFile,
        originalname: 'cover',
      } as Express.Multer.File);
      expect(result).toBeTruthy();
    });
  });
});

