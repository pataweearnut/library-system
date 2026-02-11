import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let config: jest.Mocked<ConfigService>;
  let local: jest.Mocked<LocalStorageService>;
  let s3: jest.Mocked<S3StorageService>;

  const mockFile = {
    buffer: Buffer.from('data'),
    mimetype: 'image/png',
    originalname: 'cover.png',
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: LocalStorageService,
          useValue: {
            upload: jest.fn().mockResolvedValue('uploads/local-cover.png'),
          },
        },
        {
          provide: S3StorageService,
          useValue: {
            upload: jest.fn().mockResolvedValue(
              'https://bucket.s3.region.amazonaws.com/books/covers/cover.png',
            ),
          },
        },
      ],
    }).compile();

    service = module.get(StorageService);
    config = module.get(ConfigService) as jest.Mocked<ConfigService>;
    local = module.get(LocalStorageService) as jest.Mocked<LocalStorageService>;
    s3 = module.get(S3StorageService) as jest.Mocked<S3StorageService>;

    jest.clearAllMocks();
  });

  it('uses local storage when AWS config is missing', async () => {
    config.get.mockReturnValue(null);

    const result = await service.upload(mockFile);

    expect(config.get).toHaveBeenCalledWith('AWS_REGION');
    expect(local.upload).toHaveBeenCalledWith(mockFile);
    expect(s3.upload).not.toHaveBeenCalled();
    expect(result).toBe('uploads/local-cover.png');
  });

  it('uses S3 storage when AWS config is present', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'AWS_REGION') return 'us-east-1';
      if (key === 'AWS_S3_BUCKET') return 'my-bucket';
      return null;
    });

    const result = await service.upload(mockFile);

    expect(s3.upload).toHaveBeenCalledWith(mockFile);
    expect(local.upload).not.toHaveBeenCalled();
    expect(result).toBe(
      'https://bucket.s3.region.amazonaws.com/books/covers/cover.png',
    );
  });
});

