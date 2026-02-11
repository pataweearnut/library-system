import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import multer from 'multer';
import { memoryStorage } from 'multer';
import { Observable } from 'rxjs';
import { StorageService } from '../../infrastructure/storage/storage.service';

type RequestWithCover = Request & {
  file?: Express.Multer.File;
  coverUrlOrPath?: string | null;
};

@Injectable()
export class SingleFileUploadInterceptor implements NestInterceptor {
  private readonly upload = multer({
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single('cover'); // expects field name "cover"

  constructor(private readonly storage: StorageService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<RequestWithCover>();
    const response = context.switchToHttp().getResponse<Response>();

    await new Promise<void>((resolve, reject) => {
      this.upload(request, response, (err: unknown) => {
        if (err) {
          const message =
            err instanceof Error
              ? err.message
              : typeof err === 'string'
                ? err
                : 'Unknown error';
          reject(new Error(message));
        } else {
          resolve();
        }
      });
    });

    if (request.file) {
      request.coverUrlOrPath = await this.storage.upload(request.file);
    }

    return next.handle();
  }
}
