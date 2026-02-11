import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionFilter } from './common/filters/exception.filter';
import { LoggingInterceptor } from './common/interceptors/logger.interceptor';
import { LoggerService } from './common/logger/logger.service';
import { GlobalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const host = config.get<string>('LIBRARY_SERVICE_CONNECTION') ?? '0.0.0.0';
  const port = config.get<number>('LIBRARY_SERVICE_PORT') ?? 3000;
  const corsOrigin =
    config.get<string>('LIBRARY_SERVICE_CORS_ORIGIN') ??
    'http://localhost:5173';

  app.useGlobalFilters(new AllExceptionFilter(new LoggerService()));
  app.useGlobalInterceptors(new LoggingInterceptor(new LoggerService()));
  app.useGlobalPipes(GlobalValidationPipe);
  app.setGlobalPrefix('api');
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Library API')
    .setDescription('Book library management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(port, host);
}

void bootstrap();
