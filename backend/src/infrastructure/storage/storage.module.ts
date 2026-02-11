import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule],
  providers: [LocalStorageService, S3StorageService, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
