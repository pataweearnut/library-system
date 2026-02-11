import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

interface IError {
  message: string;
  code_error: string | null;
}

const INTERNAL_SERVER_ERROR_CODE = 500;

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : INTERNAL_SERVER_ERROR_CODE;
    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as IError)
        : {
            message: exception instanceof Error ? exception.message : 'Error',
            code_error: null,
          };

    const isServerError = status >= INTERNAL_SERVER_ERROR_CODE;
    const responseData = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(isServerError
        ? { message: 'Internal server error', code_error: null }
        : message),
    };

    this.logMessage(request, message, status, exception);
    response.status(status).send(responseData);
  }

  private logMessage(
    request: Request,
    message: IError,
    status: number,
    exception: unknown,
  ) {
    const stack = exception instanceof Error ? exception.stack : undefined;
    if (status >= INTERNAL_SERVER_ERROR_CODE) {
      this.logger.error(
        `End Request for ${request.url}`,
        `method=${request.method} status=${status} code_error=${
          message.code_error ?? null
        } message=${message.message ?? null}`,
        stack ?? '',
      );
    } else {
      this.logger.warn(
        `End Request for ${request.url}`,
        `method=${request.method} status=${status} code_error=${
          message.code_error ?? null
        } message=${message.message ?? null}`,
      );
    }
  }
}
