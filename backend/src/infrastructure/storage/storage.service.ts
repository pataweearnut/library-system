import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

@Injectable()
export class StorageService {
  constructor(
    private readonly config: ConfigService,
    private readonly local: LocalStorageService,
    private readonly s3: S3StorageService,
  ) {}

  async upload(file: Express.Multer.File): Promise<string | null> {
    const useS3 =
      !!this.config.get('AWS_REGION') && !!this.config.get('AWS_S3_BUCKET');

    return useS3 ? this.s3.upload(file) : this.local.upload(file);
  }
}
