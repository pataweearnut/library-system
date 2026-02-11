import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { LocalStorageService } from './local-storage.service';

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  const mockFile = {
    buffer: Buffer.from('data'),
    originalname: 'cover.png',
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStorageService],
    }).compile();

    service = module.get(LocalStorageService);
    (mkdirSync as jest.Mock).mockClear();
    (writeFileSync as jest.Mock).mockClear();
  });

  it('returns null when file is falsy', async () => {
    // @ts-expect-error testing undefined input
    const result = await service.upload(undefined);
    expect(result).toBeNull();
    expect(mkdirSync).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('writes file to uploads directory and returns relative path', async () => {
    const result = await service.upload(mockFile);

    const expectedDir = join(process.cwd(), 'uploads');
    expect(mkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true });
    expect(writeFileSync).toHaveBeenCalled();
    expect(result).toMatch(/^uploads\//);
    expect(result).toContain('cover.png');
  });
});
