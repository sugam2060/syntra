import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import appConfig from './config/app.config';

/** Shared by `main.ts` and the e2e tests so both exercise the same HTTP pipeline. */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  // Behind a load balancer, trust its X-Forwarded-For so rate limits and stored session IPs use
  // the real client address (never enable this when the app is directly reachable).
  app.getHttpAdapter().getInstance().set('trust proxy', config.trustProxy);

  app.setGlobalPrefix(config.apiPrefix);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.frontendUrl, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
