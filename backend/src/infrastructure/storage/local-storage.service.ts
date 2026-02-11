import { Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { StorageProvider } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageProvider {
  private readonly uploadsDir = 'uploads';

  async upload(file: Express.Multer.File): Promise<string | null> {
    if (!file) return null;

    const dest = join(process.cwd(), this.uploadsDir);
    await Promise.resolve(); // allow sync work in async method for interface compliance
    mkdirSync(dest, { recursive: true });

    const filename = `${Date.now()}-${file.originalname}`;
    const fullPath = join(dest, filename);

    writeFileSync(fullPath, file.buffer);

    return `${this.uploadsDir}/${filename}`;
  }
}
