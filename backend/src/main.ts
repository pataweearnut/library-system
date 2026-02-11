import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { GlobalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const host = config.get<string>('LIBRARY_SERVICE_CONNECTION') ?? '0.0.0.0';
  const port = config.get<number>('LIBRARY_SERVICE_PORT') ?? 3000;

  app.useGlobalPipes(GlobalValidationPipe);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  await app.listen(port, host);
}
bootstrap();
