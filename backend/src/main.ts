import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Habilitamos CORS
  app.enableCors();

  // Servimos activos estáticos locales (/media/...) tanto en dev (nest start) como en prod (node dist/main.js)
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidatePublicDirs = [
    join(process.cwd(), 'public'),
    join(process.cwd(), 'backend', 'public'),
    resolve(currentDir, '..', 'public'),
    resolve(currentDir, '..', '..', 'public'),
  ];
  const publicDir =
    candidatePublicDirs.find((dir) => existsSync(dir)) ??
    join(process.cwd(), 'public');
  app.useStaticAssets(publicDir);

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Servidor ejecutándose en: http://localhost:${port}`);
}
bootstrap();
