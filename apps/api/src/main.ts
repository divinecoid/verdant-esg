import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { assertEnv } from './common/env';
import { requestGuard } from './common/request-guard';

async function bootstrap() {
  assertEnv(process.env);
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(requestGuard);
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) ?? true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  // Behind a reverse proxy, set TRUST_PROXY=1 so rate limiting sees the client address, not the proxy's.
  if (process.env.TRUST_PROXY) app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
