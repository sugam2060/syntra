import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import appConfig from '../config/app.config';
import authConfig from '../config/auth.config';
import { EmailModule } from '../jobs/email/email.module';
import { AuthCookieService } from './auth-cookie.service';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationRepository } from './authentication.repository';
import { AuthenticationService } from './authentication.service';
import { OAuthRedirectFilter } from './filters/oauth-redirect.filter';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { PasswordService } from './password.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    ConfigModule.forFeature(appConfig),
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(authConfig)],
      inject: [authConfig.KEY],
      useFactory: (config: ConfigType<typeof authConfig>) => ({
        secret: config.jwt.accessSecret,
        signOptions: {
          algorithm: 'HS256' as const,
          expiresIn: config.jwt.accessTtl as StringValue,
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
        },
        verifyOptions: {
          algorithms: ['HS256' as const],
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
        },
      }),
    }),
    EmailModule,
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    AuthenticationRepository,
    PasswordService,
    TokenService,
    AuthCookieService,
    JwtStrategy,
    GoogleStrategy,
    GoogleAuthGuard,
    OAuthRedirectFilter,
  ],
})
export class AuthenticationModule {}
