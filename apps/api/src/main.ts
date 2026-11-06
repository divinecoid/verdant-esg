import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { assertEnv } from './common/env';
import { requestGuard } from './common/request-guard';

async function bootstrap() {
  assertEnv(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(requestGuard);
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) ?? true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  // Behind a reverse proxy, set TRUST_PROXY=1 so rate limiting sees the client address, not the proxy's.
  if (process.env.TRUST_PROXY) app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  serveWebApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
/**
 * In a single-container deployment the built web app (WEB_DIST) is served from the same origin as the API, so
 * no CORS setup or second web server is needed. Hashed assets are cached for a year; index.html never is, so a
 * new release is picked up on the next load. Any other GET that is not an API call returns the app (client-side routes).
 */
function serveWebApp(app: NestExpressApplication) {
  const dist = process.env.WEB_DIST ? resolve(process.env.WEB_DIST) : null;
  if (!dist || !existsSync(join(dist, 'index.html'))) return;
  app.useStaticAssets(dist, {
    index: false,
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  });
  app.use((req: any, res: any, next: () => void) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(join(dist, 'index.html'));
  });
}

bootstrap().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
