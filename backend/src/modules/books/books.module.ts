import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './book.entity';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { LoggerModule } from '../../common/logger/logger.module';
import { SingleFileUploadInterceptor } from '../../common/interceptors/single-file-upload.interceptor';
import { StorageModule } from '../../infrastructure/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Book]), LoggerModule, StorageModule],
  providers: [BooksService, SingleFileUploadInterceptor],
  controllers: [BooksController],
  exports: [BooksService],
})
export class BooksModule {}
