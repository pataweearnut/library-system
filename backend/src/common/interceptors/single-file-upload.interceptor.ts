import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import multer from 'multer';
import { memoryStorage } from 'multer';
import { Observable } from 'rxjs';
import { StorageService } from '../../infrastructure/storage/storage.service';

@Injectable()
export class SingleFileUploadInterceptor implements NestInterceptor {
  private readonly upload = multer({
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single('cover'); // expects field name \"cover\"

  constructor(private readonly storage: StorageService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    await new Promise<void>((resolve, reject) => {
      this.upload(request, response, (err: unknown) =>
        err ? reject(err) : resolve(),
      );
    });

    if (request.file) {
      // BooksController expects request.coverUrlOrPath
      request.coverUrlOrPath = await this.storage.upload(request.file);
    }

    return next.handle();
  }
}
