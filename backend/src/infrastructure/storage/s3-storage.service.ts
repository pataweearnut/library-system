import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StorageProvider } from './storage.interface';

const COVERS_PREFIX = 'books/covers/';

@Injectable()
export class S3StorageService implements StorageProvider {
  private readonly client: S3Client | null = null;
  private readonly bucket: string | null = null;
  private readonly region: string | null = null;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('AWS_REGION');
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (region && bucket) {
      this.region = region;
      this.bucket = bucket;
      const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
      this.client = new S3Client({
        region,
        ...(accessKeyId &&
          secretAccessKey && {
            credentials: { accessKeyId, secretAccessKey },
          }),
      });
    }
  }

  async upload(file: Express.Multer.File): Promise<string | null> {
    if (!file || !this.client || !this.bucket || !this.region) return null;

    const ext = file.originalname?.includes('.')
      ? file.originalname.slice(file.originalname.lastIndexOf('.'))
      : '.jpg';
    const key = `${COVERS_PREFIX}${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'image/jpeg',
      }),
    );

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
